# AGENTS.md — instructions for AI agents working in this repository

This file is the authoritative guide for any agent (or human) who will change this
project later. Read it fully before touching code. User-facing docs are in Arabic
(`README.md`), code and this file are in English.

---

## 1. What this project is

Two independent DeepSeek Harness (DSH) browser bundles that add:

1. **`@local/dsh-arabic-locale`** — an Arabic UI language, registered through the
   official `ctx.locale` service.
2. **`@local/dsh-rtl-layout`** — a right-to-left application shell that follows
   the active language automatically.

Both are presentation-only. They never touch session content, model requests,
tools, `app.asar`, or native modules.

**Status (2026-11-08):** Phase 1 and Phase 2 are implemented and installed in the
`desktop` profile; Phase 3 (wider translation coverage and visual polish) is the
next open work item.

---

## 2. Environment facts

| Item | Value |
|---|---|
| DSH Desktop | `0.2.2-rc.1` |
| App path | `C:\Users\hany_\AppData\Local\Programs\DeepSeek Harness` |
| Implementation checkout | `<app>\resources\app.asar\dsh\` (inside the asar archive) |
| Profile | `desktop` → `C:\Users\hany_\.dsh\profiles\desktop` |
| Web GUI URL | Provided per session in the runtime context; **changes on every restart — never hardcode it** |
| Browser control | None. Visual verification is performed by the user; never claim a visual pass without it |
| Node for syntax checks | `C:\Users\hany_\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe` |
| Inspection | `cordis_inspect_query` (host/client), `plugin_manager` |

---

## 3. Repository map

```
docs/
  INVENTORY.md    translation namespaces + coverage plan (generated from app.asar)
  AUDIT.md        RTL direction audit + mandatory LTR islands
  DECISIONS.md    why two bundles, where settings live, rollout order
HANDOFF.md        current state and next steps for a fresh session
packages/
  dsh-arabic-locale/
    package.json        declares dsh.bundle.patch AND dsh.client  <-- required
    cordis.patch.yml    `insert:` row for the Host half
    index.js            Host half: `export function apply() {}` (no-op)
    client.js           all real work: catalog entry + dictionaries
  dsh-rtl-layout/
    package.json / cordis.patch.yml / index.js (same shape)
    client.js           direction follows the active locale + LTR islands
tools/
  extract-locale-corpus.cjs   reads app.asar as a buffer, harvests English UI strings
  locale-en-corpus.json       1738 unique English strings found in 0.2.2-rc.1
  locale-dicts-settings.json  extracted settings-area dictionaries (key -> English)
