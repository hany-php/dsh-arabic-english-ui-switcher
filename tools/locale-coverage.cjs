#!/usr/bin/env node
/**
 * Coverage report for the Arabic client table.
 *
 * Compares the English values harvested from the shipped bundles
 * (`tools/locale-en-corpus.json`) against the `AR` table in
 * `packages/dsh-arabic-locale/client.js`, using the same lookup rules as the
 * runtime (exact match, then trimmed match with the trailing whitespace
 * re-appended). Reports both the whole corpus and the bundles the current
 * desktop profile actually mounts.
 *
 * Usage:
 *   node tools/locale-coverage.cjs [--json <out-file>] [--verbose] [--all]
 *
 *   --all       report every shipped bundle (default: mounted bundles only)
 *   --json F    write the gap list and per-bundle stats to F
 *   --verbose   print every missing English value
 */
const fs = require('fs');
const path = require('path');
const { readArKeys, isTranslated, ROOT } = require('./ar-keys.cjs');
const { makeLoadedPredicate } = require('./loaded-bundles.cjs');

const CORPUS = path.join(ROOT, 'tools/locale-en-corpus.json');
const DICTS = path.join(ROOT, 'tools/locale-dicts-all.json');

function main() {
  const args = process.argv.slice(2);
  const jsonIdx = args.indexOf('--json');
  const jsonOut = jsonIdx !== -1 ? args[jsonIdx + 1] : null;
  const verbose = args.includes('--verbose');
  const includeAll = args.includes('--all');

  const arKeys = readArKeys();
  const corpus = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));
  const dicts = JSON.parse(fs.readFileSync(DICTS, 'utf8'));
  const isLoaded = makeLoadedPredicate();

  const missingAll = corpus.filter((value) => !isTranslated(value, arKeys));

  const rows = [];
  const loadedValues = new Set();
  for (const [bundle, dict] of Object.entries(dicts)) {
    const values = [...new Set(Object.values(dict))].filter(
      (v) => typeof v === 'string' && v.trim() && /[A-Za-z]/.test(v),
    );
    if (!values.length) continue;
    const mounted = isLoaded(bundle);
    const missing = values.filter((value) => !isTranslated(value, arKeys));
    if (mounted) for (const value of values) loadedValues.add(value);
    rows.push({ bundle, mounted, total: values.length, done: values.length - missing.length, missing });
  }

  // The loaded-only unique totals depend on union across bundles.
  const loadedMissingValues = [...loadedValues].filter((value) => !isTranslated(value, arKeys));
  const missing = includeAll ? missingAll : loadedMissingValues;

  const scopeLabel = includeAll ? 'all shipped bundles' : 'mounted bundles only';
  console.log(`Scope:                     ${scopeLabel}`);
  console.log(`English strings:           ${includeAll ? corpus.length : loadedValues.size}`);
  console.log(`Translated (AR keys):      ${includeAll ? corpus.length - missingAll.length : loadedValues.size - loadedMissingValues.length}`);
  console.log(`Missing:                   ${missing.length}`);
  console.log(`AR table size:             ${arKeys.size} keys`);

  const visibleRows = rows.filter((row) => includeAll || row.mounted);
  visibleRows.sort((a, b) => a.done / a.total - b.done / b.total || b.total - a.total);
  for (const row of visibleRows) {
    const pct = ((row.done / row.total) * 100).toFixed(0).padStart(3);
    console.log(`  ${pct}%  ${String(row.done).padStart(4)}/${String(row.total).padEnd(4)}  ${row.bundle}`);
    if (row.done < row.total) {
      const tag = row.mounted ? '' : '  [not mounted]';
      console.log(`         ${row.missing.length} missing${tag}`);
    }
  }

  if (verbose) for (const value of missing) console.log(`MISSING: ${JSON.stringify(value)}`);
  if (jsonOut) {
    fs.writeFileSync(
      jsonOut,
      JSON.stringify(
        {
          scope: includeAll ? 'all' : 'mounted',
          arKeys: arKeys.size,
          english: includeAll ? corpus.length : loadedValues.size,
          missing,
          bundles: visibleRows,
        },
        null,
        1,
      ) + '\n',
    );
    console.log(`wrote ${path.relative(process.cwd(), jsonOut)}`);
  }
}

main();
