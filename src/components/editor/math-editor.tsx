'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import SuperscriptExtension from '@tiptap/extension-superscript';
import SubscriptExtension from '@tiptap/extension-subscript';
import { MathExtension } from './math-extension';
import { DOMParser as ProseDOMParser } from 'prosemirror-model';
import { hasMathContent, hasInlineMathDelimiters, processMathInPastedHtml, extractTextFromHtml } from '@/lib/word-paste-utils';
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
import { MathTemplateDialog } from './math-template-dialog';
import { useState, useEffect, useRef, useCallback } from 'react';

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

// ─── MathEditor Component ─────────────────────────────────────────

interface MathEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * Rich text editor with KaTeX math support.
 *
 * - Click Σ to open template picker (inline mode)
 * - Click □ to open template picker (block mode)
 * - Type `$formula$` for inline math (auto-converts on closing $)
 * - Type `$$formula$$` for display math (auto-converts)
 * - Click on any math to edit the LaTeX source
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
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [mathDialogDefaultMode, setMathDialogDefaultMode] = useState<'inline' | 'block'>('inline');

  const openMathDialog = useCallback((mode: 'inline' | 'block') => {
    setMathDialogDefaultMode(mode);
    setMathDialogOpen(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        inputRules: false,
        underline: false,
      }),
      UnderlineExtension,
      SuperscriptExtension,
      SubscriptExtension,
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
        const plainText = event.clipboardData?.getData('text/plain') || '';

        // Strategy 1: HTML with math content (OMML, MathML, KaTeX, MathJax, Word)
        if (html && hasMathContent(html)) {
          try {
            event.preventDefault();
            const processedHtml = processMathInPastedHtml(html);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = processedHtml;
            const parser = ProseDOMParser.fromSchema(view.state.schema);
            const slice = parser.parseSlice(wrapper);
            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr);
            return true;
          } catch (err) {
            console.error('[PaperCraft] Math paste processing failed:', err);
          }
        }

        // Strategy 2: HTML paste but plain text has $...$ math
        if (html && plainText && hasInlineMathDelimiters(plainText)) {
          const htmlTextContent = extractTextFromHtml(html);
          const plainMathLen = (plainText.match(/\$[^$]+?\$/g) || []).join('').length;
          if (plainMathLen > 20 && htmlTextContent.length < plainText.length * 0.6) {
            try {
              event.preventDefault();
              const paragraphs = plainText.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
              const wrapper = document.createElement('div');
              wrapper.innerHTML = paragraphs;
              const parser = ProseDOMParser.fromSchema(view.state.schema);
              const slice = parser.parseSlice(wrapper);
              const tr = view.state.tr.replaceSelection(slice);
              view.dispatch(tr);
              return true;
            } catch (err) {
              console.error('[PaperCraft] Plain text paste fallback failed:', err);
            }
          }
        }

        return false;
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

  const handleTemplateInsert = useCallback(
    (latex: string, isBlock: boolean) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'math',
          attrs: { latex, displayMode: isBlock },
        })
        .run();
    },
    [editor]
  );

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
          onClick={() => openMathDialog('inline')}
          title="Insert inline math (Σ) — opens template picker"
        >
          <Sigma className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => openMathDialog('block')}
          title="Insert display math (□) — opens template picker"
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
          Click math to edit · $...$ inline · $$...$$ display
        </span>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Math template picker dialog */}
      <MathTemplateDialog
        open={mathDialogOpen}
        onOpenChange={setMathDialogOpen}
        onInsert={handleTemplateInsert}
        defaultMode={mathDialogDefaultMode}
      />
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