# Translation Inventory & Coverage Plan

> Generated in Phase 0 and extended in Phase 1 after extracting the shipped
> dictionaries directly from `app.asar` (DSH 0.2.2-rc.1).
> Raw English corpus: [`tools/locale-en-corpus.json`](../tools/locale-en-corpus.json).
> Settings-area dictionaries: [`tools/locale-dicts-settings.json`](../tools/locale-dicts-settings.json).

## 1. How the locale service resolves a key

`ctx.locale` keeps dictionaries per namespace. A lookup walks the active
language's fallback chain inside the entry namespace, then repeats it in the
`common` namespace, then shows the raw key. That means:

- Every registered namespace falls back to English automatically (fail-safe).
- Adding `ar` to a namespace requires the namespace's own English dictionary,
  because English is resolved *inside* that namespace before `common` is tried.

## 2. Namespaces discovered in 0.2.2-rc.1

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
| `_` (agent presets) | `dsh-client-ui-agent-preset` | Preset roster and picker |
| `actionCards`, `contextMenu`, `documentHtml`, `documentMarkdown`, `entryCustomization`, `fileActions`, `fileDrag`, `job`, `shortcuts.layout`, `sidebarExcel`, `sidebarImage`, `sidebarOffice`, `sidebarPdf`, `inspectorPanel`, `creationRecommendations`, `pluginRecommendations` | various | Smaller feature namespaces |

`_` means the package registers its dictionaries through a module-local constant,
so the exact namespace string is not statically discoverable; the Phase 1
implementation therefore translates by **English source string** at runtime and
does not depend on namespace names at all.

## 3. Phase 1 coverage (implemented)

The bundle ships a single `English → Arabic` table (`AR` in
[`packages/dsh-arabic-locale/client.js`](../packages/dsh-arabic-locale/client.js))
covering the Settings surface plus shared vocabulary:

- shared/common actions (OK, cancel, copy, save, search, delete, retry…)
- settings shell (title, nav, connection state, desktop update)
- appearance and font settings
- permission presets and the full-access confirmation
- keyboard shortcuts panel
- models/account settings (providers, API keys, reasoning levels)
- plugin manager (install/update states, components, registries)
- chat work details, step-process texts, turn usage, compaction
- workspace/session basics

Runtime behaviour: the client half scans every registered namespace, maps its
English values through the table, and registers the result for `ar`. Namespaces
with no known strings are skipped, so they keep falling back to English.

## 4. Remaining gaps (Phase 3)

- Long-form help paragraphs and error details not yet in the table.
- Tool-call cards for individual tools (bash, read, edit, grep…).
- Agent preset descriptions and plugin README content (data, not UI keys).
- Any string added by a future DSH release stays English until translated —
  that is the intended, visible-by-default failure mode.
