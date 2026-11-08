# RTL Direction Audit

## 1. Global Strategy
- **Root Flip:** `document.documentElement.dir = 'rtl'` and `lang = 'ar'`.
- **Logic:** Use CSS Logical Properties (e.g., `margin-inline-start` instead of `margin-left`) where possible. For shipped CSS that uses physical properties, provide scoped overrides.

## 2. Screen Inventory & Issues

| Element | Expected Behavior | Risk / Issue | Mirroring Strategy |
|---|---|---|---|
| **Main Shell** | Sidebar moves to right, Chat to left | High | `dir="rtl"` on root |
| **Sidebar** | Brand mark and labels align right | Medium | Physical `left` $\rightarrow$ `right` overrides |
| **Chat Flow** | User messages right, Assistant left | High | Mirror bubble alignment + `text-align: right` |
| **Composer** | Input text right-aligned, Submit button left | High | `dir="rtl"` + mirror icon positions |
| **Settings** | Labels right, Controls left | Medium | Flex-direction: `row-reverse` or Logical props |
| **Toasts/Notices** | Slide in from right | Low | Adjust animation entry point |
| **Tooltips** | Position relative to anchor flipped | Medium | Mirror `left/right` offsets |
| **Context Menus** | Anchor to right edge of target | Medium | Mirror menu offset |

## 3. Mandatory LTR Islands
These elements **MUST NOT** be flipped. They will be wrapped in `dir="ltr"` or guarded via CSS.

| Island Type | Reason | Guard Method |
|---|---|---|
| **Code Blocks** | Programming languages are LTR | `.code-block { dir: ltr !important; }` |
| **Terminal** | CLI output is strictly LTR | `.terminal { dir: ltr !important; }` |
| **Math/LaTeX** | Formulas are LTR | `.math-node { dir: ltr !important; }` |
| **File Paths** | `/home/user/...` is LTR | `.file-path { dir: ltr !important; }` |
| **URLs** | `https://...` is LTR | `a { dir: ltr !important; }` |
| **Document Previews** | PDF/Office layout is fixed | `.preview-container { dir: ltr !important; }` |

## 4. Interaction with `rtl-bidi-plugin`
The existing plugin handles per-paragraph `dir="auto"`. 
- **Scenario:** Root `dir="rtl"` + Paragraph `dir="auto"`.
- **Result:** The layout is Arabic/RTL, but an English paragraph inside the chat will still align left. This is the desired professional behavior.

## 5. Applied overrides (Phase 2 result, DSH 0.2.2-rc.1)

Every fix below was measured in the running app before being applied; see
`AGENTS.md` §9 for the maintained inventory.

| Area | Shipped behaviour | RTL correction |
|---|---|---|
| Composer toolbar | `.GRgSLq_trailing { margin-left: auto }` | swap auto margin; mirror editor padding, placeholder inset, select chevron |
| Settings navigation | `.AnXs9G_navCell { text-align: left; padding: 9px 16px 9px 12px }` | `text-align: start` + mirrored padding |
| Settings header actions | `.AnXs9G_actions { margin-left: auto }` | swap auto margin |
| Menus | `right: 0` anchor inside the chat column, which clips overflow | keep shipped anchor, promote to `fixed` at the measured rect, widen from the widest label, clamp to viewport, `z-index: 2000` |
| Right sidebar panel | `right: 0` + `translateX(+width)` slide | dock left, invert the slide, keep the shipped `max-width` so the main sidebar stays visible |
| Sidebar resize handle | `left` computed in JS for the LTR side | recompute from the panel rect on dock/resize/drag |
| Width + sidebar handles | invisible 8px hit areas | 3px themed splitter line, 4px accent on hover/drag, both directions |

**Fullscreen right sidebar:** covers the content area by design (DSH behaviour);
the main sidebar remains visible, matching the English layout.

## 6. Phase 3 note (translation expansion)

Phase 3 changed copy only and added **no** direction rules; the inventory in
`AGENTS.md` §9 still matches the shipped CSS exactly. One Arabic-specific risk to
watch in the user visual checklist: Arabic strings are often longer than their
English source, which can wrap buttons, menu items, badges and table headers.
If that is observed, measure the element first and scope a `[dir="rtl"]`-only
rule to the structural anchor (never a bare primitive class), then add it to the
§9 table. Do not pre-emptively shrink or truncate Arabic text globally.

