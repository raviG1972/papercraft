'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  Upload,
  X,
  Loader2,
  Copy,
  Check,
  ScanLine,
  Save,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  Tag,
  Undo2,
  Redo2,
  RotateCcw,
  RotateCw,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  Trash2,
  Settings,
  ExternalLink,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { runClientOcr, type OcrProgress, type OcrLanguage } from '@/lib/client-ocr';
import { runAiOcr, getStoredGeminiKey, setStoredGeminiKey } from '@/lib/client-vlm';
import { editorHtmlToPlainText } from '@/components/editor/math-editor';
const MathEditor = dynamic(
  () => import('@/components/editor/math-editor').then(m => ({ default: m.MathEditor })),
  { ssr: false, loading: () => <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">Loading editor…</div> }
);
import { PenLine } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

type QuestionType = 'mcq' | 'short' | 'essay' | 'structured' | 'fill-blanks';

interface SessionQuestion {
  id: string;
  text: string;
  type: QuestionType;
  marks: number | null;
  subject: string;
  grade: string;
  tags: string[];
  suggestedAnswer: string | null;
  markScheme: string | null;
  options: string[] | null;
  correctAnswer: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'MCQ',
  short: 'Short Answer',
  essay: 'Essay',
  structured: 'Structured',
  'fill-blanks': 'Fill in the Blanks',
};

const TYPE_COLORS: Record<QuestionType, string> = {
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

const TAG_COLORS = [
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
  'bg-cyan-100 text-cyan-800',
  'bg-orange-100 text-orange-800',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getTagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ─── ImageFromFile helper ────────────────────────────────────────────────

function ImageFromFile({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <img
      src={url}
      alt={file.name}
      className="max-w-full h-auto object-contain p-4"
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function PaperScanner() {
  // Phase 1: Upload & OCR
  const [scanMode, setScanMode] = useState<'scan' | 'direct'>('scan');
  const [ocrState, setOcrState] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [ocrMode, setOcrMode] = useState<'standard' | 'ai'>('ai');
  const [geminiKey, setGeminiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [originalOcrText, setOriginalOcrText] = useState('');
  const [detectedLang, setDetectedLang] = useState<OcrLanguage>('english');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Phase 2: Question Composer
  const [qText, setQText] = useState('');
  const [qTextHtml, setQTextHtml] = useState('');
  const [qType, setQType] = useState<QuestionType>('short');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [randomize, setRandomize] = useState(true);
  const [marks, setMarks] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [language, setLanguage] = useState('english');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Image Viewer state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFileIndex, setViewerFileIndex] = useState(0);
  const [viewerPdfPage, setViewerPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerPan, setViewerPan] = useState({ x: 0, y: 0 });
  const [viewerReady, setViewerReady] = useState(false);
  const viewerCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerContentRef = useRef<HTMLDivElement>(null);

  // Callback ref — fires when the content div mounts/unmounts inside the portal
  const viewerContentCallbackRef = useCallback((node: HTMLDivElement | null) => {
    viewerContentRef.current = node;
    setViewerReady(!!node);
  }, []);

  // OCR Sessions (save/open)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogTitle, setSaveDialogTitle] = useState('');
  const [saveDialogLoading, setSaveDialogLoading] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Phase 3: Session Questions
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [similarDialog, setSimilarDialog] = useState<{
    open: boolean;
    questionId: string;
    questionText: string;
    results: any[];
    loading: boolean;
  }>({ open: false, questionId: '', questionText: '', results: [], loading: false });

  // ─── Zoom helpers ──────────────────────────────────────────────
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 5;
  const ZOOM_STEP = 0.25;

  const adjustZoom = useCallback((delta: number) => {
    setViewerZoom((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    });
  }, []);

  // ─── Render PDF page in viewer ─────────────────────────────────────

  const renderPdfPage = useCallback(
    async (file: File, pageNum: number, zoom: number) => {
      if (!viewerCanvasRef.current) return;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfTotalPages(pdf.numPages);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 * zoom });
        const canvas = viewerCanvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        toast.error('Failed to render PDF page');
      }
    },
    []
  );

  // ─── Load Gemini API key from localStorage ─────────────────────────
  useEffect(() => {
    setGeminiKey(getStoredGeminiKey());
  }, []);

  // ─── Viewer file change effect ─────────────────────────────────────

  useEffect(() => {
    if (!viewerOpen || uploadedFiles.length === 0) return;
    const file = uploadedFiles[viewerFileIndex];
    if (!file) return;
    setViewerPdfPage(1);
    setPdfTotalPages(0);
    setViewerZoom(1);
    setViewerPan({ x: 0, y: 0 });
    if (file.type === 'application/pdf') {
      renderPdfPage(file, 1, 1);
    }
  }, [viewerOpen, viewerFileIndex, uploadedFiles, renderPdfPage]);

  // Re-render PDF when page or zoom changes
  useEffect(() => {
    if (!viewerOpen || uploadedFiles.length === 0) return;
    const file = uploadedFiles[viewerFileIndex];
    if (file?.type === 'application/pdf') {
      renderPdfPage(file, viewerPdfPage, viewerZoom);
    }
  }, [viewerPdfPage, viewerZoom, viewerOpen, viewerFileIndex, uploadedFiles, renderPdfPage]);

  // Reset zoom when changing files/pages
  useEffect(() => {
    setViewerZoom(1);
  }, [viewerFileIndex, viewerPdfPage]);

  // ─── Keyboard zoom shortcuts ───────────────────────────────────────
  useEffect(() => {
    if (!viewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjustZoom(ZOOM_STEP);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        adjustZoom(-ZOOM_STEP);
      } else if (e.key === '0') {
        e.preventDefault();
        setViewerZoom(1);
        setViewerPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, adjustZoom]);

  // ─── Drag-to-pan, double-click zoom, right-click zoom ───────────
  // Native listeners — must wait for portal content to mount (viewerReady)
  useEffect(() => {
    const el = viewerContentRef.current;
    if (!viewerOpen || !viewerReady || !el) return;

    let isPanning = false;
    let startX = 0;
    let startY = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Right-click → zoom out, prevent context menu
      if (e.button === 2) {
        e.preventDefault();
        adjustZoom(-ZOOM_STEP);
        return;
      }
      // Only left-click pans, not when Ctrl (that's wheel-zoom)
      if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      setViewerPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const onPointerUp = () => {
      if (!isPanning) return;
      isPanning = false;
      el.style.cursor = 'grab';
    };

    const onPointerCancel = () => {
      isPanning = false;
      el.style.cursor = 'grab';
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      adjustZoom(ZOOM_STEP);
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        adjustZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('dblclick', onDblClick);
    el.addEventListener('contextmenu', onContextMenu);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('dblclick', onDblClick);
      el.removeEventListener('contextmenu', onContextMenu);
      el.removeEventListener('wheel', onWheel);
    };
  }, [viewerOpen, viewerReady, adjustZoom]);

  // ─── File handling ─────────────────────────────────────────────────

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    const names: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" is too large (max 20 MB)`);
        continue;
      }
      if (f.type === 'application/pdf' || f.type.startsWith('image/')) {
        valid.push(f);
        names.push(f.name);
      } else {
        toast.error(`"${f.name}" is not a supported file type`);
      }
    }
    if (valid.length === 0) return;

    setUploadedFiles(valid);
    setFileNames(names);
    setOcrState('uploading');
    setProgress(0);
    setProgressMsg('Initializing...');

    const ocrFn = ocrMode === 'ai'
      ? () => runAiOcr(valid, (p) => { setProgress(p.progress); setProgressMsg(p.message); })
      : () => runClientOcr(valid, (p) => { setProgress(p.progress); setProgressMsg(p.message); });

    ocrFn()
      .then((result) => {
        setOcrText(result.text);
        setOriginalOcrText(result.text);
        setDetectedLang(result.language);
        setLanguage(result.language);
        setOcrState('done');
        toast.success(
          `${ocrMode === 'ai' ? 'AI OCR' : 'OCR'} complete — ${result.pageCount} page(s) extracted`
        );
      })
      .catch((err: Error) => {
        toast.error(err.message || 'OCR failed');
        setOcrState('idle');
      });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // ─── Copy text ─────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(ocrText);
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy text');
    }
  }, [ocrText]);

  // ─── Tag management ────────────────────────────────────────────────

  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      toast.error('Tag already added');
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // ─── Save question ─────────────────────────────────────────────────

  const saveQuestion = useCallback(
    async (andComposeAnother = false) => {
      if (!qText.trim()) {
        toast.error('Question text is required');
        return;
      }
      setSaving(true);
      try {
        const body: Record<string, unknown> = {
          text: qText.trim(),
          type: qType,
          language,
          tagNames: tags,
        };
        if (marks) body.marks = Number(marks);
        if (subject.trim()) body.subject = subject.trim();
        if (grade) body.grade = grade;
        if (qType === 'mcq') {
          const filled = options.filter((o) => o.trim());
          if (filled.length > 0) body.options = filled;
          if (correctAnswer.trim()) body.correctAnswer = correctAnswer.trim();
          body.randomizeOptions = randomize;
        }

        const res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save');
        }
        const saved = await res.json();

        const sessionQ: SessionQuestion = {
          id: saved.id,
          text: saved.text,
          type: saved.type,
          marks: saved.marks,
          subject: saved.subject || '',
          grade: saved.grade || '',
          tags: saved.tags?.map((t: { name: string }) => t.name) || [],
          suggestedAnswer: saved.suggestedAnswer,
          markScheme: saved.markScheme,
          options: saved.options ? JSON.parse(saved.options) : null,
          correctAnswer: saved.correctAnswer,
        };
        setSessionQuestions((prev) => [sessionQ, ...prev]);

        // Get total count
        try {
          const countRes = await fetch('/api/questions?limit=1');
          const countData = await countRes.json();
          toast.success(
            `Question saved! Bank now has ${countData.pagination?.total ?? '?'} questions`
          );
        } catch {
          toast.success('Question saved!');
        }

        if (andComposeAnother) {
          setQText('');
          setQTextHtml('');
          setOptions(['', '', '', '']);
          setCorrectAnswer('');
          setMarks('');
          setSubject('');
          setGrade('');
          setTags([]);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save question');
      } finally {
        setSaving(false);
      }
    },
    [qText, qType, language, tags, marks, subject, grade, options, correctAnswer, randomize, qTextHtml]
  );

  // ─── Suggest Answer ────────────────────────────────────────────────

  const handleSuggestAnswer = useCallback(
    async (questionId: string) => {
      try {
        const res = await fetch(`/api/questions/${questionId}/suggest-answer`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Failed to suggest answer');
        const data = await res.json();

        setSessionQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? { ...q, suggestedAnswer: data.suggestedAnswer, markScheme: data.markScheme }
              : q
          )
        );
        toast.success('Answer suggested successfully');
      } catch {
        toast.error('Failed to suggest answer');
      }
    },
    []
  );

  // ─── Generate Similar ──────────────────────────────────────────────

  const handleSimilar = useCallback(async (q: SessionQuestion) => {
    setSimilarDialog({ open: true, questionId: q.id, questionText: q.text, results: [], loading: true });
    try {
      const res = await fetch(`/api/questions/${q.id}/similar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3 }),
      });
      if (!res.ok) throw new Error('Failed to generate similar questions');
      const data = await res.json();
      setSimilarDialog((prev) => ({ ...prev, results: data.suggestions || [], loading: false }));
    } catch {
      setSimilarDialog((prev) => ({ ...prev, loading: false }));
      toast.error('Failed to generate similar questions');
    }
  }, []);

  // ─── Save OCR Session ───────────────────────────────────────────
  const handleSaveSession = useCallback(async () => {
    const title = saveDialogTitle.trim();
    if (!title) { toast.error('Please enter a title'); return; }
    if (!ocrText.trim()) { toast.error('No OCR text to save'); return; }
    setSaveDialogLoading(true);
    try {
      const body: any = {
        title,
        ocrText,
        originalText: originalOcrText,
        fileNames: JSON.stringify(fileNames),
        language: detectedLang,
      };
      if (currentSessionId) body.id = currentSessionId;
      const res = await fetch('/api/ocr-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setCurrentSessionId(data.id);
      setSaveDialogOpen(false);
      setSaveDialogTitle('');
      toast.success(currentSessionId ? 'Session updated!' : 'Session saved!');
    } catch {
      toast.error('Failed to save session');
    } finally {
      setSaveDialogLoading(false);
    }
  }, [saveDialogTitle, ocrText, originalOcrText, fileNames, detectedLang, currentSessionId]);

  // ─── Update current session's OCR text ─────────────────────────
  const handleUpdateSession = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      await fetch(`/api/ocr-sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText, originalText: originalOcrText }),
      });
    } catch { /* silent update */ }
  }, [currentSessionId, ocrText, originalOcrText]);

  // ─── Open Saved Sessions dialog ────────────────────────────────
  const handleOpenSessions = useCallback(async () => {
    setOpenDialogOpen(true);
    setLoadingSessions(true);
    setSessionSearch('');
    try {
      const res = await fetch('/api/ocr-sessions');
      if (res.ok) {
        const data = await res.json();
        setSavedSessions(data.sessions || []);
      }
    } catch { /* empty list */ }
    setLoadingSessions(false);
  }, []);

  // ─── Load a saved session ───────────────────────────────────────
  const handleLoadSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ocr-sessions/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setOcrText(data.ocrText || '');
      setOriginalOcrText(data.originalText || data.ocrText || '');
      setFileNames(() => {
        try { return JSON.parse(data.fileNames || '[]'); }
        catch { return []; }
      });
      setDetectedLang((data.language as OcrLanguage) || 'english');
      setOcrState('done');
      setCurrentSessionId(data.id);
      setSessionQuestions([]);
      setOpenDialogOpen(false);
      toast.success('Session loaded!');
    } catch {
      toast.error('Failed to load session');
    }
  }, []);

  // ─── Delete a saved session ─────────────────────────────────────
  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/ocr-sessions/${id}`, { method: 'DELETE' });
      setSavedSessions((prev) => prev.filter((s: any) => s.id !== id));
      if (currentSessionId === id) setCurrentSessionId(null);
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete');
    }
  }, [currentSessionId]);

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6" aria-label="Scan & Compose">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {scanMode === 'scan' ? 'Scan & Compose' : 'Direct Entry'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {scanMode === 'scan'
              ? 'Upload exam papers, extract text via OCR, then compose questions for your bank'
              : 'Type or paste questions with math equations directly — supports MS Word paste'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border p-0.5 mr-1">
            <button
              type="button"
              className={`px-2.5 py-1 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                scanMode === 'scan'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setScanMode('scan')}
            >
              <ScanLine className="h-3 w-3" />
              Scan
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                scanMode === 'direct'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setScanMode('direct')}
            >
              <PenLine className="h-3 w-3" />
              Type / Paste
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleOpenSessions}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open Saved
          </Button>
          {ocrState === 'done' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                setSaveDialogTitle(currentSessionId ? '' : '');
                setSaveDialogOpen(true);
              }}
            >
              <Save className="h-3.5 w-3.5" />
              {currentSessionId ? 'Update' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* ── SCAN MODE ────────────────────────────────────────────── */}
      {scanMode === 'scan' && (
        <>
      {/* ── Phase 1: Upload & OCR (idle / uploading) ─────────────── */}
      {(ocrState === 'idle' || ocrState === 'uploading') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              Upload & Extract Text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ocrState === 'idle' && (
              <>
                {/* OCR Mode Toggle */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium shrink-0">Extraction:</Label>
                  <div className="flex rounded-lg border p-0.5">
                    <button
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                        ocrMode === 'ai'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setOcrMode('ai')}
                    >
                      <Sparkles className="h-3 w-3" />
                      AI OCR
                    </button>
                    <button
                      className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                        ocrMode === 'standard'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setOcrMode('standard')}
                    >
                      Standard
                    </button>
                  </div>
                  {ocrMode === 'ai' ? (
                    <span className="text-xs text-muted-foreground">
                      Recommended — better accuracy for all text
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Less accurate for math &amp; mixed language
                    </span>
                  )}
                </div>

                {/* Gemini API Key setup (only shown in AI OCR mode) */}
                {ocrMode === 'ai' && (
                  <div className="space-y-2">
                    {showKeyInput ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={keyVisible ? 'text' : 'password'}
                            placeholder="Paste your Gemini API key here..."
                            value={geminiKey}
                            onChange={(e) => {
                              setGeminiKey(e.target.value);
                              setStoredGeminiKey(e.target.value);
                            }}
                            className="pr-9 text-xs h-8"
                          />
                          <button
                            type="button"
                            onClick={() => setKeyVisible(!keyVisible)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {keyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs shrink-0"
                          onClick={() => setShowKeyInput(false)}
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowKeyInput(true)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors ${
                            geminiKey
                              ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                              : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400'
                          }`}
                        >
                          <Settings className="h-3 w-3" />
                          {geminiKey ? 'API Key ✓ Set' : 'Set API Key'}
                        </button>
                        {!geminiKey && (
                          <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Get free key <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {geminiKey && (
                          <span className="text-xs text-muted-foreground">
                            Free tier — 15 requests/min
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload PDF or image files"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drop files here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF or images (PNG, JPG, WEBP) — max 20 MB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
              </>
            )}

            {ocrState === 'uploading' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{progressMsg}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {fileNames.length > 0
                    ? `Processing: ${fileNames.join(', ')}`
                    : 'Processing...'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Two-Column: OCR Text + Question Composer ─────────────────── */}
      {ocrState === 'done' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
          {/* LEFT: OCR Text */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <ScanLine className="h-4 w-4" />
                Extracted Text
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 ml-auto"
                  onClick={() => {
                    setViewerFileIndex(0);
                    setViewerPdfPage(1);
                    setViewerOpen(true);
                  }}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  View Original
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload New
                </Button>
              </CardTitle>
              {/* toolbar row */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge className={LANG_COLORS[detectedLang]}>
                    {LANG_LABELS[detectedLang]}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {fileNames.join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Undo (Ctrl+Z)"
                    onClick={() => {
                      ocrTextareaRef.current?.focus();
                      document.execCommand('undo');
                    }}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Undo</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Redo (Ctrl+Y)"
                    onClick={() => {
                      ocrTextareaRef.current?.focus();
                      document.execCommand('redo');
                    }}
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Redo</span>
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Reset to original OCR text"
                    onClick={() => {
                      if (originalOcrText) {
                        setOcrText(originalOcrText);
                        toast.info('Text reset to original OCR output');
                      }
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="sr-only">Reset</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Clear OCR text"
                    onClick={() => {
                      setOcrState('idle');
                      setOcrText('');
                      setOriginalOcrText('');
                      setFileNames([]);
                      setUploadedFiles([]);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear</span>
                  </Button>
                </div>
              </div>
              {/* hidden file input for Upload New */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <Textarea
                ref={ocrTextareaRef}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                className="h-full min-h-[300px] lg:min-h-0 text-sm font-mono resize-none bg-muted/30"
                placeholder="Extracted text will appear here. You can edit it freely — cut, paste, rearrange, add spaces..."
              />
            </CardContent>
          </Card>

          {/* RIGHT: Question Composer */}
          <Card className="flex flex-col max-h-[calc(100vh-200px)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Compose Question
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* Question Text */}
          <div className="space-y-1.5">
            <Label htmlFor="q-text">
              Question Text <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="q-text"
              placeholder="Type or paste the question text here..."
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="min-h-[100px] resize-y"
            />
          </div>

          {/* Type + Marks row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Question Type <span className="text-destructive">*</span>
              </Label>
              <Select value={qType} onValueChange={(v) => setQType(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marks</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 5"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
          </div>

          {/* MCQ Options (only for MCQ) */}
          {qType === 'mcq' && (
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
              <Label className="text-sm font-medium">MCQ Options</Label>
              <RadioGroup
                value={correctAnswer}
                onValueChange={setCorrectAnswer}
                className="space-y-2"
              >
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={String.fromCharCode(65 + i)}
                      id={`opt-${i}`}
                    />
                    <Label
                      htmlFor={`opt-${i}`}
                      className="text-xs font-medium w-5 shrink-0"
                    >
                      {String.fromCharCode(65 + i)}.
                    </Label>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </RadioGroup>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="randomize"
                  checked={randomize}
                  onCheckedChange={(v) => setRandomize(v === true)}
                />
                <Label htmlFor="randomize" className="text-xs text-muted-foreground">
                  Randomize answer order in question paper
                </Label>
              </div>
            </div>
          )}

          {/* Subject + Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                list="subject-suggestions"
              />
              <datalist id="subject-suggestions">
                {SUBJECT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="sinhala">Sinhala (සිංහල)</SelectItem>
                <SelectItem value="tamil">Tamil (தமிழ்)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={addTag}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={`gap-1 text-xs ${getTagColor(tag)}`}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:opacity-70"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => saveQuestion(false)}
                  disabled={saving || !qText.trim()}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save to Question Bank
                </Button>
                <Button
                  variant="outline"
                  onClick={() => saveQuestion(true)}
                  disabled={saving || !qText.trim()}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Save & Compose Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}

      {/* ── DIRECT ENTRY MODE ───────────────────────────────────── */}
      {scanMode === 'direct' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              Type or Paste Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Math Editor */}
            <MathEditor
              content={qTextHtml}
              onChange={(html, text) => {
                setQTextHtml(html);
                setQText(editorHtmlToPlainText(html));
              }}
              placeholder="Type your question here with math equations...&#10;&#10;Examples:&#10;• The area of a circle is $A = \pi r^2$&#10;• Solve: $$\frac{x+1}{x-1} = 3$$&#10;• Find $\int_0^1 x^2 \, dx$&#10;&#10;You can also paste directly from MS Word!"
              minHeight="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              💡 Paste from MS Word — equations are auto-detected. Type{' '}
              <code className="bg-muted px-1 rounded text-[11px]">$formula$</code> for inline math,{' '}
              <code className="bg-muted px-1 rounded text-[11px]">$$formula$$</code> for display math. Double-click to edit.
            </p>

            <Separator />

            {/* Question Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={qType} onValueChange={(v) => setQType(v as QuestionType)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short Answer</SelectItem>
                    <SelectItem value="essay">Essay</SelectItem>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="structured">Structured</SelectItem>
                    <SelectItem value="fill-blanks">Fill Blanks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Marks</Label>
                <Input
                  type="number" min="0" max="100"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="e.g. 5"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Grade</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MCQ Options (conditional) */}
            {qType === 'mcq' && (
              <div className="space-y-2">
                <Label className="text-xs">Answer Options</Label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{String.fromCharCode(65 + idx)}</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <Label className="text-xs shrink-0">Correct:</Label>
                  <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue placeholder="?" /></SelectTrigger>
                    <SelectContent>
                      {options.filter(o => o.trim()).map((_, idx) => (
                        <SelectItem key={idx} value={String.fromCharCode(65 + idx)}>
                          {String.fromCharCode(65 + idx)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-xs ml-auto cursor-pointer">
                    <Checkbox checked={randomize} onCheckedChange={(v) => setRandomize(!!v)} className="h-3.5 w-3.5" />
                    Shuffle
                  </label>
                </div>
              </div>
            )}

            {/* Language + Tags row */}
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="sinhala">සිංහල</SelectItem>
                    <SelectItem value="tamil">தமிழ்</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag..."
                    className="h-8 text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={addTag}>Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                        {t} <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">&times;</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={saving || !qText.trim()}
                onClick={() => saveQuestion(false)}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save to Question Bank
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={saving || !qText.trim()}
                onClick={() => saveQuestion(true)}
              >
                <Plus className="h-4 w-4" />
                Save & Compose Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Phase 3: Session Questions ─────────────────────────────── */}
      {sessionQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Questions Composed This Session
              <Badge variant="secondary" className="ml-1">
                {sessionQuestions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {sessionQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm line-clamp-1 flex-1">{q.text}</p>
                      <Badge className={`shrink-0 text-xs ${TYPE_COLORS[q.type] || ''}`}>
                        {TYPE_LABELS[q.type] || q.type}
                      </Badge>
                    </div>

                    {expandedId === q.id && (
                      <div className="space-y-2 pt-1 border-t border-border">
                        <p className="text-sm whitespace-pre-wrap">{q.text}</p>
                        {q.type === 'mcq' && q.options && (
                          <div className="space-y-1">
                            {q.options.map((opt, i) => (
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
                        {q.suggestedAnswer && (
                          <div className="rounded-md bg-muted/50 p-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Suggested Answer
                            </p>
                            <p className="text-sm whitespace-pre-wrap">
                              {q.suggestedAnswer}
                            </p>
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
                        {q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {q.tags.map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className={`text-xs ${getTagColor(t)}`}
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() =>
                          setExpandedId(expandedId === q.id ? null : q.id)
                        }
                      >
                        {expandedId === q.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {expandedId === q.id ? 'Collapse' : 'View'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleSimilar(q)}
                      >
                        <Sparkles className="h-3 w-3" />
                        Similar
                      </Button>
                      {!q.suggestedAnswer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleSuggestAnswer(q.id)}
                        >
                          <Eye className="h-3 w-3" />
                          Suggest Answer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ── Image Viewer Dialog ───────────────────────────────────── */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Original Document
              {uploadedFiles.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  — File {viewerFileIndex + 1} of {uploadedFiles.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {uploadedFiles[viewerFileIndex]?.name}
            </DialogDescription>
          </DialogHeader>

          {/* File navigation for multi-file */}
          {uploadedFiles.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={viewerFileIndex === 0}
                onClick={() => {
                  setViewerFileIndex((i) => i - 1);
                  setViewerPdfPage(1);
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev File
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={viewerFileIndex >= uploadedFiles.length - 1}
                onClick={() => {
                  setViewerFileIndex((i) => i + 1);
                  setViewerPdfPage(1);
                }}
              >
                Next File
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* PDF page navigation */}
          {uploadedFiles[viewerFileIndex]?.type === 'application/pdf' && pdfTotalPages > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={viewerPdfPage <= 1}
                onClick={() => setViewerPdfPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev Page
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {viewerPdfPage} of {pdfTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={viewerPdfPage >= pdfTotalPages}
                onClick={() => setViewerPdfPage((p) => p + 1)}
              >
                Next Page
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Zoom Out (−)"
              disabled={viewerZoom <= ZOOM_MIN}
              onClick={() => adjustZoom(-ZOOM_STEP)}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium tabular-nums min-w-[3.5rem] text-center">
              {Math.round(viewerZoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Zoom In (+)"
              disabled={viewerZoom >= ZOOM_MAX}
              onClick={() => adjustZoom(ZOOM_STEP)}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1"
              title="Reset Zoom (0)"
              onClick={() => { setViewerZoom(1); setViewerPan({ x: 0, y: 0 }); }}
            >
              <RotateCw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <span className="text-xs text-muted-foreground">
              Drag to pan · Double-click to zoom in · Right-click to zoom out
            </span>
          </div>

          {/* Content area */}
          <div
            ref={viewerContentCallbackRef}
            className="flex-1 overflow-hidden flex items-start justify-center min-h-0 bg-muted/20 rounded-lg border select-none"
            style={{ cursor: 'grab' }}
          >
            {uploadedFiles[viewerFileIndex]?.type === 'application/pdf' ? (
              <div
                className="p-4 w-full flex justify-center"
                style={{
                  transform: `translate(${viewerPan.x}px, ${viewerPan.y}px)`,
                  willChange: 'transform',
                }}
              >
                <canvas ref={viewerCanvasRef} className="max-w-full h-auto object-contain" />
              </div>
            ) : uploadedFiles[viewerFileIndex]?.type.startsWith('image/') ? (
              <div
                style={{
                  transform: `translate(${viewerPan.x}px, ${viewerPan.y}px) scale(${viewerZoom})`,
                  transformOrigin: '0 0',
                  willChange: 'transform',
                }}
              >
                <ImageFromFile file={uploadedFiles[viewerFileIndex]} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8">Unsupported file type</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Similar Questions Dialog ───────────────────────────────── */}
      <Dialog
        open={similarDialog.open}
        onOpenChange={(open) =>
          setSimilarDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Similar Questions</DialogTitle>
            <DialogDescription>
              AI-generated questions similar to: &quot;{similarDialog.questionText.slice(0, 100)}
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
                        {TYPE_LABELS[r.type as QuestionType] || r.type}
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
                        {Array.isArray(r.options)
                          ? (r.options as string[]).map((opt: string, j: number) => (
                              <p key={j} className="text-xs text-muted-foreground">
                                {String.fromCharCode(65 + j)}. {opt}
                              </p>
                            ))
                          : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Save OCR Session Dialog ────────────────────────────── */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{currentSessionId ? 'Update OCR Session' : 'Save OCR Session'}</DialogTitle>
            <DialogDescription>
              {currentSessionId
                ? 'Update the saved session with current text'
                : 'Save the extracted text for later editing'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-title">Title *</Label>
              <Input
                id="session-title"
                placeholder="e.g. Grade 11 Maths Paper 2024"
                value={saveDialogTitle}
                onChange={(e) => setSaveDialogTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSession();
                }}
                autoFocus
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {fileNames.length > 0 && (
                <p className="mb-1">
                  Files: {fileNames.join(', ')}
                </p>
              )}
              <p>
                Text length: {ocrText.length} characters
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSession} disabled={saveDialogLoading}>
              {saveDialogLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {currentSessionId ? 'Update' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Open Saved Sessions Dialog ─────────────────────────── */}
      <Dialog open={openDialogOpen} onOpenChange={(open) => { setOpenDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Saved OCR Sessions</DialogTitle>
            <DialogDescription>
              Open a previously saved OCR session to continue editing
            </DialogDescription>
          </DialogHeader>
          <div className="mb-3">
            <Input
              placeholder="Search by title..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            {loadingSessions && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            )}
            {!loadingSessions && savedSessions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No saved sessions yet
              </p>
            )}
            {!loadingSessions &&
              savedSessions
                .filter((s: any) =>
                  !sessionSearch || s.title.toLowerCase().includes(sessionSearch.toLowerCase())
                )
                .map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-lg border mb-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadSession(s.id)}>
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()} · {s.language} · {s.ocrText?.length || 0} chars
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteSession(s.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </section>
  );
}