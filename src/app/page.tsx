'use client';

import { QuestionEditor } from '@/components/editor/question-editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Save,
  Eye,
  Download,
  Settings,
  GraduationCap,
  Sigma,
  ImageIcon,
  Type,
  PenTool,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                PaperCraft
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none">
                Question Paper Creator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Eye className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button size="sm" className="text-xs">
              <Save className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Page Title Section */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Compose Questions
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Create questions with rich text formatting, images, and mathematical equations.
                  Click on any equation to edit it.
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 mt-1 text-xs">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Question
              </Button>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <Type className="h-3 w-3" />
                Rich Text
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <Sigma className="h-3 w-3" />
                Math Equations
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <ImageIcon className="h-3 w-3" />
                Images
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <PenTool className="h-3 w-3" />
                Templates
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Question Editor */}
          <QuestionEditor
            questionNumber={1}
            maxMarks={5}
            showHeader={true}
            onChange={(json, html) => {
              // console.log('Editor content changed:', { json, html });
            }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            PaperCraft — Create question papers with ease
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">
                Ctrl+B
              </kbd>
              Bold
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">
                Ctrl+I
              </kbd>
              Italic
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">
                Ctrl+U
              </kbd>
              Underline
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}