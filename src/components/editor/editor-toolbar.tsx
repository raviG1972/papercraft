'use client';

import { type Editor } from '@tiptap/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Sigma,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Highlighter,
  Quote,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Code,
  Palette,
  RemoveFormatting,
  TableProperties,
  Rows3,
  Columns3,
  Trash2,
  MergeIcon,
  SplitIcon,
  Plus,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  onOpenMathDialog: () => void;
  onOpenImageDialog: () => void;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  tooltip,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={isActive}
          onPressedChange={onClick}
          disabled={disabled}
          className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarSeparator() {
  return <Separator orientation="vertical" className="h-6 mx-1" />;
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const COLOR_SWATCHES = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#374151' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'White', value: '#FFFFFF' },
];

const FONT_FAMILIES = [
  { label: 'Default', value: 'sans' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
];

export function EditorToolbar({ editor, onOpenMathDialog, onOpenImageDialog }: EditorToolbarProps) {
  if (!editor) return null;

  const headingLevel = (() => {
    if (editor.isActive('heading', { level: 1 })) return '1';
    if (editor.isActive('heading', { level: 2 })) return '2';
    if (editor.isActive('heading', { level: 3 })) return '3';
    return 'p';
  })();

  const textAlign = (() => {
    if (editor.isActive({ textAlign: 'center' })) return 'center' as const;
    if (editor.isActive({ textAlign: 'right' })) return 'right' as const;
    if (editor.isActive({ textAlign: 'justify' })) return 'justify' as const;
    return 'left' as const;
  })();

  const currentFontSize = FONT_SIZES.find((size) =>
    editor.isActive('textStyle', { fontSize: `${size}px` }),
  );
  const currentFontFamily = FONT_FAMILIES.find((f) =>
    editor.isActive('textStyle', { fontFamily: f.value }),
  );

  const setFontSize = (size: number) => {
    editor
      .chain()
      .focus()
      .setMark('textStyle', { fontSize: `${size}px` })
      .run();
  };

  const setFontFamily = (family: string) => {
    editor.chain().focus().setFontFamily(family).run();
  };

  const setTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  const clearFormatting = () => {
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  const isInTable = editor.isActive('table');
  const canMergeCells = editor.can().mergeCells();
  const canSplitCell = editor.can().splitCell();

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30 rounded-t-xl">
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        tooltip="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        tooltip="Redo (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Block Type */}
      <Select
        value={headingLevel}
        onValueChange={(value) => {
          if (value === 'p') {
            editor.chain().focus().setParagraph().run();
          } else {
            editor
              .chain()
              .focus()
              .toggleHeading({ level: parseInt(value) as 1 | 2 | 3 })
              .run();
          }
        }}
      >
        <SelectTrigger className="h-8 w-[110px] text-xs font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p">
            <span className="flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" /> Normal
            </span>
          </SelectItem>
          <SelectItem value="1">
            <span className="flex items-center gap-1.5">
              <Heading1 className="h-3.5 w-3.5" /> Heading 1
            </span>
          </SelectItem>
          <SelectItem value="2">
            <span className="flex items-center gap-1.5">
              <Heading2 className="h-3.5 w-3.5" /> Heading 2
            </span>
          </SelectItem>
          <SelectItem value="3">
            <span className="flex items-center gap-1.5">
              <Heading3 className="h-3.5 w-3.5" /> Heading 3
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <ToolbarSeparator />

      {/* Font Family Selector */}
      <Select
        value={currentFontFamily?.value ?? 'sans'}
        onValueChange={setFontFamily}
      >
        <SelectTrigger className="h-8 w-[110px] text-xs font-medium">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <span style={{ fontFamily: font.value === 'sans' ? 'sans-serif' : font.value }} className="text-xs">
                {font.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size Selector */}
      <Select
        value={currentFontSize ? String(currentFontSize) : '14'}
        onValueChange={(value) => setFontSize(Number(value))}
      >
        <SelectTrigger className="h-8 w-[72px] text-xs font-medium">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              <span className="text-xs">{size}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToolbarSeparator />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        tooltip="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        tooltip="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        tooltip="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        tooltip="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive('superscript')}
        tooltip="Superscript"
      >
        <Superscript className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive('subscript')}
        tooltip="Subscript"
      >
        <Subscript className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        tooltip="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        tooltip="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Text Color Picker */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Text Color
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-7 gap-1.5">
            {COLOR_SWATCHES.map((color) => (
              <Tooltip key={color.value}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    style={{ backgroundColor: color.value }}
                    onClick={() => setTextColor(color.value)}
                    aria-label={color.name}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {color.name}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarSeparator />

      {/* Text Align */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={textAlign === 'left'}
        tooltip="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={textAlign === 'center'}
        tooltip="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={textAlign === 'right'}
        tooltip="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={textAlign === 'justify'}
        tooltip="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        tooltip="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        tooltip="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        tooltip="Block Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        tooltip="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Table Insert & Operations */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insert Table
        </TooltipContent>
      </Tooltip>

      {/* Table Operations Popover */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent"
                  disabled={!isInTable}
                >
                  <TableProperties className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Table Operations
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-52 p-1" align="start">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left"
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row Before
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Row After
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Column Before
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Column After
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left text-destructive"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              <Rows3 className="h-3.5 w-3.5" />
              Delete Row
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left text-destructive"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Delete Column
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left text-destructive"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Table
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left"
              disabled={!canMergeCells}
              onClick={() => editor.chain().focus().mergeCells().run()}
            >
              <MergeIcon className="h-3.5 w-3.5" />
              Merge Cells
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors w-full text-left"
              disabled={!canSplitCell}
              onClick={() => editor.chain().focus().splitCell().run()}
            >
              <SplitIcon className="h-3.5 w-3.5" />
              Split Cell
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarSeparator />

      {/* Clear Formatting */}
      <ToolbarButton
        onClick={clearFormatting}
        tooltip="Clear Formatting"
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Math & Images */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            onClick={onOpenMathDialog}
          >
            <Sigma className="h-4 w-4 mr-1" />
            <span className="text-xs font-medium hidden sm:inline">Math</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insert Math Equation
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 hover:bg-accent"
            onClick={onOpenImageDialog}
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            <span className="text-xs font-medium hidden sm:inline">Image</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insert Image
        </TooltipContent>
      </Tooltip>
    </div>
  );
}