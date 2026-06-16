'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import katex from 'katex';
import { Pencil, Check, X, Sigma } from 'lucide-react';

export function MathViewInline({ node, updateAttributes, editor }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.attrs.latex || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(node.attrs.latex || '\\placeholder', {
        displayMode: false,
        throwOnError: false,
        strict: false,
        macros: {
          '\\placeholder': '\\textcolor{#6b7280}{\\square}',
          '\\ph': '\\textcolor{#6b7280}{\\square}',
        },
      });
    } catch {
      return '<span class="text-destructive text-xs">Invalid</span>';
    }
  }, [node.attrs.latex]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: editValue });
    setIsEditing(false);
  }, [editValue, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
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
      <NodeViewWrapper as="span" className="inline-block align-middle">
        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded px-2 py-1 min-w-[120px]">
          <Sigma className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none font-mono min-w-[60px] text-foreground"
            placeholder="LaTeX..."
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="p-0.5 hover:bg-amber-200 rounded transition-colors"
          >
            <Check className="h-3.5 w-3.5 text-green-600" />
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setEditValue(node.attrs.latex || '');
              setIsEditing(false);
            }}
            className="p-0.5 hover:bg-amber-200 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="inline-block align-middle">
      <span
        className="group/inline-math relative inline-flex items-center gap-0.5 cursor-pointer px-1 py-0.5 rounded hover:bg-muted/50 transition-colors"
        onClick={() => {
          setEditValue(node.attrs.latex || '');
          setIsEditing(true);
        }}
        title="Click to edit equation"
      >
        <span
          className="inline-math-display"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/inline-math:opacity-100 transition-opacity shrink-0" />
      </span>
    </NodeViewWrapper>
  );
}