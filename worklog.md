---
Task ID: 1
Agent: Main
Task: Fix OCR, math toolbar buttons, and add version number

Work Log:
- Cloned GitHub repo to /tmp to get full codebase (local was stripped down)
- Identified OCR root cause: gemma-4-31b-it is text-only, cannot process images
- Fixed client-vlm.ts and ai-ocr/route.ts: changed model to gemini-2.0-flash for vision
- Removed responseMimeType from client-llm.ts and llm.ts (not supported by gemma)
- Updated version to v1.1 in page.tsx header
- Pushed OCR fix (commit 9ca6225)

- Analyzed math toolbar buttons in math-editor.tsx (used by paper scanner)
- Found Sigma (Σ) and Square (□) buttons only inserted hardcoded formulas
- Found math-extension.tsx required double-click to edit (unintuitive)
- Found conflicting math-extension.ts (old ReactNodeViewRenderer version)
- Fixed: buttons now open Math Template Dialog with 80+ templates
- Fixed: single-click to edit math nodes
- Added defaultMode prop to MathTemplateDialog
- Deleted old math-extension.ts and unused view components
- Pushed math fix (commit fbdd736)

Stage Summary:
- OCR: gemma-4-31b-it → gemini-2.0-flash for vision tasks
- Math buttons: now open template picker dialog (Σ=inline, □=block)
- Math editing: single-click instead of double-click
- Cleaned up: deleted 3 unused/conflicting files
- All changes pushed to GitHub for Vercel auto-deploy

---
Task ID: 2
Agent: main
Task: Fix math equation paste not working (round 2 - KaTeX/MathJax rendered HTML)

Work Log:
- Analyzed user's uploaded screenshots: source had LaTeX equations like $(1+x)^n = ...$ but result showed only plain text "Rathnapura district value" / "Colombo district value:" — equations completely stripped
- Root cause: `hasWordMathContent()` only detected OMML/MathML/Word markers, NOT KaTeX or MathJax rendered HTML. When pasting from a page with rendered math (KaTeX/MathJax spans), the detection returned false, default TipTap parser ran, and complex math HTML was stripped by ProseMirror's schema parser
- Created shared module `src/lib/word-paste-utils.ts` with:
  - `hasMathContent()` — expanded detection: OMML, MathML, KaTeX classes, MathJax classes, Unicode math chars, Word markers
  - `processKatexSimple()` — extracts MathML from `.katex-mathml` child spans, converts to LaTeX, falls back to text content extraction
  - `processMathJaxHtml()` — handles `<mjx-container>` elements, extracts MathML, converts to LaTeX
  - Fixed `cleanWordHtml()` empty span regex: `/<span(?![^>]*data-math-node)[^>]*>\s*<\/span>/gi` — no longer removes math spans
  - `hasInlineMathDelimiters()` — detects $...$ patterns in plain text
  - `extractTextFromHtml()` — gets text content from HTML for comparison
  - Fallback strategy: if plain text has $...$ math but HTML loses significant content, uses plain text instead
- Updated `question-editor-core.tsx`: uses shared module, added Superscript/Subscript extensions, 3-strategy paste handler
- Updated `math-editor.tsx`: uses shared module, added Superscript/Subscript extensions, same 3-strategy paste handler, removed ~160 lines of duplicate code
- Added `allowedDevOrigins` to next.config.ts for cross-origin dev access
- Verified: lint clean, page loads, no console errors, server stable

Stage Summary:
- Created: `src/lib/word-paste-utils.ts` (303 lines — comprehensive paste handling)
- Modified: `src/components/editor/question-editor-core.tsx` (uses shared utils, 3-strategy paste)
- Modified: `src/components/editor/math-editor.tsx` (uses shared utils, removed duplicates, 3-strategy paste)
- Modified: `next.config.ts` (added allowedDevOrigins)
