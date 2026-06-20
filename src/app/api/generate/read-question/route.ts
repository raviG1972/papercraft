import { NextRequest, NextResponse } from 'next/server';
import { callLlm, parseLlmJson } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { text, language: langHint } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text is required (OCR-extracted text)' },
        { status: 400 }
      );
    }

    const structured = await structureWithLLM(text, langHint || 'english');
    const fullQuestion = reconstructQuestion(structured, text);

    return NextResponse.json({ question: fullQuestion, language: langHint || 'english' });
  } catch (error) {
    console.error('Error structuring question:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to structure question' },
      { status: 500 }
    );
  }
}

// ─── LLM Structuring ─────────────────────────────────────────────────────

interface StructuredQuestion {
  question_number?: string;
  question_text: string;
  options?: { label: string; text: string }[];
  marks?: string | null;
}

async function structureWithLLM(
  ocrText: string,
  language: string
): Promise<StructuredQuestion> {
  const langInstruction =
    language === 'sinhala'
      ? 'The text is in Sinhala (සිංහල).'
      : language === 'tamil'
        ? 'The text is in Tamil (தமிழ்).'
        : 'The text is in English.';

  const systemPrompt = `${langInstruction}

Analyze this OCR-extracted text and identify the question structure.

The text may contain:
- A question number
- The question text
- MCQ options (labeled like 1), 2), 3), 4) or (a), (b), (c), (d) or A., B., C., D.)
- Marks indication

Return ONLY valid JSON:
{
  "question_number": "01" or null,
  "question_text": "The full question text",
  "options": [{"label": "1", "text": "Option text"}] or null,
  "marks": "5" or null
}

RULES:
- For non-MCQ questions, set options to null
- For MCQs, each option must have a unique label and text
- Keep ALL text in the ORIGINAL language and script
- If you can't identify a clear structure, put the entire text as question_text with options: null`;

  const raw = await callLlm(systemPrompt, ocrText, true);
  const parsed = parseLlmJson<StructuredQuestion>(raw);

  if (!parsed || !parsed.question_text) {
    return { question_text: ocrText.trim() };
  }

  return {
    question_number: parsed.question_number || undefined,
    question_text: String(parsed.question_text),
    options: Array.isArray(parsed.options)
      ? parsed.options.map((o) => ({
          label: String(o.label || ''),
          text: String(o.text || ''),
        }))
      : undefined,
    marks: parsed.marks ? String(parsed.marks) : null,
  };
}

// ─── Reconstruct ─────────────────────────────────────────────────────────

function reconstructQuestion(
  q: StructuredQuestion,
  rawText: string
): string {
  const parts: string[] = [];

  if (q.question_number) {
    parts.push(`${q.question_number}.`);
  }
  parts.push(q.question_text || '');

  if (q.options && q.options.length > 0) {
    for (const opt of q.options) {
      parts.push(`${opt.label}) ${opt.text}`);
    }
  }

  if (q.marks) {
    parts.push(`(${q.marks} marks)`);
  }

  const result = parts.join('\n');

  if (result.trim().length < (q.question_text?.length || 0) * 0.3) {
    return rawText.trim();
  }

  return result;
}