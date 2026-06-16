'use client';

import { QuestionPaperComposer } from '@/components/editor/question-paper-composer';
import { GraduationCap, Keyboard } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden md:inline">
              Rich Text · Math Equations · Images · Tables
            </span>
            <span className="md:hidden">
              Create papers easily
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <QuestionPaperComposer />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
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
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">
                Ctrl+Z
              </kbd>
              Undo
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}