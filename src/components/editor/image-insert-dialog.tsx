'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ImageIcon, Upload, X, AlignJustify, AlignLeft, AlignRight, AlignCenter } from 'lucide-react';

type FloatToggle = '_inline' | 'float-left' | 'float-right' | 'center-block';

const floatOptions: {
  value: FloatToggle;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}[] = [
  { value: '_inline', label: 'Inline', icon: AlignJustify, description: 'Image sits inline with text' },
  { value: 'float-left', label: 'Float Left', icon: AlignLeft, description: 'Image floats left, text wraps right' },
  { value: 'float-right', label: 'Float Right', icon: AlignRight, description: 'Image floats right, text wraps left' },
  { value: 'center-block', label: 'Center', icon: AlignCenter, description: 'Image centered as a block element' },
];

interface ImageInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string, alt: string, width?: number, height?: number, floatClass?: string) => void;
}

export function ImageInsertDialog({ open, onOpenChange, onInsert }: ImageInsertDialogProps) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [floatToggle, setFloatToggle] = useState<FloatToggle>('_inline');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInsert = () => {
    if (!url.trim()) return;
    onInsert(
      url.trim(),
      alt.trim() || 'Image',
      width ? parseInt(width) : undefined,
      height ? parseInt(height) : undefined,
      floatToggle === '_inline' ? undefined : floatToggle
    );
    setUrl('');
    setAlt('');
    setWidth('');
    setHeight('');
    setPreviewError(false);
    setFloatToggle('_inline');
    onOpenChange(false);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUrl(dataUrl);
      setAlt(file.name.replace(/\.[^/.]+$/, ''));
      setPreviewError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPreviewError(false);
          setFloatToggle('_inline');
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Insert Image
          </DialogTitle>
          <DialogDescription>
            Add an image by URL or upload from your device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Drag and drop area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop an image, or{' '}
              <span className="text-primary font-medium">click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, GIF, SVG, WEBP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* URL input */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-muted-foreground shrink-0">
              or URL:
            </Label>
            <Input
              placeholder="https://example.com/image.png"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setPreviewError(false);
              }}
              className="text-sm"
            />
          </div>

          {/* Preview */}
          {url && !previewError && (
            <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
              <img
                src={url}
                alt={alt || 'Preview'}
                className="max-h-48 mx-auto object-contain"
                onError={() => setPreviewError(true)}
              />
              <button
                onClick={() => {
                  setUrl('');
                  setPreviewError(false);
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {previewError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-center">
              <p className="text-sm text-destructive">Unable to load image preview</p>
            </div>
          )}

          {/* Alt text */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Alt Text</Label>
            <Input
              placeholder="Describe the image for accessibility..."
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Width (px)</Label>
              <Input
                placeholder="Auto"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Height (px)</Label>
              <Input
                placeholder="Auto"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Image Alignment / Word Wrap */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Alignment</Label>
            <ToggleGroup
              type="single"
              value={floatToggle}
              onValueChange={(val) => {
                if (val) setFloatToggle(val as FloatToggle);
              }}
              variant="outline"
              className="w-full"
            >
              {floatOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <Tooltip key={opt.value}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={opt.value}
                        aria-label={opt.label}
                        className="flex-1 gap-1.5 text-xs"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{opt.label}</span>
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{opt.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </ToggleGroup>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsert} disabled={!url.trim()}>
              <ImageIcon className="h-4 w-4 mr-1.5" />
              Insert Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}