#!/usr/bin/env node
/**
 * Harvest the English UI corpus from the installed DSH client bundles.
 *
 * Native tools cannot read inside `app.asar`, and the strings are not a flat
 * locale folder: every client package embeds its dictionaries in
 * `lib/client.js` as `const en = { ... }` object literals (with `zh`/`ja`/...
 * siblings). This script walks those bundles with `tools/asar-util.cjs`,
 * extracts each English dictionary literal, and writes:
 *
 *   tools/locale-en-corpus.json   unique English values, sorted
 *   tools/locale-dicts-all.json   source bundle -> { key: English } dictionary
 *
 * The Arabic client table keys off the *English value* (see AGENTS.md §5), so
 * the unique-value list is what matters for coverage work.
 *
 * Usage:
 *   node tools/extract-locale-corpus.cjs [--quiet]
 *
 * The archive path can be overridden with DSH_ASAR or passed as `--asar <path>`.
 */
const fs = require('fs');
const path = require('path');
const { ASAR, listFiles, fileData, readHeader } = require('./asar-util.cjs');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const asarArg = args.indexOf('--asar');
const asarPath = asarArg !== -1 ? args[asarArg + 1] : ASAR;

const OUT_DIR = __dirname;

/** Match a `{` or `[` starting at `openIdx`, skipping strings/comments, and return the closing index. */
function findBlockEnd(text, openIdx) {
  const open = text[openIdx];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let i = openIdx;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i += 1;
      while (i < text.length) {
        if (text[i] === '\\') i += 2;
        else if (text[i] === quote) break;
        else i += 1;
      }
    } else if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
    } else if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
    } else if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
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

const ENTRY_RE =
  /(?:^|[,\s{])(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([A-Za-z_$][\w$]*))\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;

/** Parse `key: "value"` pairs from one JS object-literal body. */
function parseDictionary(block) {
  const dict = Object.create(null);
  let match;
  ENTRY_RE.lastIndex = 0;
  while ((match = ENTRY_RE.exec(block)) !== null) {
    const key = unescapeJs(match[1] ?? match[2] ?? match[3]);
    const raw = match[4] ?? match[5];
    if (raw === undefined) continue;
    dict[key] = unescapeJs(raw);
  }
  return dict;
}

/** Find all English dictionary literals in one bundle source. */
function extractEnglishDictionaries(source) {
  const found = [];
  const patterns = [
    /\/\*\*\s*English copy[^*]*\*\/\s*(?:const|let|var)\s+en\s*=\s*\{/g,
    /(?:const|let|var)\s+en\s*=\s*\{/g,
    /\ben\s*:\s*\{/g,
  ];
  const seenAt = new Set();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const braceIdx = source.indexOf('{', match.index);
      if (braceIdx === -1 || seenAt.has(braceIdx)) continue;
      seenAt.add(braceIdx);
      const end = findBlockEnd(source, braceIdx);
      if (end === -1) continue;
      const block = source.slice(braceIdx, end + 1);
      const dict = parseDictionary(block);
      if (Object.keys(dict).length > 0) found.push(dict);
    }
  }
  return found;
}

function main() {
  const fd = fs.openSync(asarPath, 'r');
  const { json } = readHeader(fd);
  const candidates = listFiles(json).filter(
    (f) => /\/lib\/client\.js$/.test(f.path) || /\/lib\/client\/index\.js$/.test(f.path),
  );

  const bundles = {};
  const byValue = new Map(); // English value -> Set(source package path)
  let dictionaries = 0;

  for (const file of candidates) {
    let source;
    try {
      source = fileData(fd, json, file.path).toString('utf8');
    } catch {
      continue;
    }
    if (!/\ben\s*[:=]\s*\{/.test(source)) continue;
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
