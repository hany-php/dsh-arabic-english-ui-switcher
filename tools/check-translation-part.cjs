#!/usr/bin/env node
/**
 * Validate one translation batch produced by a translator agent.
 *
 * Usage:
 *   node tools/check-translation-part.cjs .work/part-1.json .work/out-1.json
 *
 * Checks (errors block the merge, warnings are reported):
 *   - output is valid UTF-8 JSON with a flat string -> string object
 *   - every English value in the batch has an entry (exact key, byte-for-byte)
 *   - no extra keys, no empty values
 *   - named placeholders `{...}` keep the same multiset
 *   - no BOM, zero-width characters, or control characters
 *   - leading/trailing whitespace preserved when the source has it
 * Warnings:
 *   - a value still identical to the English source
 *   - a value with no Arabic letters at all
 */
const fs = require('fs');

const ZERO_WIDTH = /[\u200B\u200C\u200D\u2060\uFEFF]/g;

function placeholders(text) {
  return [...String(text).matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort();
}

function sameList(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function hasArabic(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function checkPart(partPath, outPath) {
  const part = JSON.parse(fs.readFileSync(partPath, 'utf8'));
  const errors = [];
  const warnings = [];

  let out;
  try {
    const raw = fs.readFileSync(outPath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) errors.push('output file starts with a BOM');
    out = JSON.parse(raw);
  } catch (error) {
    return { errors: [`cannot parse output JSON: ${error.message}`], warnings, total: part.entries.length, checked: 0 };
  }
  if (typeof out !== 'object' || out === null || Array.isArray(out)) {
    return { errors: ['output must be a flat JSON object (English -> Arabic)'], warnings, total: part.entries.length, checked: 0 };
  }

  const expected = new Map(part.entries.map((entry) => [entry.en, entry]));
  let checked = 0;
  for (const [en, entry] of expected) {
    const ar = out[en];
    if (typeof ar !== 'string') {
      errors.push(`missing entry: ${JSON.stringify(en)}`);
      continue;
    }
    checked += 1;
    if (!ar.trim()) {
      errors.push(`empty translation: ${JSON.stringify(en)}`);
      continue;
    }
    if (ZERO_WIDTH.test(ar)) errors.push(`zero-width character in: ${JSON.stringify(en)}`);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(ar)) errors.push(`control character in: ${JSON.stringify(en)}`);
    if (!sameList(placeholders(en), placeholders(ar))) {
      errors.push(
        `placeholder mismatch: ${JSON.stringify(en)} -> ${JSON.stringify(ar)} (${placeholders(en).join(', ') || 'none'} vs ${placeholders(ar).join(', ') || 'none'})`,
      );
    }
    const lead = /^\s*/.exec(en)[0];
    const trail = /\s*$/.exec(en)[0];
    if (lead && !ar.startsWith(lead)) errors.push(`leading whitespace changed: ${JSON.stringify(en)}`);
    if (trail && !ar.endsWith(trail)) errors.push(`trailing whitespace changed: ${JSON.stringify(en)}`);
    if (ar === en) warnings.push(`untranslated (identical): ${JSON.stringify(en)}`);
    else if (!hasArabic(ar) && /[A-Za-z]{2}/.test(ar)) warnings.push(`no Arabic letters: ${JSON.stringify(en)} -> ${JSON.stringify(ar)}`);
  }

  const extras = Object.keys(out).filter((key) => !expected.has(key));
  if (extras.length) warnings.push(`extra keys not in batch (${extras.length}): ${extras.slice(0, 5).map((k) => JSON.stringify(k)).join(', ')}`);

  return { errors, warnings, total: part.entries.length, checked };
}

function main() {
  const [partPath, outPath] = process.argv.slice(2);
  if (!partPath || !outPath) {
    console.error('usage: node tools/check-translation-part.cjs <part.json> <out.json>');
    process.exit(2);
  }
  const result = checkPart(partPath, outPath);
  console.log(`checked ${result.checked}/${result.total} entries`);
  for (const warning of result.warnings) console.log(`WARN  ${warning}`);
  for (const error of result.errors) console.log(`ERROR ${error}`);
  if (result.errors.length) {
    console.log(`\nFAIL: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
    process.exit(1);
  }
  console.log(`PASS: ${result.warnings.length} warning(s)`);
}

if (require.main === module) main();
module.exports = { checkPart, placeholders, hasArabic };
