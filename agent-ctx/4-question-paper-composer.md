# Task 4: QuestionPaperComposer Component

## Summary
Created a comprehensive `QuestionPaperComposer` component that orchestrates the entire question paper creation experience.

## Files Created/Modified
- **Created**: `/home/z/my-project/src/components/editor/question-paper-composer.tsx` (~1350 lines)
- **Modified**: `/home/z/my-project/src/app/page.tsx` (updated to use the new component)

## Features Implemented

### 1. Paper Header Section (Collapsible)
- Editable Paper Title, Subject, Class/Grade, Duration, Maximum Marks
- Textarea for General Instructions
- Collapsible/expandable card with smooth animation
- Clean 3-column responsive grid layout

### 2. Question List with Drag & Drop
- Each question rendered using the existing `QuestionEditor` component
- Auto-calculated question numbers
- Editable marks input (numeric, clamped 0-100)
- Question type selector (MCQ, Short Answer, Long Answer, Essay, Fill in the Blanks)
- Type-specific color-coded badges
- Delete button with AlertDialog confirmation
- Duplicate question button (appears on hover)
- Drag to reorder using `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- Drag overlay with visual feedback

### 3. Add Question Button
- Prominent "Add Question" button at the bottom of the flat list
- "Add Question (Ungrouped)" button when in sections mode
- Per-section "Add Question to Section" button
- New questions default to appropriate marks based on type

### 4. Question Sections/Groups
- Toggle between Sections view and Flat List view
- Each section has: editable title, collapsible instructions textarea, question count/marks summary
- Auto-named sections (Section A, B, C...)
- Delete section with confirmation (also removes section questions)
- Ungrouped questions shown separately in sections mode
- "Add Section" button with dashed border style

### 5. Summary Panel
- Sticky sidebar on desktop (lg breakpoint), bottom panel on mobile
- Total questions count and total marks in large number display
- Marks allocation progress bar (color changes at 90%+)
- Breakdown by question type with color-coded badges
- Breakdown by section with per-section stats
- Ungrouped questions count in section view

## Technical Details
- `'use client'` directive
- React state (useState) for questions array, paper settings, and sections
- `uuid` for generating unique IDs
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop with pointer/keyboard sensors
- shadcn/ui components: Card, Button, Input, Label, Select, Badge, Separator, Collapsible, AlertDialog, ScrollArea, Textarea
- Lucide icons throughout
- Fully responsive (mobile-first design)
- TypeScript interfaces exported: `Question`, `Section`, `PaperSettings`, `QuestionType`
- Callback props for parent integration: `onSettingsChange`, `onQuestionsChange`, `onSectionsChange`

## Lint
- ESLint passes with no errors or warnings

## Dev Server
- App compiles and runs successfully on port 3000
- No hydration errors
