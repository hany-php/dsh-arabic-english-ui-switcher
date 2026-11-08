#!/usr/bin/env node
/**
 * Read the English keys of the Arabic tables in
 * `packages/dsh-arabic-locale/client.js`.
 *
 * The client keeps two literals: the hand-curated `AR_CORE` and the generated
 * `AR_PHASE3` coverage expansion, merged at runtime into `AR`. Coverage tooling
 * must see both. Shared by `locale-coverage.cjs` and `locale-batch.cjs` so they
 * apply the exact runtime lookup rule: an exact key match, or a key for the
 * trimmed value when the shipped string only differs by trailing padding (the
 * client re-appends the padding).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'packages/dsh-arabic-locale/client.js');

const ENTRY_RE =
  /(?:^|[,\s{])(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([A-Za-z_$][\w$]*))\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;

function unescapeJs(raw) {
  return raw.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, esc) => {
    if (esc[0] === 'u') return String.fromCharCode(parseInt(esc.slice(1), 16));
    if (esc[0] === 'x') return String.fromCharCode(parseInt(esc.slice(1), 16));
    if (esc === 'n') return '\n';
    if (esc === 't') return '\t';
    return esc;
  });
}

/** Extract the balanced `{ ... }` body that starts at/after `marker`. */
function extractBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const open = source.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === '\\') i += 2;
        else if (source[i] === quote) break;
        else i += 1;
      }
    } else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

function parseKeys(block) {
  const keys = new Set();
  if (!block) return keys;
  ENTRY_RE.lastIndex = 0;
  let match;
  while ((match = ENTRY_RE.exec(block)) !== null) keys.add(unescapeJs(match[1] ?? match[2] ?? match[3]));
  return keys;
}

/** All English keys from AR_CORE (fallback: AR) and AR_PHASE3. */
function readArKeys(clientFile = CLIENT) {
  const core = readArCoreKeys(clientFile);
  const source = fs.readFileSync(clientFile, 'utf8');
  const phase3 = parseKeys(extractBlock(source, 'const AR_PHASE3 = {'));
  if (core.size === 0 && phase3.size === 0) throw new Error('no AR table found in client.js');
  return new Set([...core, ...phase3]);
}

/** The hand-curated AR_CORE keys only (used when regenerating AR_PHASE3). */
function readArCoreKeys(clientFile = CLIENT) {
  const source = fs.readFileSync(clientFile, 'utf8');
  const core = extractBlock(source, 'const AR_CORE = {') || extractBlock(source, 'const AR = {');
  return parseKeys(core);
}

/** Runtime-equivalent coverage test for one English value. */
function isTranslated(value, arKeys) {
  if (arKeys.has(value)) return true;
  const padded = /^(.*?)(\s+)$/s.exec(value);
  return !!(padded && arKeys.has(padded[1]));
}

module.exports = { readArKeys, readArCoreKeys, isTranslated, ROOT, CLIENT };

if (require.main === module) {
  const keys = readArKeys();
  console.log(`AR keys: ${keys.size}`);
}
