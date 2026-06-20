'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { MathExtension, ommlToLatex, ommlTextToLatex, mathmlToLatex } from './math-extension';
import { DOMParser as ProseDOMParser } from 'prosemirror-model';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Undo2,
  Redo2,
  Square,
  Sigma,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

// ─── Toolbar Button (declared outside component) ─────────────────

function ToolbarButton({ active, onClick, title, children, disabled }: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-7 w-7 p-0 ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

// ─── KaTeX CSS (injected once into <head>) ────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('katex-css')) {
  const link = document.createElement('link');
  link.id = 'katex-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  document.head.appendChild(link);
}

// ─── Attribute escaping for HTML ──────────────────────────────────

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

// ─── Word HTML cleanup ───────────────────────────────────────────

/**
 * Strip MS Word–specific markup from pasted HTML while preserving
 * basic formatting (bold, italic, underline, lists, headings).
 *
 * IMPORTANT: This does NOT strip <m:oMath> or <math> tags —
 * those are handled BEFORE calling this function.
 */
function cleanWordHtml(html: string): string {
  let clean = html;

  // Remove conditional comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');

  // Remove XML namespace declarations
  clean = clean.replace(/xmlns[:\w]*="[^"]*"/g, '');

  // Remove <style> blocks
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove <meta>, <link>, <?xml> tags
  clean = clean.replace(/<(?:meta|link|\?xml)[^>]*>/gi, '');

  // Remove v: and o: namespace elements (Word shapes, drawing, office markup)
  // BUT keep m: namespace elements — they're handled separately before cleanup
  clean = clean.replace(/<\/?(?:v|o|w):[^>]*>/gi, '');

  // Now remove any remaining m: elements that are NOT oMath/oMathPara
  // (e.g., m:rPr, m:fPr, etc. that might have been left over)
  clean = clean.replace(/<\/?m:(?!oMath)[^>]*>/gi, '');

  // Clean style attributes: remove mso-* properties, keep the rest
  clean = clean.replace(/style="([^"]*)"/gi, (_: string, styles: string) => {
    const cleaned = styles
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s && !/\bmso-/i.test(s))
      .join('; ')
      .trim();
    return cleaned ? `style="${cleaned}"` : '';
  });

  // Clean class attributes: remove Mso* classes, keep the rest
  clean = clean.replace(/class="([^"]*)"/gi, (_: string, cls: string) => {
    const cleaned = cls
      .split(/\s+/)
      .filter((c: string) => !/^Mso/i.test(c) && !/^mso/i.test(c))
      .join(' ')
      .trim();
    return cleaned ? `class="${cleaned}"` : '';
  });

  // Remove empty <span> tags
  clean = clean.replace(/<span[^>]*>\s*<\/span>/gi, '');

  // Remove empty style/class attributes left behind
  clean = clean.replace(/\s*(style|class)=""/gi, '');

  return clean;
}

// ─── Math detection helpers ───────────────────────────────────────

/**
 * Check if HTML contains MS Word math content (OMML or MathML).
 */
