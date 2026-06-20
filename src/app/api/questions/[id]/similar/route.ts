import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { callLlm, parseLlmJson } from '@/lib/llm';

const languageMap: Record<string, string> = {
  english: 'English',
  sinhala: 'Sinhala (සිංහල)',
  tamil: 'Tamil (தமிழ்)',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const question = await db.questionBank.findUnique({
      where: { id },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const body = await request.json();
    const count = Math.min(10, Math.max(1, body.count || 3));

    const langName = languageMap[question.language] || 'English';

    const systemPrompt = `You are an expert educational assessment writer for Sri Lankan examinations (O/L, A/L, local exams).
Given an original question, generate ${count} SIMILAR but DIFFERENT questions that test the same concept/topic at a similar difficulty level.

IMPORTANT RULES:
- Generate questions in ${langName} (same language as the original question)
- Each question must be unique and test the same underlying concept
- Vary the wording, numbers, scenarios, or context while keeping the difficulty level
- For MCQ questions, also generate 4 options and specify the correct answer
- Do NOT copy the original question verbatim — rephrase and create variations

OUTPUT FORMAT: You MUST respond with ONLY a valid JSON array. Each element must have:
- "text": (string) The full question text
- "type": (string) One of: "mcq", "short", "essay", "structured", "fill-blanks"
- "marks": (number) Appropriate marks
- "difficulty": (string) One of: "easy", "medium", "hard"
- "subject": (string) The subject area
- "grade": (string) The grade level
- "language": (string) "${question.language}"
- "options": (array of strings) Only for MCQ type — exactly 4 options
- "correctAnswer": (string) The correct answer (for MCQ, the option letter or text)

If the original question is MCQ, generate MCQ variations. If it's short answer, generate short answer variations.

Return ONLY the JSON array. No explanation.`;

    const optionsInfo = question.options ? `\n\nOriginal options (MCQ): ${question.options}` : '';
    const correctInfo = question.correctAnswer ? `\nCorrect answer: ${question.correctAnswer}` : '';

    const userPrompt = `Original Question (in ${langName}):
${question.text}
Type: ${question.type}
Difficulty: ${question.difficulty || 'not specified'}
Subject: ${question.subject || 'not specified'}
Grade: ${question.grade || 'not specified'}
Marks: ${question.marks || 'not specified'}${optionsInfo}${correctInfo}

Generate ${count} similar but different questions that test the same concept. Return only the JSON array.`;

    const rawContent = await callLlm(systemPrompt, userPrompt, true);

    const parsed = parseLlmJson<{ text: string; type: string; marks: number; difficulty: string; subject: string; grade: string; language: string; options?: string[]; correctAnswer?: string }[]>(rawContent);

    if (!parsed || !Array.isArray(parsed)) {
      return NextResponse.json(
        { error: 'Failed to parse AI-generated similar questions' },
        { status: 500 }
      );
    }

    // Add temporary IDs for frontend use (these are suggestions, not saved)
    const suggestions = parsed.map((q, i) => ({
      ...q,
      id: `similar-${Date.now()}-${i}`,
      language: q.language || question.language,
      subject: q.subject || question.subject,
      grade: q.grade || question.grade,
      marks: q.marks || question.marks,
      difficulty: q.difficulty || question.difficulty,
      type: q.type || question.type,
      options: q.options ? JSON.stringify(q.options) : null,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating similar questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate similar questions' },
      { status: 500 }
    );
  }
}
