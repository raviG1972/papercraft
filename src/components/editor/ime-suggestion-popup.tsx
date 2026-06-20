'use client';

/* eslint-disable react-hooks/refs */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { getSuggestions, type Suggestion } from '@/lib/transliteration';
import type { TransliterationMode } from '@/lib/transliteration';

interface IMESuggestionPopupProps {
  composingText: string;
  mode: TransliterationMode;
  position: { top: number; left: number } | null;
  visible: boolean;
  onSelect: (suggestion: Suggestion) => void;
  onDismiss: () => void;
}

export function IMESuggestionPopup({
  composingText,
  mode,
  position,
  visible,
  onSelect,
  onDismiss,
}: IMESuggestionPopupProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(0);

  const suggestions = useMemo(() => {
    if (!visible || !composingText || mode === 'english' || mode === 'sinhala-wijesekara' || mode === 'tamil-typewriter') {
      return [];
    }
    return getSuggestions(composingText, mode as 'sinhala-singlish' | 'tamil-unicode');
  }, [composingText, mode, visible]);

  const scrollToItem = useCallback(() => {
    const el = listRef.current?.children[selectedIndexRef.current] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    selectedIndexRef.current = 0;
  }, [suggestions]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        selectedIndexRef.current = Math.min(selectedIndexRef.current + 1, suggestions.length - 1);
        scrollToItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        selectedIndexRef.current = Math.max(selectedIndexRef.current - 1, 0);
        scrollToItem();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(suggestions[selectedIndexRef.current]);
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (idx < suggestions.length) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(suggestions[idx]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }
    },
    [visible, suggestions, onSelect, onDismiss, scrollToItem],
  );

  // Listen for keyboard events at the document level
  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [visible, handleKeyDown]);
  if (!visible || !position || suggestions.length === 0) return null;

  return (
    <div
      className="fixed z-[100] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[200px] max-w-[350px] overflow-hidden"
      style={{ top: position.top + 4, left: Math.max(8, position.left) }}
    >
      {/* Preview of composing text */}
      <div className="px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-xs text-muted-foreground">
          Typing: <span className="font-mono text-foreground">{composingText}</span>
        </span>
      </div>

      {/* Suggestion list */}
      <div ref={listRef} className="max-h-[200px] overflow-y-auto">
        {suggestions.map((suggestion, idx) => (
          <button
            key={`${suggestion.text}-${idx}`}
            type="button"
            className={`w-full flex items-center gap-3 px-3 py-1.5 text-left transition-colors ${
              idx === selectedIndexRef.current
                ? 'bg-accent'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => {
              selectedIndexRef.current = idx;
            }}
          >
            {/* Number hint */}
            <span className="w-4 text-[10px] text-muted-foreground font-mono shrink-0">
              {idx < 9 ? idx + 1 : ''}
            </span>

            {/* The suggestion in the script */}
            <span className="text-base leading-tight flex-1">{suggestion.text}</span>

            {/* Optional label */}
            {suggestion.label && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {suggestion.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1 border-t border-border bg-muted/30">
        <p className="text-[10px] text-muted-foreground">
          <kbd className="px-0.5 border border-border rounded text-[9px]">↑↓</kbd> navigate
          <span className="mx-1">·</span>
          <kbd className="px-0.5 border border-border rounded text-[9px]">1-9</kbd> select
          <span className="mx-1">·</span>
          <kbd className="px-0.5 border border-border rounded text-[9px]">Space</kbd> accept
          <span className="mx-1">·</span>
          <kbd className="px-0.5 border border-border rounded text-[9px]">Esc</kbd> dismiss
        </p>
      </div>
    </div>
  );
}