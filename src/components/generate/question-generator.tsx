'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  BookOpen,
  Plus,
  FileText,
  Loader2,
  Eye,
  EyeOff,
  BookMarked,
  Search,
  Camera,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  useQuestionGeneratorStore,
  type GeneratedQuestion,
} from '@/lib/question-generator-store';

// --- Types ---
interface Syllabus {
  id: string;
  title: string;
  subject: string;
  grade: string;
  language: string;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  name: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  name: string;
  description: string | null;
  order: number;
}

// --- Helpers ---
const typeColors: Record<string, string> = {
  mcq: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  short: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  essay: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  structured: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// --- Question Card ---
function QuestionCard({
  question,
  index,
}: {
  question: GeneratedQuestion;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toggleSelect } = useQuestionGeneratorStore();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        question.selected
          ? 'ring-2 ring-primary/50 border-primary/30 bg-primary/[0.02]'
          : 'hover:shadow-sm'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <Checkbox
              checked={question.selected}
              onCheckedChange={() => toggleSelect(question.id)}
              aria-label={`Select question ${index + 1}`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">
                Q{index + 1}
              </span>
              <Badge
                variant="secondary"
                className={`text-[10px] font-semibold uppercase tracking-wide ${typeColors[question.type] || ''}`}
              >
                {question.type}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[10px] font-semibold uppercase tracking-wide ${difficultyColors[question.difficulty] || ''}`}
              >
                {question.difficulty}
              </Badge>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {question.marks} mark{question.marks !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div
              className="text-sm leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: question.question }}
            />

            {question.type === 'mcq' &&
              question.options &&
              question.options.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {question.options.map((opt, i) => (
                    <div
                      key={i}
                      className="text-sm text-muted-foreground pl-4 py-0.5 border-l-2 border-border"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}

            {question.suggestedAnswer && (
              <Collapsible open={expanded} onOpenChange={setExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {expanded ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                    {expanded ? 'Hide Answer' : 'Show Answer'}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        expanded ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Suggested Answer
                      </p>
                      <div
                        className="text-sm leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: question.suggestedAnswer,
                        }}
                      />
                    </div>
                    {question.markScheme && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Mark Scheme
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {question.markScheme}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => handleCopy(question.suggestedAnswer || '')}
                    >
                      {copied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? 'Copied' : 'Copy Answer'}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Loading Skeletons ---
function LoadingSkeletons() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-base">Generated Questions</CardTitle>
            <CardDescription className="text-xs flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating with AI...
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14 ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Results List ---
function ResultsList() {
  const {
    questions,
    selectAll,
    deselectAll,
    clearQuestions,
    getSelected,
  } = useQuestionGeneratorStore();

  const selectedCount = getSelected().length;

  const handleAddToPaper = async () => {
    const selected = getSelected();
    if (selected.length === 0) {
      toast.error('No questions selected');
      return;
    }

    try {
      const totalMarks = selected.reduce(
        (sum, q) => sum + (q.marks || 0),
        0
      );
      const response = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `AI Generated Paper - ${new Date().toLocaleDateString()}`,
          subject: 'Generated',
          sections: [
            {
              name: 'Section A',
              order: 1,
              questions: selected.map((q, i) => ({
                content: q.question,
                marks: q.marks,
                order: i,
                sourceType: 'ai-generated',
                suggestedAnswer: q.suggestedAnswer || null,
                markScheme: q.markScheme || null,
                difficulty: q.difficulty || null,
              })),
            },
          ],
          totalMarks,
        }),
      });

      if (!response.ok) throw new Error('Failed to create paper');

      toast.success(
        `Paper created with ${selected.length} question${selected.length !== 1 ? 's' : ''}!`
      );
      clearQuestions();
    } catch {
      toast.error('Failed to create paper');
    }
  };

  if (questions.length === 0) return null;

  const allSelected = questions.length > 0 && questions.every((q) => q.selected);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Generated Questions</CardTitle>
              <CardDescription className="text-xs">
                {questions.length} question{questions.length !== 1 ? 's' : ''}{' '}
                generated
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearQuestions}
            className="h-8 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={allSelected ? deselectAll : selectAll}
            className="h-8 text-xs gap-1.5"
          >
            <BookMarked className="h-3.5 w-3.5" />
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>

          <Button
            size="sm"
            onClick={handleAddToPaper}
            disabled={selectedCount === 0}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Selected to Paper
            {selectedCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 px-1.5 text-[10px]"
              >
                {selectedCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Questions */}
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3 pr-2">
            {questions.map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// --- Syllabus Tab ---
function SyllabusTab() {
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [loadingSyllabuses, setLoadingSyllabuses] = useState(true);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [questionType, setQuestionType] = useState('mixed');
  const [difficulty, setDifficulty] = useState('mixed');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState('english');
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const { setQuestions, setGenerating, clearQuestions, isGenerating } =
    useQuestionGeneratorStore();

  const selectedSyllabus = syllabuses.find((s) => s.id === selectedSyllabusId);
  const selectedChapter = selectedSyllabus?.chapters.find(
    (c) => c.id === selectedChapterId
  );

  useEffect(() => {
    async function fetchSyllabuses() {
      try {
        setLoadingSyllabuses(true);
        const res = await fetch('/api/syllabuses');
        if (res.ok) {
          const data = await res.json();
          setSyllabuses(data);
        }
      } catch {
        toast.error('Failed to load syllabuses');
      } finally {
        setLoadingSyllabuses(false);
      }
    }
    fetchSyllabuses();
  }, []);

  useEffect(() => {
    setSelectedChapterId('');
    setSelectedLessonId('');
  }, [selectedSyllabusId]);

  useEffect(() => {
    setSelectedLessonId('');
  }, [selectedChapterId]);

  const handleGenerate = async () => {
    if (!selectedSyllabusId) {
      toast.error('Please select a syllabus');
      return;
    }

    clearQuestions();
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'syllabus',
          syllabusId: selectedSyllabusId,
          chapterId: selectedChapterId || undefined,
          lessonId: selectedLessonId || undefined,
          questionType,
          difficulty,
          count,
          language,
          includeAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenerating(false);
        toast.error(data.error || 'Generation failed');
        return;
      }

      setQuestions(data);
      toast.success(
        `Generated ${data.length} question${data.length !== 1 ? 's' : ''}`
      );
    } catch {
      setGenerating(false);
      toast.error('Failed to generate questions');
    }
  };

  if (loadingSyllabuses) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (syllabuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
          <BookOpen className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold mb-1">No Syllabuses Yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Upload a syllabus first to generate questions from it. Go to the
          Syllabus Manager to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Syllabus selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Syllabus</Label>
        <Select value={selectedSyllabusId} onValueChange={setSelectedSyllabusId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select a syllabus..." />
          </SelectTrigger>
          <SelectContent>
            {syllabuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {s.subject} &bull; {s.grade}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chapter selector */}
      {selectedSyllabus && selectedSyllabus.chapters.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Chapter (optional)</Label>
          <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All chapters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All chapters</SelectItem>
              {selectedSyllabus.chapters.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  Ch {ch.order}: {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Lesson selector */}
      {selectedChapter && selectedChapter.lessons.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Lesson (optional)</Label>
          <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All lessons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All lessons</SelectItem>
              {selectedChapter.lessons.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.order}. {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* Question Type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Question Type</Label>
        <ToggleGroup
          type="single"
          value={questionType}
          onValueChange={(v) => v && setQuestionType(v)}
          className="flex-wrap"
        >
          <ToggleGroupItem value="mcq" className="text-xs h-8 px-3">
            MCQ
          </ToggleGroupItem>
          <ToggleGroupItem value="short" className="text-xs h-8 px-3">
            Short
          </ToggleGroupItem>
          <ToggleGroupItem value="essay" className="text-xs h-8 px-3">
            Essay
          </ToggleGroupItem>
          <ToggleGroupItem value="structured" className="text-xs h-8 px-3">
            Structured
          </ToggleGroupItem>
          <ToggleGroupItem value="mixed" className="text-xs h-8 px-3">
            Mixed
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Difficulty</Label>
        <ToggleGroup
          type="single"
          value={difficulty}
          onValueChange={(v) => v && setDifficulty(v)}
        >
          <ToggleGroupItem value="easy" className="text-xs h-8 px-3">
            Easy
          </ToggleGroupItem>
          <ToggleGroupItem value="medium" className="text-xs h-8 px-3">
            Medium
          </ToggleGroupItem>
          <ToggleGroupItem value="hard" className="text-xs h-8 px-3">
            Hard
          </ToggleGroupItem>
          <ToggleGroupItem value="mixed" className="text-xs h-8 px-3">
            Mixed
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Count */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Number of Questions</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) =>
            setCount(Math.min(20, Math.max(1, Number(e.target.value))))
          }
          className="h-9 w-24"
        />
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-9 text-sm w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="sinhala">Sinhala (සිංහල)</SelectItem>
            <SelectItem value="tamil">Tamil (தமிழ்)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Include Answers */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="include-answers"
          checked={includeAnswers}
          onCheckedChange={(v) => setIncludeAnswers(!!v)}
        />
        <Label htmlFor="include-answers" className="text-xs cursor-pointer">
          Include suggested answers
        </Label>
      </div>

      <Separator />

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !selectedSyllabusId}
        className="w-full h-10 gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Questions
          </>
        )}
      </Button>
    </div>
  );
}

// --- Image Question Reader ---
function ImageQuestionReader({
  onExtracted,
  onLanguageDetected,
}: {
  onExtracted: (text: string) => void;
  onLanguageDetected: (lang: string) => void;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setReading(true);
      try {
        // Step 1: Run OCR in the browser
        const { ocrSingleImage } = await import('@/lib/client-ocr');
        const { text: ocrText, language } = await ocrSingleImage(file);

        // Step 2: Send text to server for AI structuring
        const res = await fetch('/api/generate/read-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ocrText, language }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to read question');
          return;
        }
        onExtracted(data.question);
        if (data.language) onLanguageDetected(data.language);
        toast.success('Question extracted from image');
      } catch {
        toast.error('Failed to read question from image');
      } finally {
        setReading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  // Global paste listener
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) processImage(file);
          return;
        }
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, []);

  const clearImage = () => setImagePreview(null);

  if (imagePreview) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">Screenshot</Label>
        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
          <div className="p-2">
            <img
              src={imagePreview}
              alt="Question screenshot"
              className="max-h-48 mx-auto rounded object-contain"
            />
          </div>
          {reading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Running OCR...</span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 bg-background/80 rounded-full hover:bg-background"
            onClick={clearImage}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">
        Upload Question Screenshot
      </Label>
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
          <Camera className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium">
            Drop an image here, click to upload, or{' '}
            <span className="text-primary">paste from clipboard</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Uses Tesseract OCR for accurate Sinhala, Tamil &amp; English
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Then AI structures the extracted text
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

// --- Variations Tab ---
function VariationsTab() {
  const [referenceQuestion, setReferenceQuestion] = useState('');
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [count, setCount] = useState(5);
  const [keepDifficulty, setKeepDifficulty] = useState(true);
  const [varyType, setVaryType] = useState(true);
  const [language, setLanguage] = useState('english');
  const [extractedLang, setExtractedLang] = useState<string | null>(null);
  const { setQuestions, setGenerating, clearQuestions, isGenerating } =
    useQuestionGeneratorStore();

  const handleImageExtracted = (text: string) => {
    setReferenceQuestion(text);
  };

  const handleLanguageDetected = (lang: string) => {
    setLanguage(lang);
    setExtractedLang(lang);
  };

  const handleGenerate = async () => {
    if (!referenceQuestion.trim()) {
      toast.error('Please enter a reference question');
      return;
    }

    clearQuestions();
    setGenerating(true);
    try {
      const res = await fetch('/api/generate/variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceQuestion: referenceQuestion.trim(),
          referenceAnswer: referenceAnswer.trim() || undefined,
          count,
          keepDifficulty,
          varyType,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenerating(false);
        toast.error(data.error || 'Generation failed');
        return;
      }

      setQuestions(data);
      toast.success(
        `Generated ${data.length} variation${data.length !== 1 ? 's' : ''}`
      );
    } catch {
      setGenerating(false);
      toast.error('Failed to generate variations');
    }
  };

  return (
    <div className="space-y-5">
      {/* Image Upload */}
      <ImageQuestionReader
        onExtracted={handleImageExtracted}
        onLanguageDetected={handleLanguageDetected}
      />

      {/* Warning for non-English extraction */}
      {extractedLang && (extractedLang === 'sinhala' || extractedLang === 'tamil') && referenceQuestion && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
          <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-muted-foreground">
              Review extracted {extractedLang === 'sinhala' ? 'Sinhala' : 'Tamil'} text
            </p>
            <p className="text-muted-foreground mt-0.5">
              Each MCQ option was verified individually for accuracy. Please review before generating variations.
            </p>
          </div>
        </div>
      )}

      {/* Reference Question */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Reference Question</Label>
        <Textarea
          placeholder="Paste or type a reference question here..."
          value={referenceQuestion}
          onChange={(e) => setReferenceQuestion(e.target.value)}
          className={referenceQuestion ? "min-h-[140px] text-sm resize-y" : "min-h-[100px] text-sm resize-none"}
        />
      </div>

      {/* Reference Answer (optional) */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">
          Reference Answer{' '}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          placeholder="Paste or type the reference answer (helps AI generate better variations)..."
          value={referenceAnswer}
          onChange={(e) => setReferenceAnswer(e.target.value)}
          className="min-h-[80px] text-sm resize-none"
        />
      </div>

      <Separator />

      {/* Count */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Number of Variations</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) =>
            setCount(Math.min(20, Math.max(1, Number(e.target.value))))
          }
          className="h-9 w-24"
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="keep-difficulty"
            checked={keepDifficulty}
            onCheckedChange={(v) => setKeepDifficulty(!!v)}
          />
          <Label htmlFor="keep-difficulty" className="text-xs cursor-pointer">
            Keep same difficulty level
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="vary-type"
            checked={varyType}
            onCheckedChange={(v) => setVaryType(!!v)}
          />
          <Label htmlFor="vary-type" className="text-xs cursor-pointer">
            Vary question types
          </Label>
        </div>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-9 text-sm w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="sinhala">Sinhala (සිංහල)</SelectItem>
            <SelectItem value="tamil">Tamil (தமிழ்)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !referenceQuestion.trim()}
        className="w-full h-10 gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Variations...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Variations
          </>
        )}
      </Button>
    </div>
  );
}

// --- Main Component ---
export function QuestionGenerator() {
  const { isGenerating, questions } = useQuestionGeneratorStore();

  return (
    <div className="flex flex-col gap-6">
      {/* Generator Panel */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">AI Question Generator</CardTitle>
              <CardDescription className="text-xs">
                Generate questions from syllabus content or create variations of
                existing questions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="syllabus" className="w-full">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="syllabus" className="flex-1 gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">From Syllabus</span>
                <span className="sm:hidden">Syllabus</span>
              </TabsTrigger>
              <TabsTrigger value="variations" className="flex-1 gap-1.5">
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  From Reference Question
                </span>
                <span className="sm:hidden">Reference</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="syllabus">
              <SyllabusTab />
            </TabsContent>

            <TabsContent value="variations">
              <VariationsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isGenerating && <LoadingSkeletons />}

      {/* Results Panel */}
      {!isGenerating && questions.length > 0 && <ResultsList />}
    </div>
  );
}