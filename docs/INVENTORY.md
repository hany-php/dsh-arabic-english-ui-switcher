# Translation Inventory & Coverage Plan

> Generated in Phase 0, extended in Phase 1, and replaced by the Phase 3
> dictionary harvest from `app.asar` (DSH 0.2.2-rc.1).
> Raw English corpus: [`tools/locale-en-corpus.json`](../tools/locale-en-corpus.json).
> Full per-bundle dictionaries: [`tools/locale-dicts-all.json`](../tools/locale-dicts-all.json).

## 1. How the locale service resolves a key

`ctx.locale` keeps dictionaries per namespace. A lookup walks the active
language's fallback chain inside the entry namespace, then repeats it in the
`common` namespace, then shows the raw key. That means:

- Every registered namespace falls back to English automatically (fail-safe).
- Adding `ar` to a namespace requires the namespace's own English dictionary,
  because English is resolved *inside* that namespace before `common` is tried.

## 2. Where the English strings come from

Each client package embeds its dictionaries in `lib/client.js` as object
literals (with `zh` / `ja` / `es` / … siblings). Two shapes exist, and both are
harvested:

- `const en = { ... }` — plus named variants (`guideEn`, `accessEn`,
  `frequencyEn`, `onboardingEn`, `zoomEn`) and generated names (`en$1`, `en$2`, …);
- inline `ctx.locale.register(ns, { en: { ... }, zh: { ... } })` dictionaries.

Some dictionaries are assembled by spreading another literal
(`const en = { ...guideEn, … }`), and some values are arrays joined at runtime
(`["### How it works", "…"].join("\n\n")`). The harvester resolves spreads and
reproduces the joined string the UI actually renders. The first harvest missed
those two shapes until a follow-up pass found the still-English preset guide
dialog; the extractor now handles them.

Native tools cannot read inside `app.asar`, so Phase 3 added a read-only asar
inspector and a dictionary harvester:

| Tool | Role |
|---|---|
| [`tools/asar-util.cjs`](../tools/asar-util.cjs) | Read-only asar list/read/grep (header parser, no extraction to disk) |
| [`tools/extract-locale-corpus.cjs`](../tools/extract-locale-corpus.cjs) | Harvest every English dictionary literal → corpus + per-bundle dictionaries |
| [`tools/loaded-bundles.cjs`](../tools/loaded-bundles.cjs) | Which client bundles the enabled bundle patches actually mount |
| [`tools/ar-keys.cjs`](../tools/ar-keys.cjs) | Read the `AR_CORE` + `AR_PHASE3` keys with the runtime lookup rule |
| [`tools/locale-coverage.cjs`](../tools/locale-coverage.cjs) | Coverage report (mounted bundles by default, `--all` for every shipped bundle) |
| [`tools/locale-batch.cjs`](../tools/locale-batch.cjs) | Split missing strings into balanced per-area translation batches |
| [`tools/check-translation-part.cjs`](../tools/check-translation-part.cjs) | Validate one batch (placeholders, whitespace, BOM/zero-width, coverage) |
| [`tools/apply-translations.cjs`](../tools/apply-translations.cjs) | Regenerate the `AR_PHASE3` block in the client bundle |
| [`tools/test-locale-client.cjs`](../tools/test-locale-client.cjs) | Offline integration test of the real client half against a stub locale service |

Harvest result for 0.2.2-rc.1: **85 client bundles scanned, 62 carry English
dictionaries, 78 dictionary literals, 3,128 unique English values**. The current
desktop profile mounts 52 of those bundles (**2,258 unique values**); 856 values
live only in bundles the profile does not mount and stay English until enabled.

## 3. Namespaces discovered in 0.2.2-rc.1

| Namespace | Owner | Notes |
|---|---|---|
| `common` | `@deepseek-ai/dsh-client-locale` | Shared vocabulary (ok, cancel, copy, code block, workspace name…) |
| `settings.locale` | `@deepseek-ai/dsh-client-locale` | `language.title` only |
| `permission.access` | `dsh-client-ui-permission-presets` | Permission row + full-access confirmation |
| `_` (appearance/fonts) | `dsh-client-ui-theme` | Appearance, Light/Dark/System, font sizes, font families |
| `_` (settings shell) | `dsh-client-ui-settings-shell` | Panel title, nav labels, connection state, desktop update |
| `_` (models/account) | `dsh-client-ui-settings-models` | Providers, API keys, model catalog, reasoning levels |
| `_` (shortcuts) | `dsh-client-ui-shortcuts` | Recorder, reset, platform help |
| `_` (plugins) | `dsh-client-ui-plugin-manager` | Install/update flows, component states, registries |
| `_` (chat/work details) | `dsh-client-ui-chat` | Step process texts, turn usage, compaction, retries |
| `_` (conversation/trajectory) | `dsh-client-ui-conversation`, `dsh-client-ui-trajectory` | Tool cards, detail fields, timeline, usage tables |
| `_` (agent presets) | `dsh-client-ui-agent-preset` | Preset roster and picker |
| `actionCards`, `contextMenu`, `documentHtml`, `documentMarkdown`, `entryCustomization`, `fileActions`, `fileDrag`, `job`, `shortcuts.layout`, `sidebarExcel`, `sidebarImage`, `sidebarOffice`, `sidebarPdf`, `inspectorPanel`, `creationRecommendations`, `pluginRecommendations` | various | Smaller feature namespaces |

`_` means the package registers its dictionaries through a module-local constant,
so the exact namespace string is not statically discoverable; the client half
therefore translates by **English source string** at runtime and does not depend
on namespace names at all.

