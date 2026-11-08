# Architectural Decisions

## 1. Bundle Structure
**Decision:** Monorepo with **two independent bundles**.

- **`packages/dsh-arabic-locale`**:
  - **Purpose:** Language registration and dictionaries.
  - **Host Row:** Registers Arabic as a supported language.
  - **Client Half:** Calls `ctx.locale.addLanguage` and `ctx.locale.register`.
- **`packages/dsh-rtl-layout`**:
  - **Purpose:** Visual mirroring and direction control.
  - **Host Row:** Adds a persistent settings field `ui.arabicMode`.
  - **Client Half:** Manages `document.documentElement.dir` based on the setting.

**Rationale:** Separation of concerns. A user might want the Arabic language but keep LTR (or vice versa for debugging). It also prevents a crash in the translation layer from breaking the layout.

## 2. Settings & Persistence
**Decision:** Use the official `ctx.locale` and `ConfigForms` pattern.

- **Language:** Handled by the built-in `locale` service. We only add the `ar` option.
- **RTL Mode:**
  - Defined in the `dsh-rtl-layout` Host row.
  - Persisted via the Host's settings store (similar to how `ui-theme` works).
  - Managed on the client via a `ConfigForm` for the `ui-settings` namespace.
- **Placement:** The toggle will be registered in the `settings.general.item` slot.

## 3. Implementation Order
1. **Phase 1 (Locale):** Install `dsh-arabic-locale`. Verify "العربية" appears in Settings and core UI translates.
2. **Phase 2 (Layout):** Install `dsh-rtl-layout`. Verify the root flip and "LTR Island" guards.
3. **Phase 3 (Refinement):** Polish the CSS overrides and expand translation coverage.

## 4. Safety & Fallbacks
- **Safe Fallback:** If `ar` is selected but a key is missing, `ctx.locale` automatically uses `en`.
- **Reversibility:** The RTL toggle is a simple boolean; turning it off restores `dir="ltr"` immediately.
- **No-Touch Policy:** Zero modifications to `app.asar` or profile files. All changes via `plugin_manager`.
