#!/usr/bin/env node
/**
 * Build per-area translation batches for the Phase 3 coverage push.
 *
 * Reads the cleaned English corpus (`locale-en-corpus.json`), keeps the values
 * that are (a) mounted in the current desktop profile and (b) still missing
 * from the `AR` table, then splits them across balanced area groups and writes:
 *
 *   .work/part-<n>.json         batch manifest: entries with English value, keys, bundles
 *   .work/part-<n>.dicts.json   the English dictionaries the area owns (for context)
 *   .work/manifest.json         summary of all batches
 *
 * Each English value is assigned to exactly one batch (duplicates that appear
 * in several bundles go to the currently smallest batch) so translators never
 * translate the same string twice.
 *
 * Usage:
 *   node tools/locale-batch.cjs [--out <dir>] [--groups <n>]
 */
const fs = require('fs');
const path = require('path');
const { readArKeys, isTranslated, ROOT } = require('./ar-keys.cjs');
const { makeLoadedPredicate } = require('./loaded-bundles.cjs');

const DICTS = path.join(ROOT, 'tools/locale-dicts-all.json');

/**
 * Exact English values that are identifiers or technical tokens, not UI copy.
 * They stay English by design (AGENTS.md §5: never translate identifiers,
 * commands, extensions, shortcuts, or brand names), so they are left out of
 * the batches and simply fall back to English at runtime.
 */
const KEEP_LATIN = new Set([
  // Tool names shown as card titles.
  'Read',
  'Write',
  'Bash',
  'Pwsh',
  'Grep',
  'Glob',
  'Fetch',
  'Code',
  // Trajectory role/kind tags and technical labels.
  'ASSISTANT',
  'USER',
  'SYSTEM',
  'TOOL',
  'SUBTOOL',
  'COMPACTED',
  'CONTEXT',
  'JSON',
  'HTTP',
  'ID',
  'IN',
  'OUT',
  'TTFT',
  // Units, language tag, path, package-name example, OS application name.
  'en',
  'px',
  's',
  'Finder',
  'userData/keybindings.json',
  'dsh-plugin-whale-pet',
  // Slash-command tokens.
  'goal',
  'plan',
  'feedback',
  'compact',
  'permission',
  'export',
  // OS applications surfaced by the "Open with" picker.
  'Android Studio',
  'Cursor',
  'Fork',
  'GNOME Terminal',
  'Ghostty',
  'Git Bash',
  'GitHub Desktop',
  'GitKraken',
  'GoLand',
  'IntelliJ IDEA',
  'Konsole',
  'PhpStorm',
  'PyCharm',
  'Rider',
  'RustRover',
  'SmartGit',
  'Sourcetree',
  'Sublime Merge',
  'Sublime Text',
  'Tower',
  'VS Code',
  'VS Code Insiders',
  'Warp',
  'WebStorm',
  'Windows Terminal',
  'Windsurf',
  'Xcode',
  'Zed',
  'iTerm2',
  'kitty',
  // Technical labels, format names, placeholder-only composition templates.
  'EXP',
  'UTC',
  'Markdown',
  'DeepSeek Harness',
  '{from}–{to}',
  '{hours}',
  '{weekdays}{months}',
  '{weekday}',
  '{rule} ({timeZone})',
]);

/** Areas, in output order. Bundle paths are matched by suffix. */
const AREAS = [
  {
    name: 'chat-and-conversation',
    bundles: [
      'dsh-client-ui-conversation',
      'dsh-client-ui-chat',
      'dsh-client-ui-message-feedback',
      'dsh-message-quotes',
      'dsh-client-ui-context-menu',
      'dsh-client-ui-file-drag',
      'dsh-client-ui-layout',
    ],
  },
  {
    name: 'plugins-and-commands',
    bundles: [
      'dsh-client-ui-plugin-manager',
      'dsh-client-ui-agent-preset',
      'dsh-client-ui-commands',
      'dsh-client-ui-model-selection',
      'dsh-client-ui-approval',
      'dsh-client-ui-input-trigger',
      'dsh-client-ui-entry-customization',
      'dsh-client-ui-cordis',
    ],
  },
  {
    name: 'trajectory-agent-and-plan',
    bundles: [
      'dsh-client-ui-trajectory',
      'dsh-experimental-client-ui-agent-team',
      'dsh-client-ui-subagent',
      'dsh-client-ui-skill',
      'dsh-client-ui-plan',
      'dsh-client-ui-goal',
      'dsh-client-ui-user-questions',
    ],
  },
  {
    name: 'schedule-workspace-and-jobs',
    bundles: [
      'dsh-client-ui-schedule',
      'dsh-client-ui-workspace',
      'dsh-client-ui-jobs',
      'dsh-client-ui-deliverables',
      'dsh-client-ui-workflow-run',
      'dsh-session-log-export',
    ],
  },
  {
    name: 'settings-and-shortcuts',
    bundles: [
      'dsh-client-ui-settings-models',
      'dsh-client-ui-settings-account',
      'dsh-client-ui-settings-subagent',
      'dsh-client-ui-settings-plugin-inventory',
      'dsh-client-ui-settings-general',
      'dsh-client-ui-settings-web-search',
      'dsh-client-ui-settings-agent-loop',
      'dsh-client-ui-settings-shell',
      'dsh-client-ui-settings-plugins',
      'dsh-client-ui-settings-session-log',
      'dsh-client-ui-shortcuts',
      'dsh-client-ui-theme',
      'dsh-client-locale',
      'dsh-client-ui-permission-presets',
      'dsh-client-ui-secret-mask',
    ],
  },
  {
    name: 'sidebar-and-tools',
    bundles: [
      'dsh-client-ui-sidebar-right',
      'dsh-client-ui-sidebar-terminal',
      'dsh-client-ui-sidebar-browser',
      'dsh-client-ui-sidebar-files',
      'dsh-client-ui-sidebar-documentpreview',
      'dsh-client-ui-sidebar',
      'dsh-client-ui-open-in-app',
      'dsh-client-ui-reference',
      'dsh-client-ui-file-actions',
    ],
  },
];

