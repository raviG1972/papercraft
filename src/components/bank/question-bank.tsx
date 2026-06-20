'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Eye,
  Pencil,
  ChevronDown,
  ChevronUp,
  Database,
  X,
  Filter,
  BookPlus,
  Tag,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ─── Types ────────────────────────────────────────────────────────────────

type QuestionType = 'mcq' | 'short' | 'essay' | 'structured' | 'fill-blanks';

interface QuestionTag {
  id: string;
  name: string;
  color: string | null;
}

interface BankQuestion {
  id: string;
  text: string;
  type: string;
  subject: string | null;
  grade: string | null;
  language: string;
  marks: number | null;
  difficulty: string | null;
  options: string | null;
  correctAnswer: string | null;
  randomizeOptions: boolean;
  suggestedAnswer: string | null;
  markScheme: string | null;
  sourceNote: string | null;
  tags: QuestionTag[];
  createdAt: string;
  updatedAt: string;
}

interface TagInfo {
  id: string;
  name: string;
  color: string | null;
  questionCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  short: 'Short Answer',
  essay: 'Essay',
  structured: 'Structured',
  'fill-blanks': 'Fill in the Blanks',
};

const TYPE_COLORS: Record<string, string> = {
  mcq: 'bg-emerald-100 text-emerald-800',
  short: 'bg-amber-100 text-amber-800',
  essay: 'bg-rose-100 text-rose-800',
  structured: 'bg-violet-100 text-violet-800',
  'fill-blanks': 'bg-cyan-100 text-cyan-800',
};

const LANG_LABELS: Record<string, string> = {
  english: 'English',
  sinhala: 'Sinhala (සිංහල)',
  tamil: 'Tamil (தமிழ்)',
};

const LANG_COLORS: Record<string, string> = {
  english: 'bg-emerald-100 text-emerald-800',
  sinhala: 'bg-amber-100 text-amber-800',
  tamil: 'bg-rose-100 text-rose-800',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  hard: 'bg-rose-100 text-rose-800',
};

const TAG_COLORS = [
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
];

const GRADES = [
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'O/L',
  'A/L',
];

const SUBJECT_SUGGESTIONS = [
  'Mathematics',
  'Science',
  'English',
  'Sinhala',
  'Tamil',
  'History',
  'Geography',
  'ICT',
  'Biology',
  'Physics',
  'Chemistry',
  'Commerce',
  'Accounting',
  'Economics',
  'Art',
  'Music',
  'Health & PE',
  'Buddhism',
  'Hinduism',
  'Islam',
  'Christianity',
];

function getTagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────

