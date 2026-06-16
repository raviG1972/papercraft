'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useState, useCallback } from 'react';
import { InlineMath, BlockMath } from './math-extension';
import { EditorToolbar } from './editor-toolbar';
import { MathTemplateDialog } from './math-template-dialog';
import { ImageInsertDialog } from './image-insert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Undo2, Redo2 } from 'lucide-react';

interface QuestionEditorProps {
  content?: string;
  onChange?: (content: string, html: string) => void;
  questionNumber?: number;
  maxMarks?: number;
  showHeader?: boolean;
}

export function QuestionEditor({
  content: initialContent,
  onChange,
  questionNumber = 1,
  maxMarks = 5,
  showHeader = true,
}: QuestionEditorProps) {
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: { depth: 100 },
      }),
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      TextStyle,
      Color,
      FontFamily,
      Placeholder.configure({
        placeholder: 'Start typing your question here... Use the toolbar to format text, insert images, or add math equations.',
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-border w-full',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2 min-w-[100px]',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-border p-2 bg-muted font-bold',
        },
      }),
      InlineMath,
      BlockMath,
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class:
          'question-editor-content prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (pos) {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({
                      src,
                      alt: file.name,
                    })
                  )
                );
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      if (onChange) {
        onChange(editor.getJSON() as unknown as string, editor.getHTML());
      }
    },
  });

  const handleInsertMath = useCallback(
    (latex: string, isBlock: boolean) => {
      if (!editor) return;
      if (isBlock) {
        editor.chain().focus().insertBlockMath(latex).run();
      } else {
        editor.chain().focus().insertInlineMath(latex).run();
      }
    },
    [editor]
  );

  const handleInsertImage = useCallback(
    (url: string, alt: string, width?: number, height?: number, floatClass?: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .setImage({
          src: url,
          alt,
          width,
          height,
          ...(floatClass ? { class: floatClass } : {}),
        })
        .run();
    },
    [editor]
  );

  return (
    <Card className="w-full border-border shadow-sm">
      {showHeader && (
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                {questionNumber}
              </div>
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Question {questionNumber}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Type your question with text, images, and math equations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-normal">
                {maxMarks} marks
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                {wordCount} words
              </Badge>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="border border-border rounded-xl mx-3 mb-3 overflow-hidden bg-background">
          <EditorToolbar
            editor={editor}
            onOpenMathDialog={() => setMathDialogOpen(true)}
            onOpenImageDialog={() => setImageDialogOpen(true)}
          />
          <EditorContent editor={editor} />
        </div>
      </CardContent>

      <MathTemplateDialog
        open={mathDialogOpen}
        onOpenChange={setMathDialogOpen}
        onInsert={handleInsertMath}
      />

      <ImageInsertDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={handleInsertImage}
      />
    </Card>
  );
}