function bundleMatches(bundle, key) {
  return bundle.endsWith('/' + key) || bundle.endsWith(key);
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outDir = outIdx !== -1 ? path.resolve(args[outIdx + 1]) : path.join(ROOT, '.work');

  const arKeys = readArKeys();
  const dicts = JSON.parse(fs.readFileSync(DICTS, 'utf8'));
  const isLoaded = makeLoadedPredicate();

  // package -> dictionaries, for mounted bundles only.
  const mounted = [];
  for (const [bundle, dict] of Object.entries(dicts)) {
    if (!isLoaded(bundle)) continue;
    mounted.push({ bundle, dict });
  }

  // value -> { keys:Set, bundles:Set, areas:Set }
  const info = new Map();
  for (const { bundle, dict } of mounted) {
    const area = AREAS.findIndex((candidate) => candidate.bundles.some((name) => bundleMatches(bundle, name)));
    if (area === -1) {
      console.warn(`warning: bundle has no area, still included: ${bundle}`);
    }
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== 'string' || !value.trim() || !/[A-Za-z]/.test(value)) continue;
      if (isTranslated(value, arKeys)) continue;
      if (KEEP_LATIN.has(value)) continue;
      if (!info.has(value)) info.set(value, { keys: new Set(), bundles: new Set(), areas: new Set() });
      const entry = info.get(value);
      entry.keys.add(key);
      entry.bundles.add(bundle);
      if (area !== -1) entry.areas.add(area);
    }
  }

  // Assign every value to exactly one area: a priority area if it has one,
  // otherwise the area of its first bundle; balance by choosing the smallest
  // eligible area.
  const batches = AREAS.map((area) => ({ ...area, values: [] }));
  const fallbackArea = AREAS.findIndex((area) => area.name === 'sidebar-and-tools');
  const values = [...info.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const value of values) {
    const entry = info.get(value);
    const eligible = entry.areas.size ? [...entry.areas] : [fallbackArea];
    eligible.sort((a, b) => batches[a].values.length - batches[b].values.length || a - b);
    batches[eligible[0]].values.push(value);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    corpusValues: values.length,
    keptLatin: [...KEEP_LATIN].filter((value) => !isTranslated(value, arKeys)),
    parts: [],
  };
  batches.forEach((batch, index) => {
    const part = index + 1;
    batch.values.sort();
    const entries = batch.values.map((value) => {
      const entry = info.get(value);
      return {
        en: value,
        keys: [...entry.keys].sort(),
        bundles: [...entry.bundles].map((bundle) => bundle.replace('dsh/node_modules/@deepseek-ai/', '')),
      };
    });
    const partPath = path.join(outDir, `part-${part}.json`);
    fs.writeFileSync(
      partPath,
      JSON.stringify({ part, name: batch.name, count: entries.length, entries }, null, 1) + '\n',
    );

    const owned = mounted.filter(({ bundle }) => batch.bundles.some((name) => bundleMatches(bundle, name)));
    const ownedDicts = {};
    for (const { bundle, dict } of owned) ownedDicts[bundle.replace('dsh/node_modules/@deepseek-ai/', '')] = dict;
    if (Object.keys(ownedDicts).length) {
      fs.writeFileSync(
        path.join(outDir, `part-${part}.dicts.json`),
        JSON.stringify(ownedDicts, null, 1) + '\n',
      );
    }

    manifest.parts.push({ part, name: batch.name, count: entries.length });
    console.log(`part ${part}  ${String(entries.length).padStart(3)} strings  ${batch.name}`);
  });
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log(`\ntotal: ${values.length} untranslated strings across ${batches.length} parts`);
  console.log(`wrote ${path.relative(process.cwd(), outDir)}`);
}

main();
