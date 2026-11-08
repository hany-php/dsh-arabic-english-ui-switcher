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
      // Composer placeholder is positioned with physical insets; mirror it.
      // (Class hash comes from DSH 0.2.2-rc.1; guarded by the attribute match.)
      '[dir="rtl"] [class*="GRgSLq_placeholder"] {',
      '  inset: 4px 14px auto 8px !important;',
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
