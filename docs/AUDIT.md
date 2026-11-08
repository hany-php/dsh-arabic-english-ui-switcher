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
