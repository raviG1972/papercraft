'use client';

import dynamic from 'next/dynamic';

interface QuestionEditorProps {
  content: string;
  questionNumber?: number;
  maxMarks?: number;
  showHeader?: boolean;
  onChange?: (content: string, html: string) => void;
}

const QuestionEditorCore = dynamic(() => import('./question-editor-core'), {
  ssr: false,
  loading: () => (
    <div className="p-4">
      <div className="border rounded-md min-h-[120px] flex items-center justify-center">
        <span className="text-sm text-muted-foreground animate-pulse">
          Loading editor…
        </span>
      </div>
    </div>
  ),
});

export function QuestionEditor(props: QuestionEditorProps) {
  return <QuestionEditorCore {...props} />;
}
