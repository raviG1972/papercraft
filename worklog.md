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
