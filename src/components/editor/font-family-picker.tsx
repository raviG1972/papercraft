'use client';

import { useState, useRef, useCallback } from 'react';
import { type Editor } from '@tiptap/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCustomFontsStore } from '@/lib/custom-fonts-store';
import { Upload, X, ALargeSmall, Check } from 'lucide-react';

const BUILT_IN_FONTS = [
  { label: 'Default', value: 'sans', cssFont: 'sans-serif' },
  { label: 'Serif', value: 'serif', cssFont: 'Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: 'monospace', cssFont: '"Courier New", Courier, monospace' },
  { label: 'Georgia', value: 'Georgia', cssFont: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman"', cssFont: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New"', cssFont: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana', cssFont: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS"', cssFont: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS"', cssFont: '"Comic Sans MS", cursive' },
  { label: 'Impact', value: 'Impact', cssFont: 'Impact, Charcoal, sans-serif' },
];

interface FontFamilyPickerProps {
  editor: Editor | null;
}

export function FontFamilyPicker({ editor }: FontFamilyPickerProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fonts: customFonts, addFont, removeFont } = useCustomFontsStore();

  const allFonts = [
    ...BUILT_IN_FONTS.map((f) => ({ ...f, isCustom: false })),
    ...customFonts.map((f) => ({
      label: f.name,
      value: `"${f.family}"`,
      cssFont: `"${f.family}"`,
      isCustom: true,
      customId: f.id,
    })),
  ];

  const currentFamily = getCurrentFontFamily(editor);

  const handleSelectFont = useCallback(
    (value: string) => {
      if (!editor) return;
      editor.chain().focus().setFontFamily(value).run();
      setOpen(false);
    },
    [editor],
  );

  const handleRemoveCustomFont = useCallback(
    (e: React.MouseEvent, fontId: string) => {
      e.stopPropagation();
      e.preventDefault();
      removeFont(fontId);
    },
    [removeFont],
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        // Read the font file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Derive a font family name from the filename
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const familyName = baseName.replace(/[-_]/g, ' ').trim();

        // Create and register the FontFace
        const fontFace = new FontFace(familyName, arrayBuffer);
        const loadedFont = await fontFace.load();
        document.fonts.add(loadedFont);

        // Generate a unique ID
        const id = `custom-font-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        addFont({
          id,
          name: familyName,
          family: familyName,
          fontFace: loadedFont,
        });
      } catch (err) {
        console.error('Failed to load font:', err);
      } finally {
        setUploading(false);
        // Reset input so same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [addFont],
  );

  if (!editor) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-[110px] justify-start text-xs font-medium gap-1.5"
              >
                <ALargeSmall className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {allFonts.find((f) => f.value === currentFamily)?.label ?? 'Font'}
                </span>
              </Button>
            </PopoverTrigger>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Font Family
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-56 p-0" align="start">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Font Family</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {allFonts.length} fonts available
          </p>
        </div>

        <ScrollArea className="max-h-[280px]">
          {/* Built-in fonts */}
          <div className="py-1">
            {BUILT_IN_FONTS.map((font) => {
              const isActive = currentFamily === font.value;
              return (
                <button
                  key={font.value}
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left group"
                  onClick={() => handleSelectFont(font.value)}
                >
                  <span style={{ fontFamily: font.cssFont }} className="truncate flex-1">
                    {font.label}
                  </span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom fonts section */}
          {customFonts.length > 0 && (
            <>
              <Separator />
              <div className="py-1">
                <div className="px-3 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Custom Fonts ({customFonts.length})
                  </span>
                </div>
                {customFonts.map((font) => {
                  const value = `"${font.family}"`;
                  const isActive = currentFamily === value;
                  return (
                    <div
                      key={font.id}
                      className="flex items-center group"
                    >
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                        onClick={() => handleSelectFont(value)}
                      >
                        <span
                          style={{ fontFamily: `"${font.family}"` }}
                          className="truncate flex-1"
                        >
                          {font.name}
                        </span>
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="p-1 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                        onClick={(e) => handleRemoveCustomFont(e, font.id)}
                        title="Remove font"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </ScrollArea>

        {/* Upload section */}
        <Separator />
        <div className="p-2">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-colors disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span className="animate-pulse">Loading font...</span>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload Custom Font
              </>
            )}
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Supports .ttf, .otf, .woff, .woff2
          </p>
          <input
            ref={fileInputRef}
            type="font"
            accept=".ttf,.otf,.woff,.woff2"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Tries to detect the current font family from the editor selection.
 * Falls back to 'sans'.
 */
function getCurrentFontFamily(editor: Editor | null): string {
  if (!editor) return 'sans';
  const marks = editor.state.selection.$head.marks();
  const textStyleMark = marks.find((m) => m.type.name === 'textStyle');
  if (textStyleMark?.attrs?.fontFamily) {
    return textStyleMark.attrs.fontFamily;
  }
  return 'sans';
}