export function QuestionBank() {
  // List state
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);

  // Expanded / UI
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<Record<string, any>>({
    text: '',
    type: 'short',
    marks: '',
    subject: '',
    grade: '',
    language: 'english',
    difficulty: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    randomizeOptions: true,
  });
  const [addTags, setAddTags] = useState<string[]>([]);
  const [addTagInput, setAddTagInput] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Similar dialog
  const [similarDialog, setSimilarDialog] = useState<{
    open: boolean;
    questionText: string;
    results: any[];
    loading: boolean;
  }>({ open: false, questionText: '', results: [], loading: false });

  // Suggest answer loading
  const [suggestingId, setSuggestingId] = useState<string | null>(null);

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // ─── Fetch questions ──────────────────────────────────────────────

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (filterSubject) params.set('subject', filterSubject);
      if (filterType) params.set('type', filterType);
      if (filterLanguage) params.set('language', filterLanguage);
      if (filterDifficulty) params.set('difficulty', filterDifficulty);
      if (filterTags.length > 0) {
        // Apply first selected tag filter
        params.set('tag', filterTags[0]);
      }

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setQuestions(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterSubject, filterType, filterLanguage, filterDifficulty, filterTags]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (!res.ok) return;
      const data = await res.json();
      setAvailableTags(data);
    } catch {
      // Silent fail for tags
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, filterSubject, filterType, filterLanguage, filterDifficulty, filterTags]);

  // ─── Search debounce ──────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      // search state update triggers re-fetch via useEffect
    }, 300);
  };

  // ─── Delete ───────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/questions/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Question deleted');
      setQuestions((prev) => prev.filter((q) => q.id !== deleteId));
      setTotal((prev) => prev - 1);
      setDeleteId(null);
    } catch {
      toast.error('Failed to delete question');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Edit ─────────────────────────────────────────────────────────

  const startEdit = (q: BankQuestion) => {
    setEditingQuestion(q);
    const opts = q.options ? JSON.parse(q.options) : ['', '', '', ''];
    setEditForm({
      text: q.text,
      type: q.type,
      marks: q.marks ?? '',
      subject: q.subject || '',
      grade: q.grade || '',
      language: q.language,
      difficulty: q.difficulty || '',
      options: opts,
      correctAnswer: q.correctAnswer || '',
      randomizeOptions: q.randomizeOptions,
    });
    setEditTags(q.tags.map((t) => t.name));
    setEditTagInput('');
  };

  const saveEdit = async () => {
    if (!editingQuestion) return;
    if (!editForm.text?.trim()) {
      toast.error('Question text is required');
      return;
    }
    setEditSaving(true);
    try {
      const body: Record<string, any> = {
        text: editForm.text.trim(),
        type: editForm.type,
        language: editForm.language,
        tagNames: editTags,
        difficulty: editForm.difficulty || null,
        subject: editForm.subject || null,
        grade: editForm.grade || null,
        marks: editForm.marks ? Number(editForm.marks) : null,
        randomizeOptions: editForm.randomizeOptions,
      };
      if (editForm.type === 'mcq') {
        const filled = editForm.options.filter((o: string) => o.trim());
        body.options = filled.length > 0 ? filled : null;
        body.correctAnswer = editForm.correctAnswer || null;
      } else {
        body.options = null;
        body.correctAnswer = null;
      }

      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Question updated');
      setEditingQuestion(null);
      fetchQuestions();
      fetchTags();
    } catch {
      toast.error('Failed to update question');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Add ──────────────────────────────────────────────────────────

  const handleAddSave = async () => {
    if (!addForm.text?.trim()) {
      toast.error('Question text is required');
      return;
    }
    setAddSaving(true);
    try {
      const body: Record<string, any> = {
        text: addForm.text.trim(),
        type: addForm.type,
        language: addForm.language,
        tagNames: addTags,
      };
      if (addForm.marks) body.marks = Number(addForm.marks);
      if (addForm.subject.trim()) body.subject = addForm.subject.trim();
      if (addForm.grade) body.grade = addForm.grade;
      if (addForm.difficulty) body.difficulty = addForm.difficulty;
      if (addForm.type === 'mcq') {
        const filled = addForm.options.filter((o: string) => o.trim());
        if (filled.length > 0) body.options = filled;
        if (addForm.correctAnswer.trim()) body.correctAnswer = addForm.correctAnswer.trim();
        body.randomizeOptions = addForm.randomizeOptions;
      }

      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create');
      toast.success('Question added to bank');
      setAddOpen(false);
      setAddForm({
        text: '',
        type: 'short',
        marks: '',
        subject: '',
        grade: '',
        language: 'english',
        difficulty: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        randomizeOptions: true,
      });
      setAddTags([]);
      setAddTagInput('');
      fetchQuestions();
      fetchTags();
    } catch {
      toast.error('Failed to add question');
    } finally {
      setAddSaving(false);
    }
  };

  // ─── Suggest Answer ───────────────────────────────────────────────

  const handleSuggestAnswer = async (questionId: string) => {
    setSuggestingId(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}/suggest-answer`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to suggest answer');
      const data = await res.json();
      // Update local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, suggestedAnswer: data.suggestedAnswer, markScheme: data.markScheme }
            : q
        )
      );
      toast.success('Answer suggested');
    } catch {
      toast.error('Failed to suggest answer');
    } finally {
      setSuggestingId(null);
    }
  };

  // ─── Generate Similar ──────────────────────────────────────────────

  const handleSimilar = async (q: BankQuestion) => {
    setSimilarDialog({ open: true, questionText: q.text, results: [], loading: true });
    try {
      const res = await fetch(`/api/questions/${q.id}/similar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3 }),
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      setSimilarDialog((prev) => ({ ...prev, results: data.suggestions || [], loading: false }));
    } catch {
      setSimilarDialog((prev) => ({ ...prev, loading: false }));
      toast.error('Failed to generate similar questions');
    }
  };

  // ─── Tag helpers ──────────────────────────────────────────────────

  const toggleFilterTag = (name: string) => {
    setFilterTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  // ─── Render ────────────────────────────────────────────────────────

  const hasActiveFilters =
    filterSubject || filterType || filterLanguage || filterDifficulty || filterTags.length > 0;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4" aria-label="Question Bank">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Question Bank</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {total} question{total !== 1 ? 's' : ''} in your bank
          </p>
        </div>
        <Button size="sm" className="gap-1.5 w-fit" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Subject filter */}
            <Select value={filterSubject} onValueChange={(v) => setFilterSubject(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Subjects</SelectItem>
                {SUBJECT_SUGGESTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={filterType} onValueChange={(v) => setFilterType(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {(Object.entries(TYPE_LABELS) as [string, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Language filter */}
            <Select value={filterLanguage} onValueChange={(v) => setFilterLanguage(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Languages</SelectItem>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="sinhala">Sinhala</SelectItem>
                <SelectItem value="tamil">Tamil</SelectItem>
              </SelectContent>
            </Select>

            {/* Difficulty filter */}
            <Select value={filterDifficulty} onValueChange={(v) => setFilterDifficulty(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag filter popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                  {filterTags.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {filterTags.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <p className="text-xs font-medium mb-2">Filter by Tags</p>
                {availableTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tags available</p>
                ) : (
                  <ScrollArea className="max-h-48">
                    <div className="space-y-1">
                      {availableTags.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 py-0.5 cursor-pointer"
                        >
                          <Checkbox
                            checked={filterTags.includes(t.name)}
                            onCheckedChange={() => toggleFilterTag(t.name)}
                          />
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getTagColor(t.name)}`}
                          >
                            {t.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {t.questionCount}
                          </span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </PopoverContent>
            </Popover>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setFilterSubject('');
                  setFilterType('');
                  setFilterLanguage('');
                  setFilterDifficulty('');
                  setFilterTags([]);
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question List */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="gap-0">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">No questions found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            {hasActiveFilters
              ? 'Try adjusting your filters or search query'
              : 'Add questions by scanning exam papers or using the Generate tab'}
          </p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q) => {
            const isExpanded = expandedId === q.id;
            const isEditing = editingQuestion?.id === q.id;
            const parsedOptions = q.options ? JSON.parse(q.options) : null;

            return (
              <Card key={q.id} className="gap-0">
                <CardContent className="p-4 space-y-2">
                  {!isEditing ? (
                    <>
                      {/* Question summary row */}
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm leading-relaxed cursor-pointer flex-1"
                          onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        >
                          {q.text}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={`text-xs ${TYPE_COLORS[q.type] || ''}`}>
                          {TYPE_LABELS[q.type] || q.type}
                        </Badge>
                        {q.marks && (
                          <Badge variant="outline" className="text-xs">
                            {q.marks} mark{q.marks !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {q.subject && (
                          <Badge variant="outline" className="text-xs">
                            {q.subject}
                          </Badge>
                        )}
                        {q.grade && (
                          <Badge variant="outline" className="text-xs">
                            {q.grade}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${LANG_COLORS[q.language] || ''}`}>
                          {LANG_LABELS[q.language] || q.language}
                        </Badge>
                        {q.difficulty && (
                          <Badge className={`text-xs ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>
                            {q.difficulty}
                          </Badge>
                        )}
                        {q.tags.map((t) => (
                          <Badge
                            key={t.id}
                            variant="secondary"
                            className={`text-xs ${getTagColor(t.name)}`}
                          >
                            {t.name}
                          </Badge>
                        ))}
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="space-y-3 pt-2 border-t border-border">
                          {/* MCQ Options */}
                          {q.type === 'mcq' && parsedOptions && (
                            <div className="space-y-1 pl-2">
                              {parsedOptions.map((opt: string, i: number) => (
                                <p
                                  key={i}
                                  className={`text-sm ${
                                    q.correctAnswer === String.fromCharCode(65 + i)
                                      ? 'font-medium text-emerald-700'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {String.fromCharCode(65 + i)}. {opt}
                                  {q.correctAnswer === String.fromCharCode(65 + i) && ' ✓'}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Suggested Answer */}
                          {q.suggestedAnswer && (
                            <div className="rounded-md bg-muted/50 p-3 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Suggested Answer
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{q.suggestedAnswer}</p>
                              {q.markScheme && (
                                <>
                                  <p className="text-xs font-medium text-muted-foreground pt-1">
                                    Mark Scheme
                                  </p>
                                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                    {q.markScheme}
                                  </p>
                                </>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => startEdit(q)}
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleSimilar(q)}
                            >
                              <Sparkles className="h-3 w-3" />
                              Similar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={suggestingId === q.id}
                              onClick={() => handleSuggestAnswer(q.id)}
                            >
                              {suggestingId === q.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                              {q.suggestedAnswer ? 'Re-suggest' : 'Suggest Answer'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => toast.info('Coming soon!')}
                            >
                              <BookPlus className="h-3 w-3" />
                              Add to Paper
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(q.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Inline Edit Mode */
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Question Text</Label>
                        <Textarea
                          value={editForm.text || ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, text: e.target.value }))
                          }
                          className="min-h-[80px] text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={editForm.type}
                            onValueChange={(v) => setEditForm((prev) => ({ ...prev, type: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(TYPE_LABELS) as [string, string][]).map(
                                ([v, l]) => (
                                  <SelectItem key={v} value={v}>
                                    {l}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Marks</Label>
                          <Input
                            type="number"
                            min={0}
                            value={editForm.marks || ''}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, marks: e.target.value }))
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Difficulty</Label>
                          <Select
                            value={editForm.difficulty || ''}
                            onValueChange={(v) =>
                              setEditForm((prev) => ({
                                ...prev,
                                difficulty: v === '__none__' ? '' : v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Subject</Label>
                          <Input
                            value={editForm.subject || ''}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, subject: e.target.value }))
                            }
                            className="h-8 text-xs"
                            list="edit-subject-suggestions"
                          />
                          <datalist id="edit-subject-suggestions">
                            {SUBJECT_SUGGESTIONS.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Grade</Label>
                          <Select
                            value={editForm.grade || ''}
                            onValueChange={(v) =>
                              setEditForm((prev) => ({
                                ...prev,
                                grade: v === '__none__' ? '' : v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {GRADES.map((g) => (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Language</Label>
                          <Select
                            value={editForm.language}
                            onValueChange={(v) =>
                              setEditForm((prev) => ({ ...prev, language: v }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="english">English</SelectItem>
                              <SelectItem value="sinhala">Sinhala</SelectItem>
                              <SelectItem value="tamil">Tamil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* MCQ Options in edit mode */}
                      {editForm.type === 'mcq' && (
                        <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                          <Label className="text-xs font-medium">MCQ Options</Label>
                          <RadioGroup
                            value={editForm.correctAnswer || ''}
                            onValueChange={(v) =>
                              setEditForm((prev) => ({ ...prev, correctAnswer: v }))
                            }
                            className="space-y-1.5"
                          >
                            {(editForm.options as string[]).map((opt: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <RadioGroupItem
                                  value={String.fromCharCode(65 + i)}
                                  id={`edit-opt-${i}`}
                                />
                                <Label
                                  htmlFor={`edit-opt-${i}`}
                                  className="text-xs font-medium w-4 shrink-0"
                                >
                                  {String.fromCharCode(65 + i)}
                                </Label>
                                <Input
                                  value={opt}
                                  onChange={(e) => {
                                    const next = [...(editForm.options as string[])];
                                    next[i] = e.target.value;
                                    setEditForm((prev) => ({ ...prev, options: next }));
                                  }}
                                  className="h-7 text-xs"
                                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                />
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      )}

                      {/* Tags in edit mode */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tags</Label>
                        <div className="flex gap-1.5">
                          <Input
                            value={editTagInput}
                            onChange={(e) => setEditTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const t = editTagInput.trim();
                                if (t && !editTags.includes(t)) {
                                  setEditTags((prev) => [...prev, t]);
                                  setEditTagInput('');
                                }
                              }
                            }}
                            placeholder="Add tag..."
                            className="h-7 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              const t = editTagInput.trim();
                              if (t && !editTags.includes(t)) {
                                setEditTags((prev) => [...prev, t]);
                                setEditTagInput('');
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {editTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {editTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className={`text-xs gap-1 ${getTagColor(tag)}`}
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditTags((prev) => prev.filter((t) => t !== tag))
                                  }
                                  className="hover:opacity-70"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit actions */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={editSaving}
                          onClick={saveEdit}
                        >
                          {editSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setEditingQuestion(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Add Question Dialog ────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Manually add a new question to the bank
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Question Text <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Type or paste the question text here..."
                  value={addForm.text}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, text: e.target.value }))
                  }
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={addForm.type}
                    onValueChange={(v) => setAddForm((prev) => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(TYPE_LABELS) as [string, string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 5"
                    value={addForm.marks}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, marks: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Difficulty</Label>
                  <Select
                    value={addForm.difficulty || ''}
                    onValueChange={(v) =>
                      setAddForm((prev) => ({
                        ...prev,
                        difficulty: v === '__none__' ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {addForm.type === 'mcq' && (
                <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                  <Label className="text-sm font-medium">MCQ Options</Label>
                  <RadioGroup
                    value={addForm.correctAnswer || ''}
                    onValueChange={(v) =>
                      setAddForm((prev) => ({ ...prev, correctAnswer: v }))
                    }
                    className="space-y-1.5"
                  >
                    {(addForm.options as string[]).map((opt: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <RadioGroupItem
                          value={String.fromCharCode(65 + i)}
                          id={`add-opt-${i}`}
                        />
                        <Label
                          htmlFor={`add-opt-${i}`}
                          className="text-xs font-medium w-4 shrink-0"
                        >
                          {String.fromCharCode(65 + i)}
                        </Label>
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const next = [...(addForm.options as string[])];
                            next[i] = e.target.value;
                            setAddForm((prev) => ({ ...prev, options: next }));
                          }}
                          className="h-7 text-sm"
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Subject</Label>
                  <Input
                    placeholder="e.g. Mathematics"
                    value={addForm.subject}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className="h-8 text-sm"
                    list="add-subject-suggestions"
                  />
                  <datalist id="add-subject-suggestions">
                    {SUBJECT_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label>Grade</Label>
                  <Select
                    value={addForm.grade || ''}
                    onValueChange={(v) =>
                      setAddForm((prev) => ({
                        ...prev,
                        grade: v === '__none__' ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Language</Label>
                  <Select
                    value={addForm.language}
                    onValueChange={(v) =>
                      setAddForm((prev) => ({ ...prev, language: v }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="sinhala">Sinhala</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label>Tags</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={addTagInput}
                    onChange={(e) => setAddTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const t = addTagInput.trim();
                        if (t && !addTags.includes(t)) {
                          setAddTags((prev) => [...prev, t]);
                          setAddTagInput('');
                        }
                      }
                    }}
                    placeholder="Type a tag and press Enter"
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                      const t = addTagInput.trim();
                      if (t && !addTags.includes(t)) {
                        setAddTags((prev) => [...prev, t]);
                        setAddTagInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                {addTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {addTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={`text-xs gap-1 ${getTagColor(tag)}`}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            setAddTags((prev) => prev.filter((t) => t !== tag))
                          }
                          className="hover:opacity-70"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSave}
              disabled={addSaving || !addForm.text?.trim()}
            >
              {addSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add to Bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this question from the bank. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Similar Questions Dialog ───────────────────────────────── */}
      <Dialog
        open={similarDialog.open}
        onOpenChange={(open) => setSimilarDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Similar Questions</DialogTitle>
            <DialogDescription>
              AI-generated questions similar to: &quot;
              {similarDialog.questionText.slice(0, 100)}
              {similarDialog.questionText.length > 100 ? '...' : ''}&quot;
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {similarDialog.loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Generating similar questions...
              </div>
            )}
            {!similarDialog.loading && similarDialog.results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No similar questions generated
              </p>
            )}
            {!similarDialog.loading &&
              similarDialog.results.map((r: any, i: number) => (
                <Card key={r.id || i} className="mb-3 gap-0">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm">{r.text}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`text-xs ${TYPE_COLORS[r.type] || ''}`}>
                        {TYPE_LABELS[r.type] || r.type}
                      </Badge>
                      {r.marks && (
                        <Badge variant="outline" className="text-xs">
                          {r.marks} marks
                        </Badge>
                      )}
                      {r.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {r.difficulty}
                        </Badge>
                      )}
                    </div>
                    {r.type === 'mcq' && r.options && (
                      <div className="space-y-0.5 pl-3">
                        {Array.isArray(r.options) &&
                          (r.options as string[]).map((opt: string, j: number) => (
                            <p key={j} className="text-xs text-muted-foreground">
                              {String.fromCharCode(65 + j)}. {opt}
                            </p>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </section>
  );
}