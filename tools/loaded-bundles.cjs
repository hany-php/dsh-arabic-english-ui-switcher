#!/usr/bin/env node
/**
 * Which client bundles does the current desktop profile actually mount?
 *
 * The locale corpus contains every shipped client package, but only the client
 * halves named by the enabled bundle patches ever render. This helper reads the
 * enabled bundle patches straight from `app.asar` (base layers only; a profile
 * may still override a row by id, which does not remove the package from the
 * roster) and answers membership questions for a corpus bundle path.
 *
 * Used by `locale-coverage.cjs` and `locale-batch.cjs`; the profile roster can
 * be re-derived after a DSH upgrade by re-running the tools.
 */
const fs = require('fs');
const { ASAR, listFiles, fileData, readHeader } = require('./asar-util.cjs');

/** Bundles enabled in the `desktop` profile, in patch-application order. */
const ENABLED_BUNDLES = [
  'dsh-base',
  'dsh-web-app',
  'dsh-experimental-agent-team-profile',
  'dsh-experimental-badge-skill-bundle',
];

const NAME_RE = /name:\s*['"]?([@\w][\w@/.-]+)['"]?/g;

function detectLoadedModuleNames(asarPath = ASAR) {
  const fd = fs.openSync(asarPath, 'r');
  const { json } = readHeader(fd);
  const names = new Set();
  for (const bundle of ENABLED_BUNDLES) {
    for (const ext of ['cordis.patch.yml', 'cordis.patch.yaml']) {
      const patchPath = `dsh/node_modules/@deepseek-ai/${bundle}/${ext}`;
      let text;
      try {
        text = fileData(fd, json, patchPath).toString('utf8');
      } catch {
        continue;
      }
      NAME_RE.lastIndex = 0;
      let match;
      while ((match = NAME_RE.exec(text)) !== null) names.add(match[1]);
    }
  }
  return names;
}

/** Bundle path from the corpus JSON -> package name, e.g. `.../dsh-client-ui-chat` -> `@deepseek-ai/dsh-client-ui-chat`. */
function bundlePackageName(bundlePath) {
  const marker = '/node_modules/';
  const rel = bundlePath.includes(marker) ? bundlePath.slice(bundlePath.indexOf(marker) + marker.length) : bundlePath;
  if (rel.startsWith('@')) return rel;
  return rel;
}

function makeLoadedPredicate(asarPath = ASAR) {
  const names = detectLoadedModuleNames(asarPath);
  return (bundlePath) => {
    const name = bundlePackageName(bundlePath);
    if (names.has(name)) return true;
    // A subpath row (e.g. `@deepseek-ai/dsh-tool-subagent/model-selection-settings`)
    // loads the owning package's client half.
    for (const loaded of names) if (name === loaded || name.startsWith(loaded + '/')) return true;
    return false;
  };
}

module.exports = { ENABLED_BUNDLES, detectLoadedModuleNames, makeLoadedPredicate, bundlePackageName };

if (require.main === module) {
  const predicate = makeLoadedPredicate();
  console.log(`enabled bundle patches: ${ENABLED_BUNDLES.join(', ')}`);
  console.log(`loaded module names: ${detectLoadedModuleNames().size}`);
  const dicts = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'locale-dicts-all.json'), 'utf8'));
  let loaded = 0;
  let unloaded = 0;
  for (const bundle of Object.keys(dicts)) {
    if (predicate(bundle)) {
      loaded += 1;
      console.log(`loaded    ${bundle}`);
    } else {
      unloaded += 1;
    }
  }
  console.log(`\n${loaded} loaded bundle dictionaries, ${unloaded} not mounted in this profile`);
}
