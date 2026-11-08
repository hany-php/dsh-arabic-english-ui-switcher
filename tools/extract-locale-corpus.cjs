#!/usr/bin/env node
/**
 * Harvest the English UI corpus from the installed DSH client bundles.
 *
 * Native tools cannot read inside `app.asar`, and the strings are not a flat
 * locale folder: every client package embeds its dictionaries in
 * `lib/client.js` as object literals. Two shapes exist and both are handled:
 *
 *   const en = { ... }            (also `en$1`, `guideEn`, `accessEn`, …)
 *   locale.register(ns, { en: { ... }, zh: { ... } })
 *
 * Some dictionaries are assembled like `const en = { ...guideEn, ... }`; the
 * referenced literal is resolved and merged. Values may be plain strings or
 * arrays joined at runtime (`["### How it works", "…"].join("\n\n")`), which
 * are flattened to the joined string the UI actually displays.
 *
 * Outputs:
 *   tools/locale-en-corpus.json   unique English values, sorted
 *   tools/locale-dicts-all.json   source bundle -> { key: English }
 *
 * Usage:
 *   node tools/extract-locale-corpus.cjs [--quiet] [--asar <path>]
 */
const fs = require('fs');
const path = require('path');
const { ASAR, listFiles, fileData, readHeader } = require('./asar-util.cjs');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const asarArg = args.indexOf('--asar');
const asarPath = asarArg !== -1 ? args[asarArg + 1] : ASAR;
const OUT_DIR = __dirname;

// ---------------------------------------------------------------------------
// Small JS object-literal parser (data only: strings, arrays, spreads)
// ---------------------------------------------------------------------------

function skipTrivia(source, index) {
  for (;;) {
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source.startsWith('//', index)) {
      const newline = source.indexOf('\n', index);
      index = newline === -1 ? source.length : newline + 1;
    } else if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 2;
    } else {
      return index;
    }
  }
}

function unescapeJs(raw) {
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, esc) => {
    if (esc[0] === 'u') {
      const hex = esc[1] === '{' ? esc.slice(2, -1) : esc.slice(1);
      return String.fromCodePoint(parseInt(hex, 16));
    }
    if (esc[0] === 'x') return String.fromCharCode(parseInt(esc.slice(1), 16));
    switch (esc) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case '0': return '\0';
      case '\n': return '';
      default: return esc;
    }
  });
}

/** Read a quoted string starting at `index` (the quote). Returns { value, end }. */
function readString(source, index) {
  const quote = source[index];
  let i = index + 1;
  let raw = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      raw += source.slice(i, i + 2);
      i += 2;
    } else if (ch === quote) {
      return { value: unescapeJs(raw), end: i + 1 };
    } else {
      raw += ch;
      i += 1;
    }
  }
  return { value: unescapeJs(raw), end: i };
}

/** Skip a balanced `{...}` or `[...]` block, respecting strings and comments. */
function skipBalanced(source, index) {
  const open = source[index];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let i = index;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = readString(source, i).end;
      continue;
    }
    i = skipTrivia(source, i);
    if (i >= source.length) break;
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return i;
}

function readIdentifier(source, index) {
  const match = /^[A-Za-z_$][\w$]*/.exec(source.slice(index, index + 200));
  return match ? { name: match[0], end: index + match[0].length } : null;
}

/**
 * Parse the value at `index`. Returns { value, end } where value is a string for
 * strings and joined arrays, or null for unsupported expressions.
 */
function readValue(source, index, spreadResolver) {
  let i = skipTrivia(source, index);
  const ch = source[i];
  if (ch === '"' || ch === "'") {
    const { value, end } = readString(source, i);
    return { value, end };
  }
  if (ch === '`') {
    const { value, end } = readString(source, i);
    if (value.includes('${')) return { value: null, end };
    return { value, end };
  }
  if (ch === '[') {
    const items = [];
    let j = i + 1;
    for (;;) {
      j = skipTrivia(source, j);
      if (j >= source.length || source[j] === ']') break;
      const item = readValue(source, j, spreadResolver);
      if (item.value !== null && item.value !== undefined) items.push(item.value);
      j = skipTrivia(source, item.end);
      if (source[j] === ',') j += 1;
    }
    const afterArray = skipTrivia(source, j + 1);
    // The UI only sees the joined string; reproduce it.
    if (source.startsWith('.join(', afterArray)) {
      const open = afterArray + '.join('.length;
      const sep = readValue(source, open, spreadResolver);
      const close = sep.end;
      if (source[close] === ')') {
        const joined = items.join(sep.value ?? '');
        return { value: joined, end: close + 1 };
      }
    }
    return { value: null, end: afterArray };
  }
  if (ch === '{') {
    const end = skipBalanced(source, i);
    // Nested objects are descriptors/definitions, not locale copy.
    return { value: null, end, nested: true };
  }
  if (source.startsWith('...', i)) {
    const id = readIdentifier(source, skipTrivia(source, i + 3));
    if (id && spreadResolver) spreadResolver(id.name);
    return { value: null, end: id ? id.end : i + 3 };
  }
  // Unsupported expression (identifier, number, call): skip to the next top-level comma.
  let j = i;
  let depth = 0;
  while (j < source.length) {
    const c = source[j];
    if (c === '"' || c === "'" || c === '`') {
      j = readString(source, j).end;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break;
      depth -= 1;
    } else if (c === ',' && depth === 0) break;
    j += 1;
  }
  return { value: null, end: j };
}

