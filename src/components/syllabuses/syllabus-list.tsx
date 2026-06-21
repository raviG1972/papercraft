'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  GraduationCap,
  Calendar,
  FileText,
  Layers,
  Inbox,
  Loader2,
  Globe,
} from 'lucide-react';
import { SyllabusUploadDialog } from './syllabus-upload-dialog';
import { SyllabusEditDialog } from './syllabus-edit-dialog';
import type { SyllabusWithRelations } from '@/lib/syllabus-types';

export function SyllabusList() {
  const [syllabuses, setSyllabuses] = useState<SyllabusWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSyllabuses = useCallback(async () => {
    try {
      const res = await fetch('/api/syllabuses');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSyllabuses(data);
    } catch {
      toast.error('Failed to load syllabuses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyllabuses();
  }, [fetchSyllabuses]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/syllabuses/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Syllabus deleted');
      setSyllabuses((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
    } catch {
      toast.error('Failed to delete syllabus');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditId(id);
    setEditOpen(true);
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6" aria-label="Syllabus Management">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Syllabuses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage your curriculum syllabuses
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          Upload Syllabus PDF
        </Button>
      </div>

      {/* List */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="gap-0">
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && syllabuses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">No syllabuses yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Upload a PDF syllabus document to get started. The AI will automatically extract the structure.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setUploadOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Upload First Syllabus
          </Button>
        </div>
      )}

      {!loading && syllabuses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {syllabuses.map((syllabus) => {
            const chapterCount = syllabus.chapters.length;
            const lessonCount = syllabus.chapters.reduce(
              (sum, ch) => sum + ch.lessons.length,
              0
            );

            return (
              <Card key={syllabus.id} className="gap-0">
                <CardHeader>
                  <CardTitle className="text-base leading-tight line-clamp-2">
                    {syllabus.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-1">
                    {syllabus.subject}
                  </CardDescription>
                  <CardAction>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(syllabus.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(syllabus.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {syllabus.grade}
                    </Badge>
                    {syllabus.year && (
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {syllabus.year}
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1">
                      <Globe className="h-3 w-3" />
                      {syllabus.language}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <SyllabusUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSaved={fetchSyllabuses}
      />

      {/* Edit Dialog */}
      <SyllabusEditDialog
        syllabusId={editId}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchSyllabuses}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Syllabus?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this syllabus and all its chapters and lessons.
              This action cannot be undone.
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
    </section>
  );
}