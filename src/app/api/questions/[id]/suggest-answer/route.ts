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

    const langName = languageMap[question.language] || 'English';

    const systemPrompt = `You are an expert educational assessment writer and examiner for Sri Lankan examinations (O/L, A/L, local exams).
Given a question, provide a comprehensive suggested answer and detailed mark scheme.

IMPORTANT RULES:
- Provide the answer in ${langName} (same language as the question)
- The suggested answer should be a model answer that a top student would write
- The mark scheme should break down exactly how marks are allocated
- Be precise about what earns marks and what does not
- For MCQ questions, state the correct answer and briefly explain why
- For essay/structured questions, provide a detailed mark scheme with point-by-point allocation

OUTPUT FORMAT: You MUST respond with ONLY a valid JSON object with these fields:
- "suggestedAnswer": (string) A comprehensive model answer
- "markScheme": (string) Detailed mark allocation breakdown

Return ONLY the JSON object. No explanation.`;

    const optionsInfo = question.options ? `\nOptions: ${question.options}` : '';

    const userPrompt = `Question (in ${langName}):
${question.text}
Type: ${question.type}
Subject: ${question.subject || 'not specified'}
Grade: ${question.grade || 'not specified'}
Marks: ${question.marks || 'not specified'}
Difficulty: ${question.difficulty || 'not specified'}${optionsInfo}

Provide a suggested answer and detailed mark scheme. Return only the JSON object.`;

    const rawContent = await callLlm(systemPrompt, userPrompt, true);

    const parsed = parseLlmJson<{ suggestedAnswer: string; markScheme: string }>(rawContent);

    if (!parsed || !parsed.suggestedAnswer) {
      return NextResponse.json(
        { error: 'Failed to parse AI-generated answer suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestedAnswer: parsed.suggestedAnswer,
      markScheme: parsed.markScheme || '',
    });
  } catch (error) {
    console.error('Error generating answer suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate answer suggestion' },
      { status: 500 }
    );
  }
}
