'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, FolderOpen, Pencil, Trash2, Eye, Loader2, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

interface PaperSummary {
  id: string;
  title: string;
  subject: string;
  grade: string | null;
  duration: string | null;
  totalMarks: number | null;
  sectionCount: number;
  questionCount: number;
  createdAt: string;
}

export function PaperList() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPapers = useCallback(async () => {
    try {
      const res = await fetch('/api/papers');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const summaries: PaperSummary[] = data.map((p: any) => ({
        id: p.id,
        title: p.title,
        subject: p.subject,
        grade: p.grade,
        duration: p.duration,
        totalMarks: p.totalMarks,
        sectionCount: p.sections?.length || 0,
        questionCount: p.sections?.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0) || 0,
        createdAt: p.createdAt,
      }));
      setPapers(summaries);
    } catch {
      toast.error('Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/papers/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Paper deleted');
      setPapers((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch {
      toast.error('Failed to delete paper');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6" aria-label="Papers">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Papers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and manage your question papers
          </p>
        </div>
      </div>

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

      {!loading && papers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">No papers yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Generate questions using AI and add them to a paper, or create a paper manually.
              Papers created from the AI generator will appear here.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-4 flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Go to &quot;Generate Questions&quot; to get started
          </p>
        </div>
      )}

      {!loading && papers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => (
            <Card key={paper.id} className="gap-0">
              <CardHeader>
                <CardTitle className="text-base leading-tight line-clamp-2">
                  {paper.title}
                </CardTitle>
                <CardDescription className="line-clamp-1">
                  {paper.subject}
                </CardDescription>
                <CardAction>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(paper.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {paper.grade && (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />
                      {paper.grade}
                    </Badge>
                  )}
                  {paper.duration && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {paper.duration}
                    </Badge>
                  )}
                  {paper.totalMarks && (
                    <Badge variant="outline" className="gap-1">
                      <Target className="h-3 w-3" />
                      {paper.totalMarks} marks
                    </Badge>
                  )}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{paper.sectionCount} section{paper.sectionCount !== 1 ? 's' : ''}</span>
                  <span>{paper.questionCount} question{paper.questionCount !== 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Paper?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this question paper and all its sections and questions.
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