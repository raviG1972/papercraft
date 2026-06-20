import { create } from 'zustand';

export interface GeneratedQuestion {
  id: string;
  question: string;
  marks: number;
  type: string;
  difficulty: string;
  suggestedAnswer?: string;
  markScheme?: string;
  options?: string[];
  selected: boolean;
}

interface QuestionGeneratorState {
  questions: GeneratedQuestion[];
  isGenerating: boolean;
  setQuestions: (questions: GeneratedQuestion[]) => void;
  setGenerating: (v: boolean) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearQuestions: () => void;
  getSelected: () => GeneratedQuestion[];
}

export const useQuestionGeneratorStore = create<QuestionGeneratorState>(
  (set, get) => ({
    questions: [],
    isGenerating: false,

    setQuestions: (questions: GeneratedQuestion[]) =>
      set({ questions, isGenerating: false }),

    setGenerating: (v: boolean) => set({ isGenerating: v }),

    toggleSelect: (id: string) =>
      set((state) => ({
        questions: state.questions.map((q) =>
          q.id === id ? { ...q, selected: !q.selected } : q
        ),
      })),

    selectAll: () =>
      set((state) => ({
        questions: state.questions.map((q) => ({ ...q, selected: true })),
      })),

    deselectAll: () =>
      set((state) => ({
        questions: state.questions.map((q) => ({ ...q, selected: false })),
      })),

    clearQuestions: () => set({ questions: [] }),

    getSelected: () => get().questions.filter((q) => q.selected),
  })
);