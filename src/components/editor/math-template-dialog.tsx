'use client';

import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { mathCategories, mathTemplates, getTemplatesByCategory } from './math-templates';
import { MathTemplate } from './math-templates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sigma, Search, PlusCircle, Type, AlignCenter } from 'lucide-react';

interface MathTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latex: string, isBlock: boolean) => void;
  /** Pre-select inline or block mode when dialog opens */
  defaultMode?: 'inline' | 'block';
}

function TemplatePreview({ latex, displayMode = false, className = '' }: { latex: string; displayMode?: boolean; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        macros: {
          '\\placeholder': '\\textcolor{#9ca3af}{\\blacksquare}',
          '\\ph': '\\textcolor{#9ca3af}{\\blacksquare}',
        },
      });
    } catch {
      return '<span class="text-destructive text-xs">Error</span>';
    }
  }, [latex, displayMode]);

  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function TemplateCard({ template, onInsert }: { template: MathTemplate; onInsert: (latex: string) => void }) {
  return (
    <button
      onClick={() => onInsert(template.latex)}
      className="group flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-center min-h-[80px]"
    >
      <div className="text-sm overflow-hidden max-w-full [overflow-wrap:anywhere]">
        <TemplatePreview latex={template.latex} displayMode={false} />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-full">
        {template.name}
      </span>
    </button>
  );
}

export function MathTemplateDialog({ open, onOpenChange, onInsert, defaultMode }: MathTemplateDialogProps) {
  const [activeCategory, setActiveCategory] = useState('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [insertMode, setInsertMode] = useState<'inline' | 'block'>(defaultMode || 'inline');
  const [customLatex, setCustomLatex] = useState('');

  // Sync insertMode when defaultMode changes (e.g., Sigma vs Square button)
  React.useEffect(() => {
    if (defaultMode) setInsertMode(defaultMode);
  }, [defaultMode]);

  const filteredTemplates = useMemo(() => {
    const templates = getTemplatesByCategory(activeCategory);
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return mathTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.latex.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [activeCategory, searchQuery]);

  const handleInsertTemplate = (latex: string) => {
    onInsert(latex, insertMode === 'block');
    onOpenChange(false);
    setCustomLatex('');
  };

  const handleCustomInsert = () => {
    if (customLatex.trim()) {
      onInsert(customLatex.trim(), insertMode === 'block');
      onOpenChange(false);
      setCustomLatex('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sigma className="h-5 w-5 text-primary" />
            Insert Math Equation
          </DialogTitle>
          <DialogDescription>
            Choose a template or enter custom LaTeX. Click on an equation in the editor to edit it.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates (e.g., fraction, integral, sin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Insert mode toggle */}
        <div className="px-6 pb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Insert as:</span>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setInsertMode('inline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                insertMode === 'inline'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-accent'
              }`}
            >
              <Type className="h-3 w-3" /> Inline
            </button>
            <button
              onClick={() => setInsertMode('block')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                insertMode === 'block'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-accent'
              }`}
            >
              <AlignCenter className="h-3 w-3" /> Block
            </button>
          </div>
        </div>

        {/* Category tabs + template grid */}
        <div className="flex-1 flex flex-col min-h-0 px-6">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0 mb-3 bg-muted/50 p-1 h-auto">
              {mathCategories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="text-xs px-2.5 py-1.5 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {mathCategories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-[250px]">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pb-4">
                    {filteredTemplates.map((template) => (
                      <TemplateCard key={template.id} template={template} onInsert={handleInsertTemplate} />
                    ))}
                    {filteredTemplates.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No templates found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Custom LaTeX input */}
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Or enter custom LaTeX here..."
                value={customLatex}
                onChange={(e) => setCustomLatex(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customLatex.trim()) {
                    handleCustomInsert();
                  }
                }}
                className="pr-16 font-mono text-sm"
              />
              {customLatex && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <TemplatePreview latex={customLatex} className="text-xs" />
                </div>
              )}
            </div>
            <Button
              onClick={handleCustomInsert}
              disabled={!customLatex.trim()}
              size="sm"
              className="shrink-0"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Insert
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}