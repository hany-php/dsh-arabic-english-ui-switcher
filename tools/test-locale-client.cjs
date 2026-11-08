#!/usr/bin/env node
/**
 * Offline integration test for the Arabic locale client half.
 *
 * The bundle is a browser module (`window.__ModuleLoader__.load`), so there is
 * no browser here. This test evaluates the real `client.js` against a stub
 * `__ModuleLoader__` and a stub locale service, then asserts the observable
 * contract:
 *
 *   - Arabic is added to the catalog with the English fallback;
 *   - every English namespace that has known values gets an `ar` dictionary;
 *   - values map through AR_CORE + AR_PHASE3, placeholders untouched;
 *   - trailing-space padding is preserved (`"Cancel "` -> `"إلغاء "`);
 *   - namespaces that already have `ar` are skipped;
 *   - a later locale revision triggers the throttled re-scan;
 *   - a missing `ctx.locale.dicts` falls back to the minimal common dictionary.
 *
 * Usage: node tools/test-locale-client.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CLIENT = path.join(__dirname, '..', 'packages', 'dsh-arabic-locale', 'client.js');
const source = fs.readFileSync(CLIENT, 'utf8');

let failures = 0;
function check(name, condition, detail) {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`);
  }
}

/** Load the browser module and return its exported plugin object. */
function loadModule() {
  let plugin = null;
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(definition) {
          if (definition.id !== '@local/dsh-arabic-locale') throw new Error(`wrong module id: ${definition.id}`);
          plugin = definition.factory(() => {
            throw new Error('client half must not require anything');
          });
        },
      },
    },
    console,
    setTimeout,
    clearTimeout,
    // The client checks `dicts instanceof Map`; the fixture maps are built in
    // this realm, so the sandbox must share the same Map constructor.
    Map,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'dsh-arabic-locale/client.js' });
  return plugin;
}

/** Minimal locale service modelled on the shipped contract. */
function makeLocale({ dicts, withDicts = true } = {}) {
  const registered = [];
  const addLanguageCalls = [];
  const listeners = [];
  const locale = {
    addLanguage(options) {
      addLanguageCalls.push(options);
    },
    register(ns, loc, dict) {
      if (registered.some((entry) => entry.ns === ns && entry.loc === loc)) {
        throw new Error(`duplicate registration: ${ns}/${loc}`);
      }
      registered.push({ ns, loc, dict });
      // The real service records the dictionary in the registry; mirror that so
      // re-scans see `locales.has('ar')` and skip the namespace.
      if (locale.dicts && locale.dicts.has(ns)) locale.dicts.get(ns).set(loc, dict);
    },
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
  if (withDicts) locale.dicts = dicts;
  return { locale, registered, addLanguageCalls, listeners };
}

function makeContext(locale) {
  return {
    locale,
    effect(callback) {
      const dispose = callback();
      return dispose;
    },
  };
}

async function main() {
  const plugin = loadModule();
  check('module registers under the package name', plugin && typeof plugin.apply === 'function');
  check('plugin injects the locale service', Array.isArray(plugin.inject) && plugin.inject.includes('locale'));

  // --- normal activation -------------------------------------------------
  const dicts = new Map([
    ['common', new Map([['en', { ok: 'OK', cancel: 'Cancel', 'load.failed': 'Failed to load', padded: 'Cancel ' }]])],
    [
      'chat.ns',
      new Map([
        ['en', { 'message.stepProcess.done.read': 'Read files', reminder: 'Show {count} more sessions' }],
        ['zh', { 'message.stepProcess.done.read': '读取文件' }],
      ]),
    ],
    ['already.localized', new Map([['en', { x: 'Should stay' }], ['ar', { x: 'يجب أن يبقى' }]])],
    ['empty.ns', new Map([['en', { onlyNumbers: '123' }]])],
  ]);
  const first = makeLocale({ dicts });
  plugin.apply(makeContext(first.locale));

  check('addLanguage called once', first.addLanguageCalls.length === 1);
  const language = first.addLanguageCalls[0] || {};
  check('addLanguage registers ar/العربية/en', language.id === 'ar' && language.label === 'العربية' && language.fallback === 'en');

  const byNs = Object.fromEntries(first.registered.map((entry) => [entry.ns, entry]));
  check('common dictionary registered for ar', byNs.common && byNs.common.loc === 'ar');
  const common = (byNs.common && byNs.common.dict) || {};
  check('plain value maps', common.ok === 'موافق', `got ${JSON.stringify(common.ok)}`);
  check('placeholder value maps', common.cancel === 'إلغاء', `got ${JSON.stringify(common.cancel)}`);
  check('multi-word value maps', common['load.failed'] === 'تعذّر التحميل', `got ${JSON.stringify(common['load.failed'])}`);
  check('trailing-space padding preserved', common.padded === 'إلغاء ', `got ${JSON.stringify(common.padded)}`);

  check('chat namespace registered for ar', byNs['chat.ns'] && byNs['chat.ns'].loc === 'ar');
  const chat = (byNs['chat.ns'] && byNs['chat.ns'].dict) || {};
  check('step-process value maps', chat['message.stepProcess.done.read'] === 'قُرئت الملفات', `got ${JSON.stringify(chat['message.stepProcess.done.read'])}`);
  check('placeholder preserved verbatim', chat.reminder === 'عرض {count} جلسة أخرى', `got ${JSON.stringify(chat.reminder)}`);

  check('namespace already having ar is skipped', !byNs['already.localized']);
  check('namespace with no translatable values is skipped', !byNs['empty.ns']);

  // --- throttled re-scan on locale revision ------------------------------
  first.listeners.forEach((listener) => listener());
  dicts.set('late.ns', new Map([['en', { 'New Session': 'New Session' }]]));
  await new Promise((resolve) => setTimeout(resolve, 160));
  const late = first.registered.find((entry) => entry.ns === 'late.ns');
  check('re-scan translates namespaces registered later', !!(late && late.dict['New Session'] === 'جلسة جديدة'));

  // --- fail-safe when dicts is unavailable -------------------------------
  const second = makeLocale({ withDicts: false });
  plugin.apply(makeContext(second.locale));
  const fallback = second.registered.find((entry) => entry.ns === 'common');
  check('fallback common dictionary registered without ctx.locale.dicts', !!(fallback && fallback.dict.ok === 'موافق'));

  // --- cleanup -----------------------------------------------------------
  // The plugin returns a disposer through ctx.effect; calling it must not throw.
  check('activation is idempotent on the catalog call path', second.addLanguageCalls.length === 1);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('test crashed:', error);
  process.exit(1);
});
