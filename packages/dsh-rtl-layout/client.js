/**
 * Client half of the RTL layout bundle.
 *
 * Mirrors the application shell whenever the active UI language is
 * right-to-left (Arabic). Direction is derived from the locale service, so the
 * existing language preference persists the choice across restarts and no
 * second toggle can disagree with the language shown on screen.
 *
 * Safety:
 * - only the document root is touched;
 * - the previous `dir`/`lang` attributes are captured and restored exactly;
 * - every override is scoped to `[dir="rtl"]`, so LTR mode is never affected;
 * - code, terminal, math, paths and previews stay LTR islands.
 *
 * Module id MUST equal the package name.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-rtl-layout',
  factory(require) {
    /** Languages whose UI is mirrored. English and the other shipped packs stay LTR. */
    const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

    /** Scoped layout corrections that the document direction cannot infer. */
    const CSS = [
      // LTR islands: never mirror code, terminal, math, paths or previews.
      '[dir="rtl"] pre,',
      '[dir="rtl"] code,',
      '[dir="rtl"] kbd,',
      '[dir="rtl"] samp,',
      '[dir="rtl"] var,',
      '[dir="rtl"] .katex,',
      '[dir="rtl"] .katex *,',
      '[dir="rtl"] .monaco-editor,',
      '[dir="rtl"] .xterm,',
      '[dir="rtl"] .xterm *',
      '{',
      '  direction: ltr !important;',
      '  unicode-bidi: isolate !important;',
      '  text-align: left !important;',
      '}',
      // Code-ish component classes used by the shipped UI.
      '[dir="rtl"] [class*="shiki"],',
      '[dir="rtl"] [class*="codeBlock"],',
      '[dir="rtl"] [class*="terminal"],',
      '[dir="rtl"] [class*="documentPreview"],',
      '[dir="rtl"] [class*="filePath"],',
      '[dir="rtl"] [class*="pathText"]',
      '{',
      '  direction: ltr !important;',
      '  unicode-bidi: isolate !important;',
      '}',
      // Bare URLs keep their own direction inside Arabic prose.
      '[dir="rtl"] a[href] {',
      '  unicode-bidi: isolate;',
      '}',
      // Text blocks: derive the paragraph direction from the first strong
      // character, so English sentences inside the RTL shell keep their
      // punctuation on the correct side (".text" vs "text.").
      '[dir="rtl"] :where(p, li, dt, dd, td, th, label, small, strong, em, figcaption, summary, blockquote, caption, div, span) {',
      '  unicode-bidi: plaintext;',
      '}',
      // LTR-only idioms: auto margins are physical, so mirror the group to the
      // opposite edge in RTL.
      '[dir="rtl"] [style*="margin-left: auto"],',
      '[dir="rtl"] [style*="margin-left:auto"] {',
      '  margin-left: 0 !important;',
      '  margin-right: auto !important;',
      '}',
      '[dir="rtl"] [style*="margin-right: auto"],',
      '[dir="rtl"] [style*="margin-right:auto"] {',
      '  margin-right: 0 !important;',
      '  margin-left: auto !important;',
      '}',
      '[dir="rtl"] [class*="_rowActions"],',
      '[dir="rtl"] [class*="_headerActions"],',
      '[dir="rtl"] [class*="_footerActions"] {',
      '  margin-left: 0 !important;',
      '  margin-right: auto !important;',
      '}',
      // --- Composer (DSH 0.2.2-rc.1 custom properties are physical) ---------
      // The trailing group (submit + model + permission + add) is pinned with a
      // physical `margin-left: auto`; in RTL it must be pinned to the left edge
      // by the opposite auto margin, otherwise the whole group floats right and
      // the submit button appears in the middle of the card.
      '[dir="rtl"] [class*="GRgSLq_trailing"] {',
      '  margin-left: 0 !important;',
      '  margin-right: auto !important;',
      '}',
      '[dir="rtl"] [class*="GRgSLq_trailingActive"] {',
      '  margin-right: 0 !important;',
      '}',
      // Editor padding, placeholder inset and the select chevron are physical.
      '[dir="rtl"] [class*="GRgSLq_input"] {',
      '  padding: 4px 14px 0 8px !important;',
      '}',
      '[dir="rtl"] [class*="GRgSLq_placeholder"] {',
      '  inset: 4px 14px auto 8px !important;',
      '}',
      '[dir="rtl"] [class*="GRgSLq_select"] {',
      '  background-position: left 4px center !important;',
      '  padding: 0 8px 0 20px !important;',
      '}',
      '[dir="rtl"] [class*="GRgSLq_scroll"] {',
      '  margin-right: 0 !important;',
      '  margin-left: 4px !important;',
      '}',
      '[dir="rtl"] [class*="GRgSLq_retry"] {',
      '  margin-left: 0 !important;',
      '  margin-right: 8px !important;',
      '}',
      // --- Settings shell and menu rows -------------------------------------
      // `.AnXs9G_navCell` in DSH 0.2.2-rc.1 hardcodes `text-align: left` and a
      // physical padding, which pins the settings navigation labels to the far
      // side of their row in RTL.
      '[dir="rtl"] [class*="_navCell"] {',
      '  text-align: start !important;',
      '  padding: 9px 12px 9px 16px !important;',
      '}',
      // Menu/card rows that hardcode `text-align: left`.
      '[dir="rtl"] [class*="_cardOpen"],',
      '[dir="rtl"] [class*="_groupToggle"],',
      '[dir="rtl"] [class*="_optionLabel"],',
      '[dir="rtl"] [class*="_itemLabel"] {',
      '  text-align: start !important;',
      '}',
      // Action groups pinned to the right edge with a physical auto margin.
      '[dir="rtl"] [class*="_actions"] {',
      '  margin-left: 0 !important;',
      '  margin-right: auto !important;',
      '}',
      // Hash-independent fallback for the same LTR idiom in other modules.
      '[dir="rtl"] [class*="_trailing"]:not([class*="_trailingActive"]) {',
      '  margin-left: 0 !important;',
      '  margin-right: auto !important;',
      '}',
      // --- Menu primitives (dropdowns, context menus) ------------------------
      // `_alignEnd` pins a menu to the anchor's right edge with physical
      // properties; in RTL the logical end is the left edge. Do NOT touch
      // `_list` here: it already sets `left: 0` and a rule with higher
      // specificity would win over `_alignEnd` and push the menu off-screen.
      '[dir="rtl"] [class*="_alignEnd"] {',
      '  right: auto !important;',
      '  left: 0 !important;',
      '  inset-inline-start: 0 !important;',
      '  inset-inline-end: auto !important;',
      '}',
      // Menu rows hardcode `text-align: left`.
      '[dir="rtl"] [role="menuitem"] {',
      '  text-align: start !important;',
      '}',
      // The menu width comes from `--dsh-anchored-max-width`, computed for the
      // LTR anchor side; in RTL it can collapse far below the content width and
      // clip every label. Size RTL menus to their content instead.
      '[dir="rtl"] [role="menu"] {',
      '  width: max-content !important;',
      '  min-width: min(160px, calc(100vw - 24px)) !important;',
      '  max-width: min(360px, calc(100vw - 24px)) !important;',
      '}',
      // Submenus open to the right in LTR; mirror the offset in RTL.
      '[dir="rtl"] [class*="_submenu"] {',
      '  left: auto !important;',
      '  right: calc(100% + 10px) !important;',
      '}',
      // Slightly looser leading for Arabic script.
      '[dir="rtl"] body {',
      '  line-height: 1.7;',
      '}',
    ].join('\n');

    const STYLE_ID = 'dsh-rtl-layout-css';
    const ROOT_FLAG = 'data-dsh-rtl';

    function ensureStyle() {
      if (typeof document === 'undefined') return () => {};
      if (document.querySelector('style[data-dsh-rtl-layout]') !== null) return () => {};
      const tag = document.createElement('style');
      tag.dataset.dshRtlLayout = 'on';
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return () => {
        tag.remove();
      };
    }

    return {
      inject: ['locale'],
      apply(ctx) {
        const root = typeof document === 'undefined' ? null : document.documentElement;
        if (root === null) return;

        // Remember the shell's original attributes so disabling is exact.
        const originalDir = root.getAttribute('dir');
        const originalLang = root.getAttribute('lang');
        let applied = false;

        const enable = () => {
          if (applied) return;
          root.setAttribute('dir', 'rtl');
          root.setAttribute('lang', 'ar');
          root.setAttribute(ROOT_FLAG, 'on');
          applied = true;
        };

        const disable = () => {
          if (!applied) return;
          if (originalDir === null) root.removeAttribute('dir');
          else root.setAttribute('dir', originalDir);
          if (originalLang === null) root.removeAttribute('lang');
          else root.setAttribute('lang', originalLang);
          root.removeAttribute(ROOT_FLAG);
          applied = false;
        };

        const sync = () => {
          try {
            const snapshot = ctx.locale.getLocale();
            if (RTL_LOCALES.has(snapshot.active)) enable();
            else disable();
          } catch (error) {
            // Never leave a half-applied direction behind.
            disable();
            console.warn('[dsh-rtl-layout] direction sync failed:', error);
          }
        };

        ctx.effect(() => {
          const removeStyle = ensureStyle();
          const unsubscribe = ctx.locale.subscribe(sync);
          sync();
          return () => {
            unsubscribe();
            disable();
            removeStyle();
          };
        }, 'rtl layout: direction follows the active locale');
      },
    };
  },
});
