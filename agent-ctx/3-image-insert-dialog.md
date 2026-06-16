# Task 3 — Enhance Image Insert Dialog with Alignment/Float Controls

## Summary
Added image alignment / word wrap controls to the image insert dialog, allowing users to choose how inserted images interact with surrounding text. Updated the `onInsert` callback signature and the consuming `question-editor.tsx` to propagate the float CSS class.

## Files Modified

### `src/components/editor/image-insert-dialog.tsx` (rewritten)
- **Updated `onInsert` callback type** to accept an optional 5th parameter `floatClass?: string`
- **Added alignment ToggleGroup** using shadcn `ToggleGroup` / `ToggleGroupItem` with 4 options:
  - **Inline** (`_inline` → no class) — default, image sits inline with text
  - **Float Left** (`float-left`) — image floats left, text wraps right
  - **Float Right** (`float-right`) — image floats right, text wraps left
  - **Center Block** (`center-block`) — image centered as block element
- Used Lucide icons: `AlignJustify` (inline), `AlignLeft`, `AlignRight`, `AlignCenter`
- Each option has a `Tooltip` with a description for clarity
- Label text hidden on mobile (`hidden sm:inline`) for responsive design
- Internal state uses `FloatToggle` type with `'_inline'` sentinel value (avoids empty-string issues with Radix ToggleGroup)
- On insert/close, `'_inline'` maps to `undefined` so no extra class is added for the default
- All existing functionality preserved: drag-drop, URL input, preview, alt text, dimensions

### `src/components/editor/question-editor.tsx` (edited)
- Updated `handleInsertImage` signature to accept `floatClass?: string`
- When `floatClass` is provided, passes `{ class: floatClass }` to `editor.chain().focus().setImage(...)`

## Lint & Build
- `bun run lint` — passed with no errors
- Dev server compiled successfully after changes