## 4. Implementation

`packages/dsh-arabic-locale/client.js` keeps two literals:

- **`AR_CORE`** — hand-curated table from Phases 1–2 (375 keys): shared actions,
  settings shell, appearance/fonts, permissions, shortcuts, models/account,
  plugin manager, chat work details, command menu, session menu, account card.
- **`AR_PHASE3`** — generated coverage expansion (1,790 keys), grouped by UI
  area, regenerated by `tools/apply-translations.cjs` and never edited by hand.

At activation the client merges both (`const AR = Object.assign({}, AR_CORE,
AR_PHASE3)`), scans every registered namespace, maps each English value through
`AR`, and registers the result for `ar`. Values missing from the table fall back
to English through the locale service — the intended, safe failure mode.

## 5. Phase 3 coverage result

Batch sizes and merged counts by area:

| Area | Batch strings | Merged (new AR keys) |
|---|---|---|
| chat-and-conversation | 378 | 367 |
| plugins-and-commands | 308 | 305 |
| trajectory-agent-and-plan | 275 | 261 |
| schedule-workspace-and-jobs | 312 | 307 |
| settings-and-shortcuts | 268 | 259 |
| sidebar-and-tools | 156 | 151 |
| agent-preset-guides (follow-up) | 16 | 16 |
| supplemental-ui (follow-up) | 124 | 124 |
| **Total** | **1,837** | **1,790** |

Mounted coverage after both passes: **2,139 / 2,258 unique English values
(94.7 %)**. The remaining **119 are intentionally English** — they are technical
tokens, not prose:

- 33 identifiers/commands/units kept Latin by design: `Read`, `Write`, `Bash`,
  `Pwsh`, `Grep`, `Glob`, `Fetch`, `Code`, `SYSTEM`, `USER`, `TOOL`, `JSON`,
  `HTTP`, `ID`, `IN`, `OUT`, `TTFT`, slash-command tokens (`goal`, `plan`, …),
  `en`, `px`, `s`, `Finder`, package/path examples.
- 47 format/technical strings whose translation equals the source: duration
  templates (`{count} d`, `{hours}h {minutes}m`, `~{months}mo`, `{value} ms`),
  placeholder-only templates (`{name}`, `{url}`, `{percent}%`), date/version
  formats (`{y}-{m}-{d}`, `v{version}`), URLs, protocol names
  (`Anthropic Messages`, `OpenAI Chat Completions`, `OpenAI Responses`), and the
  `Tab` key.
- 39 values added by the follow-up harvest that stay English by design: OS
  application names in the "Open with" picker (VS Code, PyCharm, Ghostty, iTerm2,
  kitty, …), format labels (`Markdown`), `EXP`, `UTC`, `DeepSeek Harness`, and
  composition-only templates (`{from}–{to}`, `{weekday}`, `{weekdays}{months}`,
  `{hours}`, `{rule} ({timeZone})`).

An independent QA pass over the first 1,650 entries found 23 wording issues
(1 high, 4 medium, 18 low) — for example, "compress" rendered as «اضغط» (press)
in an image-upload error. All 23 were fixed before the final merge, and the merge
is guarded by the offline client test (`tools/test-locale-client.cjs`).

### Follow-up pass (preset guide dialog still English)

After the first install the user reported one remaining English dialog: the
agent-preset "Mode details / How to use" guide. Root cause: the harvester only
matched `const en = {` and plain string values, so it missed `const guideEn = {`
(spread into `const en`), `accessEn`/`frequencyEn`/`onboardingEn`/`zoomEn`,
`en$N` literals, and array values joined with `.join("\n\n")`. The extractor now
parses those shapes (spreads resolved, joined arrays flattened), which added 192
values to the corpus; 140 of them were translated in two supplemental batches
(16 agent-preset guide strings + 124 other UI strings), bringing mounted
coverage to the numbers above. No human-readable English remains in the mounted
bundles.

## 6. Remaining gaps

- **Not-mounted bundles (10)**: `ui-action-cards`, `ui-creation-recommendations`,
  `ui-plugin-market`, `ui-plugin-recommendations`,
  `experimental-client-ui-cot-translation`, `experimental-client-ui-forge`,
  `experimental-client-ui-stats`, `experimental-client-ui-voice-input`,
  `experimental-liveshare`, `experimental-session-inspector`. 856 unique values
  live only in those bundles and stay English until one is enabled; then rerun
  the pipeline below.
- **Data, not UI keys**: Agent preset descriptions, plugin README content,
  session titles and conversation content are data and out of scope.
- **Future DSH releases**: new strings stay English until the corpus is
  re-harvested and translated — that is the intended, visible-by-default
  failure mode.

## 7. Re-running the pipeline after a DSH update

```powershell
$node = 'C:\Users\hany_\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

# 1. Re-harvest the shipped dictionaries and report coverage
& $node tools/extract-locale-corpus.cjs
& $node tools/locale-coverage.cjs

# 2. Split the mounted-bundle gaps into balanced batches under .work/
& $node tools/locale-batch.cjs

# 3. Translate .work/part-N.json -> .work/out-N.json, then validate each pair
& $node tools/check-translation-part.cjs .work/part-1.json .work/out-1.json

# 4. Regenerate the AR_PHASE3 block and reinstall the bundle
& $node tools/apply-translations.cjs
& $node --check packages/dsh-arabic-locale/client.js

# 5. Verify the client contract offline (no browser needed)
& $node tools/test-locale-client.cjs
```

The client bundle must be reinstalled through `plugin_manager` (remove then
install) and the page reloaded (Ctrl+R) before the new strings appear.
