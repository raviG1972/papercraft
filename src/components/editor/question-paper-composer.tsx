'use client';

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QuestionEditor } from '@/components/editor/question-editor';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  FileText,
  Layers,
  BarChart3,
  Copy,
  FolderPlus,
  Eye,
  EyeOff,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'short' | 'long' | 'essay' | 'fill-blanks';

export interface PaperSettings {
  title: string;
  subject: string;
  grade: string;
  duration: string;
  maxMarks: string;
  instructions: string;
}

export interface Question {
  id: string;
  content: string;
  html: string;
  marks: number;
  type: QuestionType;
  sectionId?: string;
}

export interface Section {
  id: string;
  title: string;
  instructions: string;
}

export interface QuestionPaperComposerProps {
  initialSettings?: Partial<PaperSettings>;
  initialQuestions?: Question[];
  initialSections?: Section[];
  onSettingsChange?: (settings: PaperSettings) => void;
  onQuestionsChange?: (questions: Question[]) => void;
  onSectionsChange?: (sections: Section[]) => void;
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Multiple Choice',
  short: 'Short Answer',
  long: 'Long Answer',
  essay: 'Essay',
  'fill-blanks': 'Fill in the Blanks',
};

const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  mcq: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  short: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  long: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  essay: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'fill-blanks': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

const DEFAULT_SETTINGS: PaperSettings = {
  title: '',
  subject: '',
  grade: '',
  duration: '3 Hours',
  maxMarks: '100',
  instructions: 'Answer all questions. Write neatly and legibly.',
};

function createQuestion(sectionId?: string, type: QuestionType = 'short'): Question {
  return {
    id: uuidv4(),
    content: '',
    html: '',
    marks: type === 'mcq' ? 1 : type === 'short' ? 2 : type === 'fill-blanks' ? 1 : 5,
    type,
    sectionId,
  };
}

function createSection(title: string = 'New Section'): Section {
  return {
    id: uuidv4(),
    title,
    instructions: '',
  };
}

// ─────────────────────────────────────────────────────────────────
// Sortable Question Item
// ─────────────────────────────────────────────────────────────────

interface SortableQuestionItemProps {
  question: Question;
  index: number;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void;
  onDeleteQuestion: (id: string) => void;
  onDuplicateQuestion: (id: string) => void;
  isDragging?: boolean;
}

