import { NextRequest, NextResponse } from 'next/server';
import { callLlm } from '@/lib/llm';

interface VariationRequestBody {
  referenceQuestion: string;
  referenceAnswer?: string;
  count: number;
  keepDifficulty: boolean;
  varyType: boolean;
  language: 'english' | 'sinhala' | 'tamil';
}

function stripMarkdownCodeBlocks(text: string): string {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return cleaned;
}

const languageMap: Record<string, string> = {
  english: 'English',
  sinhala: 'Sinhala (සිංහල)',
  tamil: 'Tamil (தமிழ்)',
};

export async function POST(request: NextRequest) {
  try {
    const body: VariationRequestBody = await request.json();
    const { referenceQuestion, referenceAnswer, count, keepDifficulty, varyType, language } = body;

    if (!referenceQuestion || referenceQuestion.trim().length === 0) {
      return NextResponse.json(
        { error: 'referenceQuestion is required' },
        { status: 400 }
      );
    }

    const langName = languageMap[language] || 'English';

    const systemPrompt = `You are an expert educational assessment writer specializing in creating question variations. You take a reference question and produce ${count} distinct variations that test the same underlying knowledge/concept.

VARIATION STRATEGIES - use a variety of these across the generated questions:
1. **Rephrasing**: Rephrase the question using different wording while keeping the same core requirement
2. **Scenario-wrapping**: Place the same concept in a different real-world scenario or context
3. **Reverse questions**: Instead of asking for the answer, give the answer and ask for the reasoning/process
4. **Different format**: Convert between question types (e.g., MCQ to short answer, or structured to essay)
5. **Numerical changes**: For math/science questions, change the numbers while keeping the method the same
6. **Combine concepts**: Add a related concept to make a compound question
7. **Split complex questions**: Break a complex question into simpler parts

QUESTION REQUIREMENTS:
- Generate exactly ${count} variations of the reference question
- Language: ${langName}
${keepDifficulty ? '- Maintain the same difficulty level as the reference question' : '- Vary the difficulty levels across variations'}
${varyType ? '- Vary the question types across variations (MCQ, short answer, structured, essay)' : '- Keep a similar question type to the reference'}
- Each variation must include a suggested answer
- Each variation must be meaningfully different from the reference and from other variations

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON array. No explanation, no markdown, no code fences. Each element must have:
- "question": (string) The full variation question text
- "marks": (number) Appropriate marks for the question
- "type": (string) One of: "mcq", "short", "essay", "structured"
- "difficulty": (string) One of: "easy", "medium", "hard"
- "suggestedAnswer": (string) A model answer
- "markScheme": (string) Breakdown of how marks are allocated
- "options": (array of strings) Only for MCQ type - exactly 4 options like ["A) option1", "B) option2", "C) option3", "D) option4"]

IMPORTANT: Return ONLY the JSON array. No other text.`;

    let userPrompt = `Create ${count} variations of this question:\n\n"${referenceQuestion}"`;

    if (referenceAnswer && referenceAnswer.trim()) {
      userPrompt += `\n\nReference answer:\n"${referenceAnswer}"`;
    }

    const rawContent = await callLlm(systemPrompt, userPrompt, true);

    const cleanedContent = stripMarkdownCodeBlocks(rawContent);

    let questions: unknown[];
    try {
      questions = JSON.parse(cleanedContent);
    } catch {
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse AI-generated variations', rawContent },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'AI response was not valid JSON', rawContent },
          { status: 500 }
        );
      }
    }

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'AI response was not a JSON array' },
        { status: 500 }
      );
    }

    const questionsWithIds = questions.map((q: Record<string, unknown>, i: number) => ({
      ...q,
      id: `var-${Date.now()}-${i}`,
      selected: false,
    }));

    return NextResponse.json(questionsWithIds);
  } catch (error) {
    console.error('Error generating variations:', error);
    return NextResponse.json(
      { error: 'Failed to generate question variations' },
      { status: 500 }
    );
  }
}