'use client';

import { useState } from 'react';
import { GraduationCap, FileText, BookOpen, Sparkles, ScanLine, Database, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { PaperList } from '@/components/papers/paper-list';
import { SyllabusList } from '@/components/syllabuses/syllabus-list';
import { QuestionGenerator } from '@/components/generate/question-generator';
import { PaperScanner } from '@/components/scan/paper-scanner';
import { QuestionBank } from '@/components/bank/question-bank';
import { cn } from '@/lib/utils';

type Tab = 'papers' | 'syllabuses' | 'generate' | 'scan' | 'bank';

const NAV_ITEMS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'papers', label: 'Papers', icon: FileText },
  { id: 'bank', label: 'Bank', icon: Database },
  { id: 'syllabuses', label: 'Syllabuses', icon: BookOpen },
  { id: 'generate', label: 'Generate', icon: Sparkles },
  { id: 'scan', label: 'Scan', icon: ScanLine },
];

function NavButton({
  item,
  active,
  onClick,
  collapsed,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  const content = (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-accent text-accent-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
  return content;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSheetOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-sm">PaperCraft</span>
                  </div>
                  <nav className="flex-1 p-3 space-y-1 pt-2">
                    {NAV_ITEMS.map((item) => (
                      <NavButton
                        key={item.id}
                        item={item}
                        active={activeTab === item.id}
                        onClick={() => handleTabChange(item.id)}
                      />
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold tracking-tight leading-none">
                  PaperCraft
                </h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  Question Paper Creator <span className="text-[9px] opacity-60">v1.1</span>
                </p>
              </div>
            </div>
          </div>

          {/* Desktop nav tabs */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeTab === item.id && 'bg-accent text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered</span>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar + Main */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-muted/20 shrink-0">
          <nav className="flex-1 p-3 space-y-1 pt-4" aria-label="Sidebar navigation">
            {NAV_ITEMS.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-border">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium mb-1.5">Keyboard Shortcuts</p>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Bold</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono">Ctrl+B</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Italic</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono">Ctrl+I</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Underline</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono">Ctrl+U</kbd>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content — all tabs rendered to preserve state */}
        <main className="flex-1 min-w-0 p-4 sm:p-6">
          <div className={activeTab === 'papers' ? '' : 'hidden'}><PaperList /></div>
          <div className={activeTab === 'bank' ? '' : 'hidden'}><QuestionBank /></div>
          <div className={activeTab === 'syllabuses' ? '' : 'hidden'}><SyllabusList /></div>
          <div className={activeTab === 'generate' ? '' : 'hidden'}><QuestionGenerator /></div>
          <div className={activeTab === 'scan' ? '' : 'hidden'}><PaperScanner /></div>
        </main>
      </div>

      {/* Mobile footer */}
      <footer className="lg:hidden border-t border-border bg-muted/30 mt-auto">
        <div className="flex items-center justify-center gap-3 py-2.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-md transition-colors',
                  'hover:text-foreground',
                  activeTab === item.id ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

      {/* Desktop footer */}
      <footer className="hidden lg:block border-t border-border bg-muted/30">
        <div className="px-6 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            PaperCraft — AI-powered question paper creation
          </p>
        </div>
      </footer>
    </div>
  );
}