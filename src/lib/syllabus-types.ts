export interface LessonData {
  name: string;
  description: string | null;
  order: number;
}

export interface ChapterData {
  name: string;
  order: number;
  lessons: LessonData[];
}

export interface SyllabusData {
  id?: string;
  title: string;
  subject: string;
  grade: string;
  year: string | null;
  language: string;
  chapters: ChapterData[];
}

export interface SyllabusWithRelations extends Omit<SyllabusData, 'id'> {
  id: string;
  createdAt: string;
  updatedAt: string;
  chapters: (ChapterData & {
    id: string;
    syllabusId: string;
    lessons: (LessonData & { id: string; chapterId: string })[];
  })[];
}