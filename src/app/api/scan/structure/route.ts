import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { callLlm, parseLlmJson } from '@/lib/llm';

// Allow up to 60s for retries on rate limits (requires Vercel Pro)
export const maxDuration = 60;

interface ScannedQuestion {
  id: string;
  number: string;
  text: string;
  type: 'mcq' | 'short' | 'essay' | 'structured';
  options: string[] | null;
  marks: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const { text, language, pageCount } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const result = await structureWithLLM(text, language || 'english', pageCount || 1);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error structuring scan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to structure questions' },
      { status: 500 }
    );
  }
}

async function structureWithLLM(
  fullText: string,
  language: string,
  totalPages: number
): Promise<{
  title: string;
  subject: string;
  language: string;
  totalQuestions: number;
  questions: ScannedQuestion[];
}> {
  const langNote =
    language === 'sinhala'
      ? 'The text is in Sinhala (සිංහල). Keep all text in Sinhala script.'
      : language === 'tamil'
        ? 'The text is in Tamil (தமிழ்). Keep all text in Tamil script.'
        : 'The text is in English.';

  const systemPrompt = `You are an exam paper structuring assistant. I have extracted text from a question paper using OCR. The OCR text is accurate in characters but has no structure.

${langNote}
This paper has ${totalPages} page(s). Pages are separated by "--- PAGE BREAK ---".

Identify each question and its structure. For each:
- type: "mcq" (labeled options), "short" (1-5 marks), "essay" (10+ marks), "structured" (sub-parts i, ii, iii)
- For MCQs: extract each option text WITHOUT the label
- marks: if shown

Return ONLY valid JSON:
{
  "title": "Paper title" or null,
  "subject": "Subject" or null,
  "questions": [
    {"number": "01", "text": "question text", "type": "mcq", "options": ["opt1", "opt2", "opt3", "opt4"], "marks": 5}
  ]

RULES:
- Non-MCQ: options = null
- Include EVERY question
- Keep ALL text in ORIGINAL language/script
- marks: number or null`;

  const raw = await callLlm(systemPrompt, fullText, true);
  const parsed = parseLlmJson<{
    title?: string;
    subject?: string;
    questions?: Array<{
      number?: string;
      text: string;
      type?: string;
      options?: string[] | null;
      marks?: number | null;
    }>;
  }>(raw);

  if (!parsed || !Array.isArray(parsed.questions)) {
    return { title: 'Scanned Paper', subject: '', language, totalQuestions: 0, questions: [] };
  }

  const validTypes = ['mcq', 'short', 'essay', 'structured'];

  return {
    title: parsed.title ? String(parsed.title) : 'Scanned Paper',
    subject: parsed.subject ? String(parsed.subject) : '',
    language,
    totalQuestions: parsed.questions.length,
    questions: parsed.questions
      .filter((q) => q.text?.trim())
      .map((q, idx) => ({
        id: `scanned-${randomUUID().slice(0, 8)}`,
        number: q.number ? String(q.number) : String(idx + 1),
        text: String(q.text),
        type: validTypes.includes(q.type || '') ? (q.type as ScannedQuestion['type']) : 'short',
        options: Array.isArray(q.options) ? q.options.filter(Boolean).map(String) : null,
        marks: typeof q.marks === 'number' ? q.marks : null,
      })),
  };
}