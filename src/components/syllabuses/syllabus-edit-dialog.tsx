'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
} from 'lucide-react';
import type { SyllabusData, ChapterData, LessonData } from '@/lib/syllabus-types';

interface SyllabusEditDialogProps {
  syllabusId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SyllabusEditDialog({
  syllabusId,
  open,
  onOpenChange,
  onSaved,
}: SyllabusEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SyllabusData | null>(null);
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    if (!syllabusId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/syllabuses/${syllabusId}`);
      if (!res.ok) throw new Error('Failed to fetch syllabus');
      const json = await res.json();
      const syllabus: SyllabusData = {
        id: json.id,
        title: json.title,
        subject: json.subject,
        grade: json.grade,
        year: json.year,
        language: json.language,
        chapters: (json.chapters ?? []).map(
          (ch: { name: string; order: number; lessons: { name: string; description: string | null; order: number }[] }) => ({
            name: ch.name,
            order: ch.order,
            lessons: (ch.lessons ?? []).map(
              (ls: { name: string; description: string | null; order: number }) => ({
                name: ls.name,
                description: ls.description,
                order: ls.order,
              })
            ),
          })
        ),
      };
      setData(syllabus);
      const initial = new Set<number>();
      syllabus.chapters.slice(0, 3).forEach((_, i) => initial.add(i));
      setOpenChapters(initial);
    } catch {
      toast.error('Failed to load syllabus');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [syllabusId, onOpenChange]);

  useEffect(() => {
    if (open && syllabusId) {
      fetchData();
    } else {
      setData(null);
      setOpenChapters(new Set());
    }
  }, [open, syllabusId]);

  const handleClose = () => {
    onOpenChange(false);
    setData(null);
  };

  const handleSave = async () => {
    if (!data || !syllabusId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/syllabuses/${syllabusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update syllabus');
      }

      toast.success('Syllabus updated successfully');
      onSaved();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update syllabus');
    } finally {
      setSaving(false);
    }
  };

  // Edit helpers
  const updateField = (field: keyof SyllabusData, value: string | null) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const addChapter = () => {
    if (!data) return;
    const newChapter: ChapterData = {
      name: '',
      order: data.chapters.length + 1,
      lessons: [],
    };
    setData({
      ...data,
      chapters: [...data.chapters, newChapter],
    });
  };

  const removeChapter = (idx: number) => {
    if (!data) return;
    const chapters = data.chapters
      .filter((_, i) => i !== idx)
      .map((ch, i) => ({ ...ch, order: i + 1 }));
    setData({ ...data, chapters });
  };

  const moveChapter = (idx: number, direction: 'up' | 'down') => {
    if (!data) return;
    const chapters = [...data.chapters];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= chapters.length) return;
    [chapters[idx], chapters[targetIdx]] = [chapters[targetIdx], chapters[idx]];
    const reindexed = chapters.map((ch, i) => ({ ...ch, order: i + 1 }));
    setData({ ...data, chapters: reindexed });
  };

  const updateChapter = (idx: number, field: string, value: string) => {
    if (!data) return;
    const chapters = [...data.chapters];
    chapters[idx] = { ...chapters[idx], [field]: value };
    setData({ ...data, chapters });
  };

  const addLesson = (chapterIdx: number) => {
    if (!data) return;
    const chapters = [...data.chapters];
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
    setData({ ...data, chapters });
  };

  const removeLesson = (chapterIdx: number, lessonIdx: number) => {
    if (!data) return;
    const chapters = [...data.chapters];
    const chapter = chapters[chapterIdx];
    const lessons = chapter.lessons
      .filter((_, i) => i !== lessonIdx)
      .map((ls, i) => ({ ...ls, order: i + 1 }));
    chapters[chapterIdx] = { ...chapter, lessons };
    setData({ ...data, chapters });
  };

  const moveLesson = (chapterIdx: number, lessonIdx: number, direction: 'up' | 'down') => {
    if (!data) return;
    const chapters = [...data.chapters];
    const chapter = chapters[chapterIdx];
    const lessons = [...chapter.lessons];
    const targetIdx = direction === 'up' ? lessonIdx - 1 : lessonIdx + 1;
    if (targetIdx < 0 || targetIdx >= lessons.length) return;
    [lessons[lessonIdx], lessons[targetIdx]] = [lessons[targetIdx], lessons[lessonIdx]];
    const reindexed = lessons.map((ls, i) => ({ ...ls, order: i + 1 }));
    chapters[chapterIdx] = { ...chapter, lessons: reindexed };
    setData({ ...data, chapters });
  };

  const updateLesson = (
    chapterIdx: number,
    lessonIdx: number,
    field: string,
    value: string
  ) => {
    if (!data) return;
    const chapters = [...data.chapters];
    const chapter = chapters[chapterIdx];
    const lessons = [...chapter.lessons];
    lessons[lessonIdx] = { ...lessons[lessonIdx], [field]: value };
    chapters[chapterIdx] = { ...chapter, lessons };
    setData({ ...data, chapters });
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

  const totalLessons = data?.chapters.reduce(
    (sum, ch) => sum + ch.lessons.length,
    0
  ) ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Syllabus
          </DialogTitle>
          <DialogDescription>
            Edit the syllabus metadata, chapters, and lessons.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && data && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="edit-title" className="text-xs">Title</Label>
                <Input
                  id="edit-title"
                  value={data.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="edit-subject" className="text-xs">Subject</Label>
                <Input
                  id="edit-subject"
                  value={data.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-grade" className="text-xs">Grade</Label>
                <Input
                  id="edit-grade"
                  value={data.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-year" className="text-xs">Year</Label>
                <Input
                  id="edit-year"
                  value={data.year ?? ''}
                  onChange={(e) => updateField('year', e.target.value || null)}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-language" className="text-xs">Language</Label>
                <Input
                  id="edit-language"
                  value={data.language}
                  onChange={(e) => updateField('language', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Chapters */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {data.chapters.length} chapters, {totalLessons} lessons
              </div>
              <Button variant="outline" size="sm" onClick={addChapter}>
                <Plus className="h-3.5 w-3.5" />
                Add Chapter
              </Button>
            </div>

            <ScrollArea className="h-64 rounded-md border">
              <div className="p-3 space-y-2">
                {data.chapters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No chapters. Click &quot;Add Chapter&quot; to create one.
                  </p>
                )}
                {data.chapters.map((chapter, chIdx) => (
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
                      <div className="flex items-center shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => moveChapter(chIdx, 'up')}
                          disabled={chIdx === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => moveChapter(chIdx, 'down')}
                          disabled={chIdx === data.chapters.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
                                updateLesson(chIdx, lsIdx, 'description', e.target.value)
                              }
                              className="h-7 text-xs w-32 hidden sm:block"
                              placeholder="Description"
                            />
                            <div className="flex items-center shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-6 p-0"
                                onClick={() => moveLesson(chIdx, lsIdx, 'up')}
                                disabled={lsIdx === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-6 p-0"
                                onClick={() => moveLesson(chIdx, lsIdx, 'down')}
                                disabled={lsIdx === chapter.lessons.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
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
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !data?.title || !data?.subject || !data?.grade}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}