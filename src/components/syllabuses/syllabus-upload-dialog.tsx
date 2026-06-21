'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  Save,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { SyllabusData, ChapterData, LessonData } from '@/lib/syllabus-types';

interface SyllabusUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

type UploadState = 'idle' | 'uploading' | 'previewing' | 'saving';

export function SyllabusUploadDialog({
  open,
  onOpenChange,
  onSaved,
}: SyllabusUploadDialogProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<SyllabusData | null>(null);
  const [editing, setEditing] = useState<SyllabusData | null>(null);
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState('idle');
    setProgress(0);
    setFileName(null);
    setExtracted(null);
    setEditing(null);
    setOpenChapters(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setFileName(file.name);
    setState('uploading');
    setProgress(10);

    try {
      setProgress(30);

      const formData = new FormData();
      formData.append('file', file);

      setProgress(50);

      const res = await fetch('/api/syllabuses/extract', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to extract syllabus');
      }

      const data: SyllabusData = await res.json();
      setExtracted(data);
      setEditing({ ...data });

      // Auto-open first few chapters
      const initial = new Set<number>();
      data.chapters.slice(0, 3).forEach((_, i) => initial.add(i));
      setOpenChapters(initial);

      setProgress(100);
      setState('previewing');
      toast.success('Syllabus structure extracted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract syllabus');
      setState('idle');
      setFileName(null);
      setProgress(0);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    []
  );

  const handleSave = async () => {
    if (!editing) return;

    setState('saving');
    try {
      const res = await fetch('/api/syllabuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save syllabus');
      }

      toast.success('Syllabus saved successfully');
      onSaved();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save syllabus');
      setState('previewing');
    }
  };

  // Edit helpers
  const updateField = (field: keyof SyllabusData, value: string | null) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: value });
  };

  const addChapter = () => {
    if (!editing) return;
    const newChapter: ChapterData = {
      name: '',
      order: editing.chapters.length + 1,
      lessons: [],
    };
    setEditing({
      ...editing,
      chapters: [...editing.chapters, newChapter],
    });
  };

  const removeChapter = (idx: number) => {
    if (!editing) return;
    const chapters = editing.chapters
      .filter((_, i) => i !== idx)
      .map((ch, i) => ({ ...ch, order: i + 1 }));
    setEditing({ ...editing, chapters });
  };

  const updateChapter = (idx: number, field: string, value: string) => {
    if (!editing) return;
    const chapters = [...editing.chapters];
    chapters[idx] = { ...chapters[idx], [field]: value };
    setEditing({ ...editing, chapters });
  };

  const addLesson = (chapterIdx: number) => {
    if (!editing) return;
    const chapters = [...editing.chapters];
    const chapter = chapters[chapterIdx];
    const newLesson: LessonData = {
      name: '',
      description: null,
      order: chapter.lessons.length + 1,
    };
    chapters[chapterIdx] = {
      ...chapter,
      lessons: [...chapter.lessons, newLesson],
    };
    setEditing({ ...editing, chapters });
  };

  const removeLesson = (chapterIdx: number, lessonIdx: number) => {
    if (!editing) return;
    const chapters = [...editing.chapters];
    const chapter = chapters[chapterIdx];
    const lessons = chapter.lessons
      .filter((_, i) => i !== lessonIdx)
      .map((ls, i) => ({ ...ls, order: i + 1 }));
    chapters[chapterIdx] = { ...chapter, lessons };
    setEditing({ ...editing, chapters });
  };

  const updateLesson = (
    chapterIdx: number,
    lessonIdx: number,
    field: string,
    value: string
  ) => {
    if (!editing) return;
    const chapters = [...editing.chapters];
    const chapter = chapters[chapterIdx];
    const lessons = [...chapter.lessons];
    lessons[lessonIdx] = { ...lessons[lessonIdx], [field]: value };
    chapters[chapterIdx] = { ...chapter, lessons };
    setEditing({ ...editing, chapters });
  };

  const toggleChapter = (idx: number) => {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const totalLessons = editing?.chapters.reduce(
    (sum, ch) => sum + ch.lessons.length,
    0
  ) ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Syllabus PDF</DialogTitle>
          <DialogDescription>
            {state === 'idle' && 'Upload a PDF file to automatically extract the syllabus structure.'}
            {state === 'uploading' && 'Extracting syllabus structure from PDF...'}
            {state === 'previewing' && 'Review and edit the extracted structure before saving.'}
            {state === 'saving' && 'Saving syllabus to database...'}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Area */}
        {state === 'idle' && (
          <div className="flex-1 flex flex-col gap-4">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Drag & drop a PDF file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF syllabus documents
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        {state === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium truncate max-w-48">{fileName}</span>
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="w-full max-w-xs">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Analyzing document structure...
              </p>
            </div>
          </div>
        )}

        {/* Saving */}
        {state === 'saving' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Saving syllabus...</p>
          </div>
        )}

        {/* Preview & Edit */}
        {state === 'previewing' && editing && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Metadata fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="title" className="text-xs">Title</Label>
                <Input
                  id="title"
                  value={editing.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="subject" className="text-xs">Subject</Label>
                <Input
                  id="subject"
                  value={editing.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="grade" className="text-xs">Grade</Label>
                <Input
                  id="grade"
                  value={editing.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="year" className="text-xs">Year</Label>
                <Input
                  id="year"
                  value={editing.year ?? ''}
                  onChange={(e) => updateField('year', e.target.value || null)}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="language" className="text-xs">Language</Label>
                <Input
                  id="language"
                  value={editing.language}
                  onChange={(e) => updateField('language', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Chapters tree */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {editing.chapters.length} chapters, {totalLessons} lessons
              </div>
              <Button variant="outline" size="sm" onClick={addChapter}>
                <Plus className="h-3.5 w-3.5" />
                Add Chapter
              </Button>
            </div>

            <ScrollArea className="h-64 rounded-md border">
              <div className="p-3 space-y-2">
                {editing.chapters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No chapters extracted. Add chapters manually.
                  </p>
                )}
                {editing.chapters.map((chapter, chIdx) => (
                  <Collapsible
                    key={chIdx}
                    open={openChapters.has(chIdx)}
                    onOpenChange={() => toggleChapter(chIdx)}
                  >
                    <div className="flex items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-1.5 shrink-0">
                          {openChapters.has(chIdx) ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-6 shrink-0">
                        {chIdx + 1}.
                      </span>
                      <Input
                        value={chapter.name}
                        onChange={(e) => updateChapter(chIdx, 'name', e.target.value)}
                        className="h-7 text-sm flex-1"
                        placeholder="Chapter name"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => addLesson(chIdx)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeChapter(chIdx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <CollapsibleContent>
                      <div className="ml-10 mt-1 space-y-1">
                        {chapter.lessons.map((lesson, lsIdx) => (
                          <div key={lsIdx} className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-6 shrink-0">
                              {lsIdx + 1}.
                            </span>
                            <Input
                              value={lesson.name}
                              onChange={(e) =>
                                updateLesson(chIdx, lsIdx, 'name', e.target.value)
                              }
                              className="h-7 text-xs flex-1"
                              placeholder="Lesson name"
                            />
                            <Input
                              value={lesson.description ?? ''}
                              onChange={(e) =>
                                updateLesson(
                                  chIdx,
                                  lsIdx,
                                  'description',
                                  e.target.value
                                )
                              }
                              className="h-7 text-xs w-32 hidden sm:block"
                              placeholder="Description"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => removeLesson(chIdx, lsIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {chapter.lessons.length === 0 && (
                          <p className="text-xs text-muted-foreground pl-7 py-1">
                            No lessons. Click + to add.
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {state === 'idle' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {state === 'previewing' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!editing?.title || !editing?.subject || !editing?.grade}>
                <Save className="h-4 w-4" />
                Save Syllabus
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}