```

---

## 4. Hard contracts — violating them breaks the install

1. **A bundle must declare `dsh.client` in `package.json`.** Without
   `"dsh": { "client": { "platform": "web", ... } }` plus
   `exports["./client"]`, the client half is **never loaded**. The Host row can
   report "Running" while nothing user-visible happens. This was the cause of the
   first two failed attempts — check it first when "nothing changes".
2. **Browser module id = package name.** `window.__ModuleLoader__.load({ id })`
   must equal `name` in `package.json`.
3. **`cordis.patch.yml` must use `insert:`.** A bare `- id:` row is an *override*
   and is silently skipped when no row with that id exists.
4. **Install only through `plugin_manager`** (`install_bundle` / `remove_bundle` /
   `set_bundle`). Never hand-edit the profile's `package.json` or
   `cordis.patch.yml`; never run pnpm inside the profile.
5. **Never modify `app.asar`** or native modules. It is read-only input.
6. **Never replace DOM text for translation.** All text goes through
   `ctx.locale.register(ns, locale, dict)`.
7. **Fail-safe by design.** Every registration is wrapped in `try/catch`; a
   missing namespace or a changed API must leave the UI on English/LTR, never
   broken. The direction bundle restores the previous `dir`/`lang` exactly.
8. **LTR islands are mandatory:** `pre`, `code`, `kbd`, `samp`, `.katex`,
   `.monaco-editor`, `.xterm`, plus shiki/codeBlock/terminal/documentPreview/
   filePath classes.
9. **Do not touch `rtl-bidi-plugin`.** It owns per-paragraph `dir="auto"` and stays
   independent. Only test compatibility.
10. **Client changes need a page reload (Ctrl+R).** Installing a bundle does not
    hot-load its client half unless a `pnpm run dev:web` watcher is running.

---

## 5. How the locale plugin works (the part you will edit most)

`packages/dsh-arabic-locale/client.js` contains one table:

```js
const AR = { "English source text": "النص العربي", ... };
```

Keys are the **exact English values** shown by the shipped dictionaries — not the
dictionary keys. That is deliberate: one entry then serves every namespace that
displays the same sentence, and the plugin needs no knowledge of namespace names
(a package's namespace constant is module-local and not statically discoverable).

At activation the client:

1. calls `ctx.locale.addLanguage({ id: 'ar', label: 'العربية', fallback: 'en' })`;
2. calls `translateAllNamespaces(ctx)`, which reads `ctx.locale.dicts`
   (`Map<namespace, Map<locale, {key: text}>>`), takes each namespace's `en`
   dictionary, maps values through `AR`, and registers the result for `ar`;
3. skips namespaces that already have an `ar` dictionary (so re-scans are safe);
4. re-runs the scan 120 ms after any locale revision change, covering plugins
   that register dictionaries later;
5. if `ctx.locale.dicts` is unavailable (future contract change), registers a
   minimal `common` dictionary so core buttons still translate.

### Adding translations
1. Find the exact English string (UI screenshot, or extract it with
   `tools/extract-locale-corpus.cjs` after a DSH update).
2. Add `"Exact English": "الترجمة"` to `AR`.
3. Keep placeholders (`{version}`, `{count}`, …) verbatim.
4. Mind trailing spaces and punctuation: the key must match byte-for-byte.
5. Reinstall the bundle (remove then install) and ask the user to reload.

### Rules for Arabic copy
Short, natural Modern Standard Arabic. Do not translate identifiers, API field
names, file extensions, slash commands, keyboard shortcuts, or brand names.
Never inject BOMs or zero-width characters.

---

## 6. How the RTL plugin works

`packages/dsh-rtl-layout/client.js`:

- `RTL_LOCALES = { ar, he, fa, ur }`; direction is derived from
  `ctx.locale.getLocale().active` on every locale change, so the persisted
  language preference also persists direction. There is intentionally **no
  separate toggle** — a second switch could contradict the language on screen.
- `enable()` sets `dir="rtl"`, `lang="ar"`, and `data-dsh-rtl="on"` on
  `document.documentElement`; `disable()` restores the captured originals.
- A `<style data-dsh-rtl-layout>` tag injects the LTR-island rules; every rule is
  scoped to `[dir="rtl"]`, so LTR mode is unaffected.
- Cleanup (`ctx.effect` disposer) unsubscribes, disables, and removes the style.

When you add a CSS correction for a newly observed layout bug, put it inside the
same scoped stylesheet and keep the `[dir="rtl"]` prefix.

---

## 7. Install and verify (required evidence)

```text
plugin_manager({ action: "remove_bundle", target: "@local/dsh-arabic-locale" })
plugin_manager({ action: "install_bundle", target: "<absolute path to package dir>" })
```

A reinstall is required for changed files because `install_bundle` refuses an
already-installed spec (`already-installed`). Always read `application`
(`applied` required) and `warnings` (must be empty).

Evidence before claiming success:

1. `plugin_manager install_bundle` → `application: "applied"`, `warnings: []`.
2. `plugin_manager list_bundles` → the bundle row exists with `rows` and
   `overrides: []`.
3. `cordis_inspect_query` (host `Config.listConfigs`, `name: "<package>"`) → row
   `include:<row id>` present.
4. `node --check` passes for every `index.js` / `client.js`.
5. The **user** confirms the visual checklist. Installation alone is not proof.

---

## 8. Tooling gotchas

- `grep`, `glob`, and shell commands **cannot read inside `app.asar`** (native
  tools fail with "path not found"). Use the `read` tool, or read the archive as
  a byte buffer in Node (see `tools/extract-locale-corpus.js`).
- `ctx.locale.register(ns, locale, dict)` **throws** if `(ns, locale)` is already
  registered. Always check `locales.has('ar')` first.
- `addLanguage` **throws** if the id is taken, the label is empty, or the fallback
  is unknown or creates a cycle. English is the only terminal fallback.
- Hook/plugin order matters: declare `inject: ['locale']` so activation waits for
  the service instead of reading it too early.
- When scanning the asar from Node, use `indexOf` loops with a byte cursor.
  Regexes with nested quantifiers over the 300 MB buffer can hang for minutes.

### CSS override rules learned the hard way

1. **Never target a bare primitive class.** The menu primitives (`_alignEnd`,
   `_list`, `_trailing`, `_actions`, `_submenu`) are reused by panels, popovers and
   page chrome. Scope every rule with a structural anchor such as
   `[role="menu"]` or `[data-sidebar-right-panel]`.
2. **Never use `:has(> [role="menu"]) { overflow: visible }`.** It matches layout
   wrappers and broke the fullscreen right sidebar.
3. **Do not override `left`/`right` of a menu.** DSH anchors menus itself; forcing
   an edge detaches the language picker, account card and session menu from their
   triggers. Let the shipped placement stand and clamp overflow in JS instead
   (`clampPopup()` in the RTL client).
4. Prefer CSS-module **suffix** selectors (`[class*="_navCell"]`) over full hashes:
   the readable suffix survives rebuilds.
5. Physical properties to mirror in RTL: `text-align`, `left`/`right`,
   `margin-left/right`, `padding-left/right`, `inset`, `translateX`, `order`,
   `background-position`, and `float`.
6. Prefer `data-*` hooks that the app already exposes
   (`data-sidebar-right-panel`, `data-sidebar-right-open`, `data-dockkit-*`) — they
   are part of the DOM contract and survive CSS-hash changes.

---

## 9. RTL override inventory (DSH 0.2.2-rc.1)

Every rule below is scoped to `[dir="rtl"]` unless stated; the splitter sheet is
direction-independent on purpose. Keep this table in sync when you add a rule.

| Selector | Why |
|---|---|
| `pre, code, kbd, samp, var, .katex, .monaco-editor, .xterm` (+ shiki/codeBlock/terminal/documentPreview/filePath/pathText classes) | LTR islands |
| `:where(p, li, dt, dd, td, th, label, small, strong, em, figcaption, summary, blockquote, caption, div, span)` → `unicode-bidi: plaintext` | Keep English punctuation on the correct side |
| `[style*="margin-left: auto"]` / `[style*="margin-right: auto"]` | Inline physical auto margins |
| `[class*="_rowActions"], [class*="_headerActions"], [class*="_footerActions"], [class*="_actions"], [class*="_trailing"]` | Groups pinned with a physical auto margin |
| `.GRgSLq_*` (composer: `trailing`, `input`, `placeholder`, `select`, `scroll`, `retry`) | Composer toolbar and editor insets |
| `[class*="_navCell"]`, `[class*="_cardOpen"]`, `[class*="_groupToggle"]`, `[class*="_optionLabel"]`, `[class*="_itemLabel"]`, `[role="menuitem"]` | Hardcoded `text-align: left` |
| `[role="menu"][class*="_list"]` → `min-width` / `max-width` | Anchored width is computed for the LTR side |
| `[role="menu"]` → `z-index: 2000` | Menus ship at 100 and get covered by panel layers |
| `[data-sidebar-right-panel]` → `left: 0` | Panel is pinned with `right: 0`; it docks left in RTL |
| `[data-sidebar-right-panel="fullscreen"]` → `transform: none` | Slide-in uses a positive `translateX` |
| `[data-sidebar-right-panel][data-sidebar-right-open] [data-dockkit-host="dock"]` | Keep the open dock visible |
| `[data-side="rightbar"], [data-side="leftbar"], [data-width-handle]` (direction-independent) | Draw a visible splitter line over invisible 8px handles |

Runtime helpers in `packages/dsh-rtl-layout/client.js` (these replace CSS
positioning, which kept breaking popups):

- `clampPopup()` — promotes absolutely positioned menus/dialogs to `fixed` at
  their current rect (escapes clipping columns such as `mP3x-q_centerCol`), widens
  them from the widest `_itemLabel` content, then nudges them inside the viewport.
- `positionRightbarHandle()` — derives the resize handle's `left` from the panel
  rect instead of the app's LTR offset.
- `MutationObserver` on `body` (childList + `style`/`data-sidebar-right-*`
  attributes) plus pointer/key listeners, all throttled by rAF/60 ms.

Empirical rule: **measure before overriding.** Two long debugging rounds were
caused by guessing; the final fixes came from `getBoundingClientRect()`,
`elementFromPoint()` and computed styles read in the running app.

---

## 10. Working agreement

1. Read `HANDOFF.md`, `docs/DECISIONS.md`, and this file before editing.
2. Keep the two bundles independent: a failure in one must not affect the other.
3. Update `HANDOFF.md` (state, date, next step) after every milestone.
4. Update `docs/INVENTORY.md` when translation coverage changes materially.
5. Report verification limits honestly — no browser automation exists here.
6. Never delete or edit user data or profile state without explicit approval.