function hasWordMathContent(html: string): boolean {
  // OMML (Office Math Markup Language) — used by desktop MS Word
  if (/<m:oMath[\s>\/]/i.test(html)) return true;
  if (/oMathPara/i.test(html)) return true;

  // MathML — used by some Word versions, Google Docs, browsers
  if (/<math[\s>\/]/i.test(html) && /<\/math\s*>/i.test(html)) return true;

  // Word-specific markers (even without detectable math, Word HTML
  // needs cleaning to avoid garbage styles)
  if (/mso-/i.test(html)) return true;
  if (/xmlns:o\s*=/i.test(html)) return true;
  if (/class="Mso/i.test(html)) return true;

  return false;
}

// ─── Process equations in pasted HTML (single-pass) ──────────────

/**
 * Process pasted HTML from MS Word (or other sources) that may contain
 * mathematical equations in OMML or MathML format.
 *
 * Strategy:
 * 1. Replace OMML display equations (oMathPara) with <span data-math-node>
 * 2. Replace OMML inline equations (oMath) with <span data-math-node>
 * 3. Replace MathML equations (<math>) with <span data-math-node>
 * 4. Clean remaining Word HTML
 *
 * Uses single-pass regex replacement with callbacks — no fragile
 * index-matching between extraction and replacement.
 */
function processMathInPastedHtml(html: string): string {
  let processed = html;

  // ── Step 1: Replace OMML display equations (oMathPara) ──
  processed = processed.replace(
    /<m:oMathPara[^>]*>([\s\S]*?)<\/m:oMathPara>/gi,
    (match) => {
      const latex = ommlToLatex(match);
      // Fallback to plain text if conversion produces nothing useful
      const finalLatex = latex.trim() || ommlTextToLatex(match).trim();
      if (!finalLatex) return ''; // Remove empty equations
      return `<span data-math-node data-latex="${escapeAttr(finalLatex)}" data-display-mode="true"></span>`;
    }
  );

  // ── Step 2: Replace OMML inline equations (oMath) ──
  // Only match oMath that weren't inside oMathPara (already replaced)
  processed = processed.replace(
    /<m:oMath[^>]*>([\s\S]*?)<\/m:oMath>/gi,
    (match) => {
      const latex = ommlToLatex(match);
      const finalLatex = latex.trim() || ommlTextToLatex(match).trim();
      if (!finalLatex) return '';
      return `<span data-math-node data-latex="${escapeAttr(finalLatex)}" data-display-mode="false"></span>`;
    }
  );

  // ── Step 3: Replace MathML equations (<math>...</math>) ──
  processed = processed.replace(
    /<math[^>]*>([\s\S]*?)<\/math>/gi,
    (match) => {
      const latex = mathmlToLatex(match);
      if (!latex.trim()) return match; // Keep original if conversion fails
      // Detect display mode from MathML display attribute
      const isDisplay = /display\s*=\s*["']?\s*block/i.test(match);
      return `<span data-math-node data-latex="${escapeAttr(latex.trim())}" data-display-mode="${isDisplay}"></span>`;
    }
  );

  // ── Step 4: Handle legacy <math-node> tags (from editor's own output) ──
  // These are already in the correct format — just ensure they survive cleaning

  // ── Step 5: Clean remaining Word HTML ──
  processed = cleanWordHtml(processed);

  return processed;
}

// ─── MathEditor Component ─────────────────────────────────────────

interface MathEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * Insert a math node at the current cursor position.
 */
function insertMath(editor: Editor, displayMode = false) {
  const placeholder = displayMode
    ? '\\frac{a}{b}'
    : 'x^2';

  editor
    .chain()
    .focus()
    .insertContent({
      type: 'math',
      attrs: { latex: placeholder, displayMode },
    })
    .run();
}

/**
 * Rich text editor with KaTeX math support.
 *
 * - Type `$formula$` for inline math (auto-converts on closing $)
 * - Type `$$formula$$` for display math (auto-converts)
 * - Use the Σ / □ toolbar buttons to insert a math block
 * - Double-click rendered math to edit the LaTeX source
 * - Paste from MS Word — text formatting preserved, equations auto-detected
 *   (supports both OMML and MathML formats)
 */
export function MathEditor({
  content,
  onChange,
  placeholder = 'Type your question here…\n\nUse $...$ for inline math: e.g. $x^2 + y^2$\nUse $$...$$ for display math:\n$$\\frac{a}{b} + c$$\n\nYou can also paste directly from MS Word!',
  minHeight = 'min-h-[180px]',
}: MathEditorProps) {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        inputRules: false,
        underline: false,
      }),
      UnderlineExtension,
      Placeholder.configure({
        placeholder,
      }),
      MathExtension,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2 ${minHeight} overflow-y-auto`,
      },

      /**
       * Handle paste events with full control.
       *
       * For Word content (OMML/MathML), we:
       * 1. Intercept the raw clipboard HTML
       * 2. Convert equations to <span data-math-node> tags
       * 3. Clean Word-specific junk
       * 4. Parse and insert using ProseMirror's DOMParser
       *
       * For non-Word content, we let the default handler work.
       */
      handlePaste: (view, event) => {
        const html = event.clipboardData?.getData('text/html');
        if (!html) return false; // Let default handle plain text paste

        // Only process content that contains Word/math markup
        if (!hasWordMathContent(html)) return false;

        try {
          event.preventDefault();

          // Process equations and clean Word HTML
          const processedHtml = processMathInPastedHtml(html);

          // Parse the processed HTML into a ProseMirror slice
          const wrapper = document.createElement('div');
          wrapper.innerHTML = processedHtml;

          const parser = ProseDOMParser.fromSchema(view.state.schema);
          const slice = parser.parseSlice(wrapper);

          // Insert the parsed content at the current selection
          const tr = view.state.tr.replaceSelection(slice);
          view.dispatch(tr);

          return true; // We handled the paste
        } catch (err) {
          console.error('[PaperCraft] Paste processing failed, falling back to default:', err);
          return false; // Let default handle it
        }
      },
    },
    onUpdate: ({ editor }) => {
      if (isInternalUpdate.current) return;
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
    },
    immediatelyRender: false,
  });

  // Sync external content changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const currentHtml = editor.getHTML();
    if (content !== currentHtml) {
      isInternalUpdate.current = true;
      editor.commands.setContent(content);
      isInternalUpdate.current = false;
    }
  }, [content, editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b bg-muted/30 flex-wrap">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          title="Superscript"
        >
          <Superscript className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          title="Subscript"
        >
          <Subscript className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          onClick={() => insertMath(editor, false)}
          title="Insert inline math (Σ)"
        >
          <Sigma className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => insertMath(editor, true)}
          title="Insert display math (□)"
        >
          <Square className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo (Ctrl+Y)"
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="flex-1" />

        <span className="text-[10px] text-muted-foreground px-1 hidden sm:inline">
          $math$ for inline · $$math$$ for display · double-click to edit
        </span>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Utility: convert editor HTML to plain text with LaTeX ────────

/**
 * Convert editor HTML to a plain text representation with LaTeX preserved.
 * Math nodes render as $latex$ or $$latex$$ in the output.
 */
export function editorHtmlToPlainText(html: string): string {
  if (!html) return '';
  let text = html;

  // Display math (try both attribute orderings)
  text = text.replace(
    /<math-node[^>]*displaymode="true"[^>]*latex="([^"]*)"[^>]*><\/math-node>/gi,
    '$$\n$1\n$$'
  );
  text = text.replace(
    /<math-node[^>]*latex="([^"]*)"[^>]*displaymode="true"[^>]*><\/math-node>/gi,
    '$$\n$1\n$$'
  );

  // Inline math (try both attribute orderings)
  text = text.replace(
    /<math-node[^>]*displaymode="false"[^>]*latex="([^"]*)"[^>]*><\/math-node>/gi,
    '$$$1$$'
  );
  text = text.replace(
    /<math-node[^>]*latex="([^"]*)"[^>]*displaymode="false"[^>]*><\/math-node>/gi,
    '$$$1$$'
  );
  // Fallback: any remaining math-node with just latex
  text = text.replace(
    /<math-node[^>]*latex="([^"]*)"[^>]*><\/math-node>/gi,
    '$$$1$$'
  );

  // Also handle span[data-math-node] from paste processing
  text = text.replace(
    /<span[^>]*data-math-node[^>]*data-display-mode="true"[^>]*data-latex="([^"]*)"[^>]*><\/span>/gi,
    '$$\n$1\n$$'
  );
  text = text.replace(
    /<span[^>]*data-math-node[^>]*data-latex="([^"]*)"[^>]*data-display-mode="true"[^>]*><\/span>/gi,
    '$$\n$1\n$$'
  );
  text = text.replace(
    /<span[^>]*data-math-node[^>]*data-display-mode="false"[^>]*data-latex="([^"]*)"[^>]*><\/span>/gi,
    '$$$1$$'
  );
  text = text.replace(
    /<span[^>]*data-math-node[^>]*data-latex="([^"]*)"[^>]*><\/span>/gi,
    '$$$1$$'
  );

  // Clean remaining HTML
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<p>/gi, '');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}