function SortableQuestionItem({
  question,
  index,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  isDragging,
}: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: question.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="group border-border shadow-sm hover:shadow-md transition-shadow">
        {/* Question meta bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-t-lg border-b border-border">
          {/* Drag handle */}
          <button
            className="touch-none cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Question number badge */}
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary text-primary-foreground font-bold text-xs shrink-0">
            {index + 1}
          </div>

          {/* Question type selector */}
          <Select
            value={question.type}
            onValueChange={(value) =>
              onUpdateQuestion(question.id, { type: value as QuestionType })
            }
          >
            <SelectTrigger size="sm" className="h-7 text-xs w-auto min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(
                ([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* Question type badge */}
          <Badge
            variant="secondary"
            className={`text-[10px] font-medium px-1.5 py-0 ${QUESTION_TYPE_COLORS[question.type]}`}
          >
            {question.type.toUpperCase()}
          </Badge>

          <div className="flex-1" />

          {/* Marks input */}
          <div className="flex items-center gap-1.5">
            <Label htmlFor={`marks-${question.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
              Marks:
            </Label>
            <Input
              id={`marks-${question.id}`}
              type="number"
              min={0}
              max={100}
              value={question.marks}
              onChange={(e) =>
                onUpdateQuestion(question.id, {
                  marks: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              className="h-7 w-16 text-center text-xs"
            />
          </div>

          {/* Duplicate button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDuplicateQuestion(question.id)}
            aria-label="Duplicate question"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          {/* Delete button with confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete question"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Question {index + 1}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently remove the
                  question and its content from the paper.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => onDeleteQuestion(question.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Question editor content */}
        <CardContent className="p-0">
          <QuestionEditor
            key={question.id}
            content={question.content}
            questionNumber={index + 1}
            maxMarks={question.marks}
            showHeader={false}
            onChange={(content, html) =>
              onUpdateQuestion(question.id, { content, html })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Drag Overlay Component
// ─────────────────────────────────────────────────────────────────

function DragOverlayItem({ question, index }: { question: Question; index: number }) {
  return (
    <Card className="shadow-2xl border-primary/30 rotate-2 opacity-90">
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-t-lg border-b border-primary/20">
        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary text-primary-foreground font-bold text-xs shrink-0">
          {index + 1}
        </div>
        <Badge variant="secondary" className="text-xs">
          {QUESTION_TYPE_LABELS[question.type]}
        </Badge>
        <span className="text-xs text-muted-foreground">{question.marks} marks</span>
      </div>
      <CardContent className="p-3">
        <p className="text-sm text-muted-foreground italic">
          {question.html ? 'Moving question...' : 'Empty question'}
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Paper Header / Settings
// ─────────────────────────────────────────────────────────────────

interface PaperHeaderProps {
  settings: PaperSettings;
  onUpdateSettings: (updates: Partial<PaperSettings>) => void;
}

function PaperHeader({ settings, onUpdateSettings }: PaperHeaderProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="border-border shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Paper Settings
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {settings.title
                    ? settings.title
                    : 'Set your paper title and details'}
                </CardDescription>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                {isOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Paper Title */}
              <div className="sm:col-span-2 lg:col-span-3">
                <Label htmlFor="paper-title" className="text-xs font-medium">
                  Paper Title
                </Label>
                <Input
                  id="paper-title"
                  placeholder="e.g., Final Examination — Mathematics"
                  value={settings.title}
                  onChange={(e) => onUpdateSettings({ title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="paper-subject" className="text-xs font-medium">
                  Subject
                </Label>
                <Input
                  id="paper-subject"
                  placeholder="e.g., Mathematics"
                  value={settings.subject}
                  onChange={(e) => onUpdateSettings({ subject: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Class/Grade */}
              <div>
                <Label htmlFor="paper-grade" className="text-xs font-medium">
                  Class / Grade
                </Label>
                <Input
                  id="paper-grade"
                  placeholder="e.g., Grade 10"
                  value={settings.grade}
                  onChange={(e) => onUpdateSettings({ grade: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="paper-duration" className="text-xs font-medium">
                  Duration
                </Label>
                <Input
                  id="paper-duration"
                  placeholder="e.g., 3 Hours"
                  value={settings.duration}
                  onChange={(e) => onUpdateSettings({ duration: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Maximum Marks */}
              <div>
                <Label htmlFor="paper-max-marks" className="text-xs font-medium">
                  Maximum Marks
                </Label>
                <Input
                  id="paper-max-marks"
                  placeholder="e.g., 100"
                  value={settings.maxMarks}
                  onChange={(e) => onUpdateSettings({ maxMarks: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              {/* Empty spacer for grid alignment */}
              <div className="hidden lg:block" />

              {/* Instructions */}
              <div className="sm:col-span-2 lg:col-span-3">
                <Label htmlFor="paper-instructions" className="text-xs font-medium">
                  General Instructions
                </Label>
                <Textarea
                  id="paper-instructions"
                  placeholder="e.g., Answer all questions. Write neatly and legibly."
                  value={settings.instructions}
                  onChange={(e) =>
                    onUpdateSettings({ instructions: e.target.value })
                  }
                  className="mt-1.5 min-h-[80px] resize-y"
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Summary Panel
// ─────────────────────────────────────────────────────────────────

interface SummaryPanelProps {
  questions: Question[];
  sections: Section[];
  settings: PaperSettings;
}

function SummaryPanel({ questions, sections, settings }: SummaryPanelProps) {
  const unsectioned = questions.filter((q) => !q.sectionId);
  const unsectionedMarks = unsectioned.reduce((s, q) => s + q.marks, 0);

  const stats = useMemo(() => {
    const typeCounts: Record<QuestionType, number> = {
      mcq: 0,
      short: 0,
      long: 0,
      essay: 0,
      'fill-blanks': 0,
    };
    const typeMarks: Record<QuestionType, number> = {
      mcq: 0,
      short: 0,
      long: 0,
      essay: 0,
      'fill-blanks': 0,
    };

    questions.forEach((q) => {
      typeCounts[q.type] += 1;
      typeMarks[q.type] += q.marks;
    });

    const totalQuestions = questions.length;
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    // Section breakdown
    const sectionStats = sections.map((section) => {
      const sectionQuestions = questions.filter(
        (q) => q.sectionId === section.id
      );
      return {
        section,
        questionCount: sectionQuestions.length,
        totalMarks: sectionQuestions.reduce((sum, q) => sum + q.marks, 0),
      };
    });

    return { typeCounts, typeMarks, totalQuestions, totalMarks, sectionStats };
  }, [questions, sections]);

  const maxMarksNum = parseInt(settings.maxMarks) || 0;
  const usagePercent =
    maxMarksNum > 0
      ? Math.min(100, Math.round((stats.totalMarks / maxMarksNum) * 100))
      : 0;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Summary</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Overview of your question paper
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalQuestions}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">
              Questions
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalMarks}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-0.5">
              Total Marks
            </p>
          </div>
        </div>

        {/* Marks usage bar */}
        {maxMarksNum > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Marks Allocation</span>
              <span className="font-medium">
                {stats.totalMarks}/{maxMarksNum} ({usagePercent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 100
                    ? 'bg-destructive'
                    : usagePercent > 90
                      ? 'bg-amber-500'
                      : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Type breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            By Type
          </p>
          <div className="space-y-1.5">
            {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(
              ([type, label]) => {
                const count = stats.typeCounts[type];
                const marks = stats.typeMarks[type];
                if (count === 0) return null;
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium px-1.5 py-0 ${QUESTION_TYPE_COLORS[type]}`}
                      >
                        {label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {count} {count === 1 ? 'question' : 'questions'}
                      </span>
                      <span className="font-semibold text-foreground">
                        {marks} {marks === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
            {stats.totalQuestions === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2 italic">
                No questions added yet
              </p>
            )}
          </div>
        </div>

        {/* Section breakdown */}
        {sections.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                By Section
              </p>
              <div className="space-y-1.5">
                {stats.sectionStats.map(({ section, questionCount, totalMarks }) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{section.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {questionCount} Qs
                      </span>
                      <span className="font-semibold text-foreground">
                        {totalMarks} marks
                      </span>
                    </div>
                  </div>
                ))}
                {/* Unsectioned questions */}
                {unsectioned.length > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Ungrouped
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {unsectioned.length} Qs
                      </span>
                      <span className="font-semibold text-foreground">
                        {unsectionedMarks} marks
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Section Card
// ─────────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: Section;
  questions: Question[];
  globalQuestionIndexOffset: number;
  sensors: ReturnType<typeof useSensors>;
  onUpdateSection: (id: string, updates: Partial<Section>) => void;
  onDeleteSection: (id: string) => void;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void;
  onDeleteQuestion: (id: string) => void;
  onDuplicateQuestion: (id: string) => void;
  onAddQuestion: (sectionId?: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeId: string | null;
}

function SectionCard({
  section,
  questions,
  globalQuestionIndexOffset,
  sensors,
  onUpdateSection,
  onDeleteSection,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onAddQuestion,
  onDragEnd,
  activeId,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
  const sectionMarks = sectionQuestions.reduce((s, q) => s + q.marks, 0);

  return (
    <Card className="border-border shadow-sm">
      <div className="px-4 py-3 bg-muted/30 rounded-t-lg border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <Input
                value={section.title}
                onChange={(e) =>
                  onUpdateSection(section.id, { title: e.target.value })
                }
                placeholder="Section title..."
                className="h-7 text-sm font-semibold border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {sectionQuestions.length} questions
                </span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">
                  {sectionMarks} marks
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Section instructions toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Hide</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Show</span>
                </>
              )}
            </Button>

            {/* Delete section */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Delete section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &quot;{section.title}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the section and all {sectionQuestions.length}{' '}
                    questions within it. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => onDeleteSection(section.id)}
                  >
                    Delete Section
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Section instructions (collapsible) */}
        {isOpen && (
          <div className="mt-2">
            <Textarea
              value={section.instructions}
              onChange={(e) =>
                onUpdateSection(section.id, { instructions: e.target.value })
              }
              placeholder="Section instructions (optional)..."
              className="min-h-[50px] resize-y text-xs"
            />
          </div>
        )}
      </div>

      {/* Questions list */}
      <CardContent className="p-3 space-y-3">
        {sectionQuestions.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sectionQuestions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {sectionQuestions.map((question, idx) => (
                <SortableQuestionItem
                  key={question.id}
                  question={question}
                  index={globalQuestionIndexOffset + idx}
                  onUpdateQuestion={onUpdateQuestion}
                  onDeleteQuestion={onDeleteQuestion}
                  onDuplicateQuestion={onDuplicateQuestion}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <DragOverlayItem
                  question={
                    sectionQuestions.find((q) => q.id === activeId) ?? {
                      id: '',
                      content: '',
                      html: '',
                      marks: 0,
                      type: 'short',
                    }
                  }
                  index={0}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No questions in this section
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click the button below to add one
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-dashed"
          onClick={() => onAddQuestion(section.id)}
        >
          <Plus className="h-4 w-4" />
          Add Question to Section
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export function QuestionPaperComposer({
  initialSettings,
  initialQuestions = [],
  initialSections = [],
  onSettingsChange,
  onQuestionsChange,
  onSectionsChange,
}: QuestionPaperComposerProps) {
  // ── State ──
  const [settings, setSettings] = useState<PaperSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSections, setShowSections] = useState(initialSections.length > 0);

  // ── Sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Handlers ──
  const handleUpdateSettings = useCallback(
    (updates: Partial<PaperSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates };
        onSettingsChange?.(next);
        return next;
      });
    },
    [onSettingsChange]
  );

  const handleUpdateQuestion = useCallback(
    (id: string, updates: Partial<Question>) => {
      setQuestions((prev) => {
        const next = prev.map((q) => (q.id === id ? { ...q, ...updates } : q));
        onQuestionsChange?.(next);
        return next;
      });
    },
    [onQuestionsChange]
  );

  const handleDeleteQuestion = useCallback(
    (id: string) => {
      setQuestions((prev) => {
        const next = prev.filter((q) => q.id !== id);
        onQuestionsChange?.(next);
        return next;
      });
    },
    [onQuestionsChange]
  );

  const handleDuplicateQuestion = useCallback(
    (id: string) => {
      setQuestions((prev) => {
        const index = prev.findIndex((q) => q.id === id);
        if (index === -1) return prev;
        const original = prev[index];
        const duplicate: Question = {
          ...original,
          id: uuidv4(),
          content: original.content,
          html: original.html,
        };
        const next = [...prev];
        next.splice(index + 1, 0, duplicate);
        onQuestionsChange?.(next);
        return next;
      });
    },
    [onQuestionsChange]
  );

  const handleAddQuestion = useCallback(
    (sectionId?: string) => {
      const newQuestion = createQuestion(sectionId);
      setQuestions((prev) => {
        const next = [...prev, newQuestion];
        onQuestionsChange?.(next);
        return next;
      });
    },
    [onQuestionsChange]
  );

  const handleAddSection = useCallback(() => {
    const newSection = createSection(
      `Section ${String.fromCharCode(65 + sections.length)}`
    );
    setSections((prev) => {
      const next = [...prev, newSection];
      onSectionsChange?.(next);
      return next;
    });
  }, [sections.length, onSectionsChange]);

  const handleUpdateSection = useCallback(
    (id: string, updates: Partial<Section>) => {
      setSections((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        onSectionsChange?.(next);
        return next;
      });
    },
    [onSectionsChange]
  );

  const handleDeleteSection = useCallback(
    (id: string) => {
      setSections((prev) => {
        const next = prev.filter((s) => s.id !== id);
        onSectionsChange?.(next);
        return next;
      });
      // Also remove questions in that section
      setQuestions((prev) => {
        const next = prev.filter((q) => q.sectionId !== id);
        onQuestionsChange?.(next);
        return next;
      });
    },
    [onSectionsChange, onQuestionsChange]
  );

  // ── DnD handlers (for ungrouped questions) ──
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      setQuestions((prev) => {
        const oldIndex = prev.findIndex((q) => q.id === active.id);
        const newIndex = prev.findIndex((q) => q.id === over.id);
        const next = arrayMove(prev, oldIndex, newIndex);
        onQuestionsChange?.(next);
        return next;
      });
    },
    [onQuestionsChange]
  );

  const handleDragStart = useCallback(({ active }: { active: { id: string | number } }) => {
    setActiveId(String(active.id));
  }, []);

  // ── Computed ──
  const unsectionedQuestions = questions.filter((q) => !q.sectionId);

  // Global question index map for numbering
  const getGlobalIndex = useCallback(
    (questionId: string): number => {
      return questions.findIndex((q) => q.id === questionId);
    },
    [questions]
  );

  return (
    <div className="space-y-6">
      {/* ── Paper Settings ── */}
      <PaperHeader settings={settings} onUpdateSettings={handleUpdateSettings} />

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* ── Left: Questions ── */}
        <div className="space-y-6">
          {/* Sections Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={showSections ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowSections(true)}
              >
                <Layers className="h-3.5 w-3.5" />
                Sections
              </Button>
              <Button
                variant={!showSections ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowSections(false)}
              >
                <FileText className="h-3.5 w-3.5" />
                Flat List
              </Button>
            </div>
          </div>

          {showSections ? (
            /* ── Sections View ── */
            <div className="space-y-4">
              {sections.map((section) => {
                // Calculate the global index offset for this section's questions
                let offset = 0;
                const sectionIndex = sections.findIndex(
                  (s) => s.id === section.id
                );
                for (let i = 0; i < sectionIndex; i++) {
                  offset += questions.filter(
                    (q) => q.sectionId === sections[i].id
                  ).length;
                }
                // Add unsectioned questions count if they come first
                if (unsectionedQuestions.length > 0) {
                  offset += unsectionedQuestions.length;
                }

                return (
                  <SectionCard
                    key={section.id}
                    section={section}
                    questions={questions}
                    globalQuestionIndexOffset={offset}
                    sensors={sensors}
                    onUpdateSection={handleUpdateSection}
                    onDeleteSection={handleDeleteSection}
                    onUpdateQuestion={handleUpdateQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onDuplicateQuestion={handleDuplicateQuestion}
                    onAddQuestion={handleAddQuestion}
                    onDragEnd={handleDragEnd}
                    activeId={activeId}
                  />
                );
              })}

              {/* Ungrouped questions shown in sections mode */}
              {unsectionedQuestions.length > 0 && (
                <Card className="border-border shadow-sm">
                  <div className="px-4 py-2 bg-muted/20 rounded-t-lg border-b border-border">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Ungrouped Questions ({unsectionedQuestions.length})
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-3">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      onDragStart={handleDragStart}
                    >
                      <SortableContext
                        items={unsectionedQuestions.map((q) => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {unsectionedQuestions.map((question, idx) => (
                          <SortableQuestionItem
                            key={question.id}
                            question={question}
                            index={idx}
                            onUpdateQuestion={handleUpdateQuestion}
                            onDeleteQuestion={handleDeleteQuestion}
                            onDuplicateQuestion={handleDuplicateQuestion}
                          />
                        ))}
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <DragOverlayItem
                            question={
                              unsectionedQuestions.find(
                                (q) => q.id === activeId
                              ) ?? {
                                id: '',
                                content: '',
                                html: '',
                                marks: 0,
                                type: 'short',
                              }
                            }
                            index={0}
                          />
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </CardContent>
                </Card>
              )}

              {/* Add Section Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 border-dashed"
                onClick={handleAddSection}
              >
                <FolderPlus className="h-4 w-4" />
                Add Section
              </Button>
            </div>
          ) : (
            /* ── Flat List View ── */
            <>
              {questions.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  onDragStart={handleDragStart}
                >
                  <SortableContext
                    items={questions.map((q) => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {questions.map((question, idx) => (
                        <SortableQuestionItem
                          key={question.id}
                          question={question}
                          index={idx}
                          onUpdateQuestion={handleUpdateQuestion}
                          onDeleteQuestion={handleDeleteQuestion}
                          onDuplicateQuestion={handleDuplicateQuestion}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <DragOverlayItem
                        question={
                          questions.find((q) => q.id === activeId) ?? {
                            id: '',
                            content: '',
                            html: '',
                            marks: 0,
                            type: 'short',
                          }
                        }
                        index={getGlobalIndex(activeId)}
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      No questions yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Start building your question paper by adding your first
                      question below.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Add Question Button */}
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={() => handleAddQuestion()}
              >
                <Plus className="h-5 w-5" />
                Add Question
              </Button>
            </>
          )}

          {/* Always-visible Add Question button in sections mode too */}
          {showSections && (
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => handleAddQuestion()}
            >
              <Plus className="h-5 w-5" />
              Add Question (Ungrouped)
            </Button>
          )}
        </div>

        {/* ── Right: Summary Sidebar (desktop only) ── */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <ScrollArea className="max-h-[calc(100vh-6rem)]">
              <SummaryPanel
                questions={questions}
                sections={sections}
                settings={settings}
              />
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* ── Mobile Summary (below content) ── */}
      <div className="lg:hidden">
        <SummaryPanel
          questions={questions}
          sections={sections}
          settings={settings}
        />
      </div>
    </div>
  );
}
