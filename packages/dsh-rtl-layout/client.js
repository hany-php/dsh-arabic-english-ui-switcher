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
      // NOTE: menu placement is intentionally NOT overridden. DSH anchors each
      // menu to its trigger with physical `left`/`right` rules; forcing them
      // detached popovers from their triggers (language picker, account card,
      // session menu). `keepMenusInViewport()` below nudges an overflowing menu
      // back inside the screen instead.
      // Menu rows hardcode `text-align: left`.
      '[dir="rtl"] [role="menuitem"] {',
      '  text-align: start !important;',
      '}',
      // Menus ship with `z-index: 100`, which the fullscreen right sidebar
      // paints over (verified with elementFromPoint). Lift popups above the
      // panel layers (`--dsh-dockkit-*-layer` stay below 100).
      '[dir="rtl"] [role="menu"] {',
      '  z-index: 2000 !important;',
      '}',
      // The menu width comes from `--dsh-anchored-max-width`, computed for the
      // LTR anchor side; in RTL it can collapse far below the content width and
      // clip every label.
      '[dir="rtl"] [role="menu"][class*="_list"] {',
      '  min-width: min(160px, calc(100vw - 24px)) !important;',
      '  max-width: min(360px, calc(100vw - 24px)) !important;',
      '}',
      // Submenus open to the right in LTR; mirror the offset in RTL.
      '[dir="rtl"] [class*="_submenu"] {',
      '  left: auto !important;',
      '  right: calc(100% + 10px) !important;',
      '}',
      // --- Right sidebar panel (docks on the left in RTL) --------------------
      // `.acoR2W_panel` is pinned with `right: 0` and slides with a positive
      // `translateX(--dsh-sidebar-width)`. In RTL the panel docks on the left
      // edge and slides in from the left, otherwise it lands half off-screen
      // (its chrome buttons included) and cannot be closed again.
      '[dir="rtl"] [data-sidebar-right-panel] {',
      '  right: auto !important;',
      '  left: 0 !important;',
      '}',
      '[dir="rtl"] [data-sidebar-right-panel="fullscreen"] {',
      '  transform: none !important;',
      // Keep DSH's own width cap: it reserves the main sidebar, so fullscreen
      // covers only the content area exactly like the LTR layout.
      '}',
      '[dir="rtl"] [data-sidebar-right-panel][data-sidebar-right-open] [data-dockkit-host="dock"],',
      '[dir="rtl"] [data-sidebar-right-panel][data-sidebar-right-open] [data-dockkit-divider] {',
      '  transform: none !important;',
      '  visibility: visible !important;',
      '}',
      '[dir="rtl"] [data-sidebar-right-panel]:not([data-sidebar-right-open]) [data-dockkit-host="dock"] {',
      '  transform: translateX(calc(-1 * var(--dsh-sidebar-width))) !important;',
      '}',
      // Slightly looser leading for Arabic script.
      '[dir="rtl"] body {',
      '  line-height: 1.7;',
      '}',
    ].join('\n');

    const STYLE_ID = 'dsh-rtl-layout-css';
    const ROOT_FLAG = 'data-dsh-rtl';

    /**
     * Sidebar resize handles ship as invisible 8px hit areas. Make the splitter
     * line visible and thicker so it can be found by eye, in both directions
     * (this sheet is direction-independent by design).
     */
    const HANDLE_CSS = [
      '[data-side="rightbar"],',
      '[data-side="leftbar"] {',
      '  position: absolute;',
      '}',
      '[data-side="rightbar"]::after,',
      '[data-side="leftbar"]::after {',
      '  content: "";',
      '  position: absolute;',
      '  top: 0;',
      '  bottom: 0;',
      '  left: 50%;',
      '  width: 3px;',
      '  transform: translateX(-50%);',
      '  border-radius: 2px;',
      '  background: var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.55));',
      '  transition: background-color 120ms ease, width 120ms ease;',
      '  pointer-events: none;',
      '}',
      '[data-side="rightbar"]:hover::after,',
      '[data-side="leftbar"]:hover::after,',
      '[data-side="rightbar"]:active::after,',
      '[data-side="leftbar"]:active::after {',
      '  width: 4px;',
      '  background: var(--dsw-alias-state-business-primary, #3b82f6);',
      '}',
    ].join('\n');

    function ensureHandleStyle() {
      if (typeof document === 'undefined') return () => {};
      if (document.querySelector('style[data-dsh-handles]') !== null) return () => {};
      const tag = document.createElement('style');
      tag.dataset.dshHandles = 'on';
      tag.textContent = HANDLE_CSS;
      document.head.appendChild(tag);
      return () => {
        tag.remove();
      };
    }

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

    /** Margin kept between a popup and the viewport edge. */
    const VIEWPORT_MARGIN = 8;

    /**
     * Nudge one popup back inside the viewport when its anchoring puts it past
     * an edge. Position is owned by DSH; this only adds a translate when the
     * measured box overflows, so ordinary menus keep the shipped placement.
     * @param element - candidate popup.
     */
    function clampPopup(element) {
      if (!(element instanceof HTMLElement)) return;
      if (!element.matches('[role="menu"], [role="dialog"]')) return;
      if (element.getClientRects().length === 0) return;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const maxWidth = window.innerWidth - 2 * VIEWPORT_MARGIN;
      // The chat column clips its overflow (`an3WzG_root`, `mP3x-q_centerCol`),
      // and an absolutely positioned menu that extends past that column is cut
      // in half. Promote it to fixed at its current visual position so it
      // escapes every clipping ancestor, then clamp it into the viewport.
      if (getComputedStyle(element).position === 'absolute' && element.dataset.dshRtlFixed !== '1') {
        element.dataset.dshRtlFixed = '1';
        element.style.setProperty('position', 'fixed', 'important');
        element.style.setProperty('left', `${Math.round(rect.left)}px`, 'important');
        element.style.setProperty('top', `${Math.round(rect.top)}px`, 'important');
        element.style.setProperty('right', 'auto', 'important');
        element.style.setProperty('bottom', 'auto', 'important');
        element.style.setProperty('margin', '0', 'important');
      }
      // A menu whose content is wider than its box clips its own labels (the
      // anchored max-width is computed for the LTR side). Measure the widest
      // visible label — not the menu's scrollWidth, which already reflects the
      // clipped boxes — and widen the menu to fit it.
      const labels = element.querySelectorAll('[class*="_itemLabel"], [class*="_optionLabel"], [class*="_tabTitle"]');
      let widestLabel = 0;
      for (const label of labels) widestLabel = Math.max(widestLabel, label.scrollWidth);
      if (widestLabel > 0) {
        const style = getComputedStyle(element);
        const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        // Icon cell + gaps + item padding inside the row.
        const chrome = 56;
        const needed = Math.min(widestLabel + padding + chrome, maxWidth);
        if (needed > rect.width + 1) {
          element.style.setProperty('min-width', `${Math.ceil(needed)}px`, 'important');
        }
      }
      if (element.scrollWidth > rect.width + 1) {
        element.style.setProperty('min-width', `${Math.min(element.scrollWidth, maxWidth)}px`, 'important');
      }
      const box = element.getBoundingClientRect();
      let dx = 0;
      if (box.left < VIEWPORT_MARGIN) dx = VIEWPORT_MARGIN - box.left;
      else if (box.right > window.innerWidth - VIEWPORT_MARGIN) dx = window.innerWidth - VIEWPORT_MARGIN - box.right;
      let dy = 0;
      if (box.bottom > window.innerHeight - VIEWPORT_MARGIN) dy = window.innerHeight - VIEWPORT_MARGIN - box.bottom;
      if (dx !== 0 || dy !== 0) {
        element.dataset.dshRtlClamp = 'applied';
        element.style.setProperty('transform', `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`, 'important');
      }
    }

    /** Clamp every popup currently mounted. */
    function clampAll() {
      for (const element of document.querySelectorAll('[role="menu"], [role="dialog"]')) clampPopup(element);
    }

    /**
     * Keep the right sidebar's resize handle on the panel edge in RTL.
     * The app positions `[data-side="rightbar"]` with a left offset computed for
     * the LTR layout (panel pinned right); after the panel docks left, that
     * offset leaves the handle detached from the panel.
     */
    function positionRightbarHandle() {
      const panel = document.querySelector('[data-sidebar-right-panel]');
      const handle = document.querySelector('[data-side="rightbar"]');
      if (panel === null || handle === null) return;
      const rect = panel.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      handle.style.setProperty('left', `${Math.round(rect.right) - 4}px`, 'important');
      handle.style.setProperty('margin-left', '0', 'important');
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
        let observer = null;

        const onResize = () => {
          clampAll();
          positionRightbarHandle();
        };

        // Menus may be mounted once and toggled with CSS/aria state, which the
        // childList observer never sees. Re-measure on the interactions that can
        // open one.
        let clampTimer = null;
        const scheduleClampAll = () => {
          if (clampTimer !== null) clearTimeout(clampTimer);
          clampTimer = setTimeout(() => {
            clampTimer = null;
            clampAll();
            positionRightbarHandle();
          }, 60);
        };

        const startWatch = () => {
          if (observer !== null) return;
          const settle = (element) => {
            clampPopup(element);
            requestAnimationFrame(() => clampPopup(element));
            setTimeout(() => clampPopup(element), 120);
          };
          observer = new MutationObserver((records) => {
            for (const record of records) {
              for (const node of record.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.matches('[role="menu"], [role="dialog"]')) {
                  requestAnimationFrame(() => settle(node));
                  continue;
                }
                const inner = node.querySelectorAll('[role="menu"], [role="dialog"]');
                if (inner.length > 0) requestAnimationFrame(() => inner.forEach(settle));
              }
            }
            // Panel width changes (docking, dragging) move the resize handle.
            requestAnimationFrame(positionRightbarHandle);
          });
          observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-sidebar-right-panel', 'data-sidebar-right-open'] });
          window.addEventListener('resize', onResize);
          document.addEventListener('pointerdown', scheduleClampAll, true);
          document.addEventListener('keydown', scheduleClampAll, true);
          document.addEventListener('pointerup', scheduleClampAll, true);
        };

        const stopWatch = () => {
          if (observer !== null) {
            observer.disconnect();
            observer = null;
          }
          if (clampTimer !== null) {
            clearTimeout(clampTimer);
            clampTimer = null;
          }
          window.removeEventListener('resize', onResize);
          document.removeEventListener('pointerdown', scheduleClampAll, true);
          document.removeEventListener('keydown', scheduleClampAll, true);
          document.removeEventListener('pointerup', scheduleClampAll, true);
          for (const element of document.querySelectorAll('[data-dsh-rtl-clamp], [data-dsh-rtl-fixed]')) {
            element.style.removeProperty('transform');
            element.style.removeProperty('min-width');
            element.style.removeProperty('position');
            element.style.removeProperty('left');
            element.style.removeProperty('top');
            element.style.removeProperty('right');
            element.style.removeProperty('bottom');
            element.style.removeProperty('margin');
            delete element.dataset.dshRtlClamp;
            delete element.dataset.dshRtlFixed;
          }
        };

        const enable = () => {
          if (applied) return;
          root.setAttribute('dir', 'rtl');
          root.setAttribute('lang', 'ar');
          root.setAttribute(ROOT_FLAG, 'on');
          applied = true;
          startWatch();
          requestAnimationFrame(positionRightbarHandle);
        };

        const disable = () => {
          if (!applied) return;
          stopWatch();
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
          const removeHandles = ensureHandleStyle();
          const unsubscribe = ctx.locale.subscribe(sync);
          sync();
          return () => {
            unsubscribe();
            disable();
            removeStyle();
            removeHandles();
          };
        }, 'rtl layout: direction follows the active locale');
      },
    };
  },
});
