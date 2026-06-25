'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import SuperscriptExtension from '@tiptap/extension-superscript';
import SubscriptExtension from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import { MathExtension } from './math-extension';
import { EditorToolbar } from './editor-toolbar';
import { MathTemplateDialog } from './math-template-dialog';
import { hasMathContent, hasInlineMathDelimiters, processMathInPastedHtml, extractTextFromHtml } from '@/lib/word-paste-utils';
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
      SuperscriptExtension,
      SubscriptExtension,
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
        const plainText = event.clipboardData?.getData('text/plain') || '';

        // ── Strategy 1: HTML with math content (OMML, MathML, KaTeX, MathJax, Word) ──
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
            // Fall through to plain text handling below
          }
        }

        // ── Strategy 2: HTML paste but plain text has $...$ math ──
        // This handles the case where the HTML version strips/loses the math
        // but the plain text version preserves the $...$ delimiters.
        if (html && plainText && hasInlineMathDelimiters(plainText)) {
          const htmlTextContent = extractTextFromHtml(html);
          const plainMathLen = (plainText.match(/\$[^$]+?\$/g) || []).join('').length;

          // If plain text has significant math content that HTML lost, use plain text
          if (plainMathLen > 20 && htmlTextContent.length < plainText.length * 0.6) {
            try {
              event.preventDefault();
              // Insert as plain paragraphs
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

        // ── Strategy 3: Let TipTap handle the paste normally ──
        return false;
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
            $math$ for inline · $$math$$ for display · paste from Word to convert
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