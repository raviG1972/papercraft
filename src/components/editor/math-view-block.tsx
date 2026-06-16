'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import katex from 'katex';
import { Pencil, Check, X, Sigma } from 'lucide-react';

export function MathViewBlock({ node, updateAttributes, deleteNode, editor }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.attrs.latex || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(node.attrs.latex || '\\placeholder', {
        displayMode: true,
        throwOnError: false,
        strict: false,
        macros: {
          '\\placeholder': '\\textcolor{#6b7280}{\\square}',
          '\\ph': '\\textcolor{#6b7280}{\\square}',
        },
      });
    } catch {
      return '<span class="text-destructive text-xs">Invalid LaTeX</span>';
    }
  }, [node.attrs.latex]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: editValue });
    setIsEditing(false);
  }, [editValue, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setEditValue(node.attrs.latex || '');
        setIsEditing(false);
      }
    },
    [handleSave, node.attrs.latex]
  );

  if (isEditing) {
    return (
      <NodeViewWrapper>
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 my-3">
          <div className="flex items-center gap-2 mb-3">
            <Sigma className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Edit Equation
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-white border border-amber-200 rounded-md p-3 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-400 resize-y min-h-[60px] text-foreground"
            placeholder="Enter LaTeX expression..."
            rows={2}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              Enter to save, Esc to cancel
            </span>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Check className="h-3 w-3" /> Save
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setEditValue(node.attrs.latex || '');
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              {deleteNode && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    deleteNode();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors ml-1"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        className="group/block-math relative flex flex-col items-center py-3 my-2 cursor-pointer rounded-lg hover:bg-muted/30 transition-colors"
        onClick={() => {
          setEditValue(node.attrs.latex || '');
          setIsEditing(true);
        }}
        title="Click to edit equation"
      >
        <div
          className="block-math-display text-center"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
        <div className="absolute top-1 right-1 opacity-0 group-hover/block-math:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md text-xs text-muted-foreground">
            <Pencil className="h-3 w-3" />
            Edit
          </span>
        </div>
      </div>
    </NodeViewWrapper>
  );
}