/**
 * Parse the object literal starting at `openIndex` and return a plain dictionary.
 * Spreads of other literals are resolved through `spreadResolver`.
 */
function readObject(source, openIndex, spreadResolver) {
  const dict = Object.create(null);
  let i = openIndex + 1;
  for (;;) {
    i = skipTrivia(source, i);
    if (i >= source.length) break;
    if (source[i] === '}') break;
    if (source.startsWith('...', i)) {
      const id = readIdentifier(source, skipTrivia(source, i + 3));
      if (id && spreadResolver) Object.assign(dict, spreadResolver(id.name) || {});
      i = id ? id.end : i + 3;
      i = skipTrivia(source, i);
      if (source[i] === ',') i += 1;
      continue;
    }
    let key = null;
    if (source[i] === '"' || source[i] === "'") {
      const read = readString(source, i);
      key = read.value;
      i = read.end;
    } else {
      const id = readIdentifier(source, i);
      if (!id) break;
      key = id.name;
      i = id.end;
    }
    i = skipTrivia(source, i);
    if (source[i] !== ':') break;
    i = skipTrivia(source, i + 1);
    const value = readValue(source, i, spreadResolver);
    if (typeof value.value === 'string') dict[key] = value.value;
    i = skipTrivia(source, value.end);
    if (source[i] === ',') i += 1;
  }
  return dict;
}

// ---------------------------------------------------------------------------
// Dictionary discovery
// ---------------------------------------------------------------------------

/** `en`, `en$1`, `guideEn`, `accessEn`, … but not CSS-module objects. */
function isEnglishDictionaryName(name) {
  return /^(?:en|en\$\d+|[A-Za-z_$][\w$]*En)$/.test(name);
}

function extractEnglishDictionaries(source) {
  const byOpenIndex = new Map(); // open brace index -> dictionary
  const literalCache = new Map(); // identifier -> dictionary

  const resolveLiteral = (name) => {
    if (literalCache.has(name)) return literalCache.get(name);
    const pattern = new RegExp(`(?:const|let|var)\\s+${name.replace(/\$/g, '\\$')}\\s*=\\s*\\{`);
    const match = pattern.exec(source);
    literalCache.set(name, {}); // break cycles
    if (!match) return literalCache.get(name);
    const open = source.indexOf('{', match.index);
    const dict = readObject(source, open, resolveLiteral);
    literalCache.set(name, dict);
    return dict;
  };

  // Named literals: const en = {...}, const guideEn = {...}, const en$1 = {...}
  const named = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
  let match;
  while ((match = named.exec(source)) !== null) {
    if (!isEnglishDictionaryName(match[1])) continue;
    const open = source.indexOf('{', match.index);
    if (byOpenIndex.has(open)) continue;
    byOpenIndex.set(open, readObject(source, open, resolveLiteral));
  }

  // Inline registrations: { en: {...}, zh: {...} } and { en: enDictionary }
  const inline = /\ben\s*:\s*\{/g;
  while ((match = inline.exec(source)) !== null) {
    const open = source.indexOf('{', match.index);
    if (byOpenIndex.has(open)) continue;
    byOpenIndex.set(open, readObject(source, open, resolveLiteral));
  }

  return [...byOpenIndex.values()].filter((dict) => Object.keys(dict).length > 0);
}

function main() {
  const fd = fs.openSync(asarPath, 'r');
  const { json } = readHeader(fd);
  const candidates = listFiles(json).filter(
    (f) => /\/lib\/client\.js$/.test(f.path) || /\/lib\/client\/index\.js$/.test(f.path),
  );

  const bundles = {};
  const byValue = new Map();
  let dictionaries = 0;

  for (const file of candidates) {
    let source;
    try {
      source = fileData(fd, json, file.path).toString('utf8');
    } catch {
      continue;
    }
    if (!/\ben\s*[:=]\s*\{/.test(source) && !/[A-Za-z_$][\w$]*En\s*=\s*\{/.test(source)) continue;
    const packagePath = file.path.replace(/\/lib\/client(\.js|\/index\.js)$/, '');
    for (const dict of extractEnglishDictionaries(source)) {
      dictionaries += 1;
      bundles[packagePath] = Object.assign(bundles[packagePath] || {}, dict);
      for (const value of Object.values(dict)) {
        if (typeof value !== 'string' || !value.trim()) continue;
        if (!/[A-Za-z]/.test(value)) continue;
        if (!byValue.has(value)) byValue.set(value, new Set());
        byValue.get(value).add(packagePath);
      }
    }
  }

  const corpus = [...byValue.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const corpusPath = path.join(OUT_DIR, 'locale-en-corpus.json');
  const dictsPath = path.join(OUT_DIR, 'locale-dicts-all.json');
  fs.writeFileSync(corpusPath, JSON.stringify(corpus, null, 1) + '\n');
  fs.writeFileSync(dictsPath, JSON.stringify(bundles, null, 1) + '\n');

  if (!quiet) {
    console.log(`asar:            ${asarPath}`);
    console.log(`client bundles:  ${candidates.length} scanned, ${Object.keys(bundles).length} with English dictionaries`);
    console.log(`dictionaries:    ${dictionaries}`);
    console.log(`unique strings:  ${corpus.length}`);
    console.log(`wrote:           ${path.relative(process.cwd(), corpusPath)}`);
    console.log(`wrote:           ${path.relative(process.cwd(), dictsPath)}`);
  }
}

main();
