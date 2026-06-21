'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { MathExtension, ommlToLatex, ommlTextToLatex, mathmlToLatex } from './math-extension';
import { EditorToolbar } from './editor-toolbar';
import { MathTemplateDialog } from './math-template-dialog';
import { DOMParser as ProseDOMParser } from 'prosemirror-model';
import { useEffect, useRef, useState, useCallback } from 'react';

// ─── KaTeX CSS (injected once into <head>) ──────────────────────────

if (typeof document !== 'undefined' && !document.getElementById('katex-css')) {
  const link = document.createElement('link');
  link.id = 'katex-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  document.head.appendChild(link);
}

// ─── Props ───────────────────────────────────────────────────────────

interface QuestionEditorCoreProps {
  content: string;
  questionNumber?: number;
  maxMarks?: number;
  showHeader?: boolean;
  onChange?: (content: string, html: string) => void;
}

// ─── Attribute escaping for HTML ───────────────────────────────────

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

// ─── Word HTML cleanup ──────────────────────────────────────────────

function cleanWordHtml(html: string): string {
  let clean = html;

  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  clean = clean.replace(/xmlns[:\w]*="[^"]*"/g, '');
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<(?:meta|link|\?xml)[^>]*>/gi, '');
  clean = clean.replace(/<\/?(?:v|o|w):[^>]*>/gi, '');
  clean = clean.replace(/<\/?m:(?!oMath)[^>]*>/gi, '');

  clean = clean.replace(/style="([^"]*)"/gi, (_: string, styles: string) => {
    const cleaned = styles
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s && !/\bmso-/i.test(s))
      .join('; ')
      .trim();
    return cleaned ? `style="${cleaned}"` : '';
  });

  clean = clean.replace(/class="([^"]*)"/gi, (_: string, cls: string) => {
    const cleaned = cls
      .split(/\s+/)
      .filter((c: string) => !/^Mso/i.test(c) && !/^mso/i.test(c))
      .join(' ')
      .trim();
    return cleaned ? `class="${cleaned}"` : '';
  });

  clean = clean.replace(/<span[^>]*>\s*<\/span>/gi, '');
  clean = clean.replace(/\s*(style|class)=""/gi, '');

  return clean;
}

// ─── Math detection helpers ─────────────────────────────────────────

function hasWordMathContent(html: string): boolean {
  if (/<m:oMath[\s>\/]/i.test(html)) return true;
  if (/oMathPara/i.test(html)) return true;
  if (/<math[\s>\/]/i.test(html) && /<\/math\s*>/i.test(html)) return true;
  if (/mso-/i.test(html)) return true;
  if (/xmlns:o\s*=/i.test(html)) return true;
  if (/class="Mso/i.test(html)) return true;
  return false;
}

// ─── Process equations in pasted HTML (single-pass) ──────────────────

function processMathInPastedHtml(html: string): string {
  let processed = html;

  // Replace OMML display equations (oMathPara)
  processed = processed.replace(
    /<m:oMathPara[^>]*>([\s\S]*?)<\/m:oMathPara>/gi,
    (match) => {
      const latex = ommlToLatex(match);
      const finalLatex = latex.trim() || ommlTextToLatex(match).trim();
      if (!finalLatex) return '';
      return `<span data-math-node data-latex="${escapeAttr(finalLatex)}" data-display-mode="true"></span>`;
    }
  );

  // Replace OMML inline equations (oMath)
  processed = processed.replace(
    /<m:oMath[^>]*>([\s\S]*?)<\/m:oMath>/gi,
    (match) => {
      const latex = ommlToLatex(match);
      const finalLatex = latex.trim() || ommlTextToLatex(match).trim();
      if (!finalLatex) return '';
      return `<span data-math-node data-latex="${escapeAttr(finalLatex)}" data-display-mode="false"></span>`;
    }
  );

  // Replace MathML equations
  processed = processed.replace(
    /<math[^>]*>([\s\S]*?)<\/math>/gi,
    (match) => {
      const latex = mathmlToLatex(match);
      if (!latex.trim()) return match;
      const isDisplay = /display\s*=\s*["']?\s*block/i.test(match);
      return `<span data-math-node data-latex="${escapeAttr(latex.trim())}" data-display-mode="${isDisplay}"></span>`;
    }
  );

  // Clean remaining Word HTML
  processed = cleanWordHtml(processed);

  return processed;
}

// ─── QuestionEditorCore Component ─────────────────────────────────────

export default function QuestionEditorCore({
  content,
  questionNumber,
  maxMarks,
  showHeader = true,
  onChange,
}: QuestionEditorCoreProps) {
  const isInternalUpdate = useRef(false);
  const [mathDialogOpen, setMathDialogOpen] = useState(false);

  const handleOpenMathDialog = useCallback(() => {
    setMathDialogOpen(true);
  }, []);

  const handleOpenImageDialog = useCallback(() => {
    // Image dialog — not implemented for question editor
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        inputRules: false,
        underline: false,
      }),
      UnderlineExtension,
      Placeholder.configure({
        placeholder: 'Type your question here…\n\nUse $...$ for inline math: e.g. $x^2 + y^2$\nUse $$...$$ for display math:\n$$\\frac{a}{b} + c$$\n\nYou can also paste directly from MS Word!',
      }),
      MathExtension,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2 min-h-[120px] overflow-y-auto',
      },

      handlePaste: (view, event) => {
        const html = event.clipboardData?.getData('text/html');
        if (!html) return false;

        if (!hasWordMathContent(html)) return false;

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
          console.error('[PaperCraft] Paste processing failed, falling back to default:', err);
          return false;
        }
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isInternalUpdate.current) return;
      const text = ed.getText();
      const html = ed.getHTML();
      onChange?.(text, html);
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

  // Handle template insert — focus editor and insert math node
  const handleTemplateInsert = useCallback(
    (latex: string, displayMode: boolean) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'math',
          attrs: { latex, displayMode },
        })
        .run();
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="p-4">
      {showHeader && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionNumber}
          </span>
          {maxMarks != null && (
            <span className="text-xs text-muted-foreground">{maxMarks} marks</span>
          )}
        </div>
      )}

      {/* Editor wrapper */}
      <div className="border rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring">
        {/* Toolbar */}
        <EditorToolbar
          editor={editor}
          onOpenMathDialog={handleOpenMathDialog}
          onOpenImageDialog={handleOpenImageDialog}
        />

        {/* Editor content area */}
        <EditorContent editor={editor} />

        {/* Hint */}
        <div className="px-3 py-1.5 border-t border-border bg-muted/20">
          <span className="text-[10px] text-muted-foreground">
            $math$ for inline · $$math$$ for display · click to edit
          </span>
        </div>
      </div>

      {/* Math template picker dialog */}
      <MathTemplateDialog
        open={mathDialogOpen}
        onOpenChange={setMathDialogOpen}
        onInsert={handleTemplateInsert}
      />
    </div>
  );
}
