import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { callLlm, parseLlmJson } from '@/lib/llm';

interface GenerateRequestBody {
  mode: string;
  syllabusId?: string;
  chapterId?: string;
  lessonId?: string;
  questionType: 'mcq' | 'short' | 'essay' | 'structured' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  count: number;
  language: 'english' | 'sinhala' | 'tamil';
  includeAnswers: boolean;
}

function stripMarkdownCodeBlocks(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return cleaned;
}

function buildSyllabusContext(data: {
  title: string;
  subject: string;
  grade: string;
  chapters: {
    name: string;
    order: number;
    lessons: { name: string; description: string | null; order: number }[];
  }[];
}): string {
  let context = `Syllabus: "${data.title}"\nSubject: ${data.subject}\nGrade: ${data.grade}\n\n`;

  data.chapters.forEach((chapter) => {
    context += `Chapter ${chapter.order}: ${chapter.name}\n`;
    chapter.lessons.forEach((lesson) => {
      context += `  Lesson ${lesson.order}: ${lesson.name}`;
      if (lesson.description) {
        context += ` — ${lesson.description}`;
      }
      context += '\n';
    });
    context += '\n';
  });

  return context;
}

const difficultyGuidance: Record<string, string> = {
  easy: 'foundational/recall-level questions that test basic understanding',
  medium: 'application-level questions that require students to apply concepts',
  hard: 'analysis/evaluation-level questions that require deep thinking and synthesis',
  mixed: 'a balanced mix of easy, medium, and hard questions',
};

const typeGuidance: Record<string, string> = {
  mcq: 'multiple choice questions with exactly 4 options (A, B, C, D)',
  short: 'short answer questions requiring 1-3 sentence responses',
  essay: 'essay questions requiring detailed multi-paragraph responses',
  structured: 'structured/long answer questions with sub-parts',
  mixed: 'a mix of different question types for variety',
};

const languageMap: Record<string, string> = {
  english: 'English',
  sinhala: 'Sinhala (සිංහල)',
  tamil: 'Tamil (தமிழ்)',
};

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequestBody = await request.json();
    const {
      mode,
      syllabusId,
      chapterId,
      lessonId,
      questionType,
      difficulty,
      count,
      language,
      includeAnswers,
    } = body;

    if (mode === 'syllabus' && !syllabusId) {
      return NextResponse.json(
        { error: 'syllabusId is required when mode is "syllabus"' },
        { status: 400 }
      );
    }

    // Fetch syllabus data
    let syllabusContext = '';
    if (mode === 'syllabus' && syllabusId) {
      const syllabus = await db.syllabus.findUnique({
        where: { id: syllabusId },
        include: {
          chapters: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      if (!syllabus) {
        return NextResponse.json(
          { error: 'Syllabus not found' },
          { status: 404 }
        );
      }

      // Filter to specific chapter or lesson if requested
      let chapters = syllabus.chapters;

      if (lessonId) {
        chapters = chapters
          .map((ch) => ({
            ...ch,
            lessons: ch.lessons.filter((l) => l.id === lessonId),
          }))
          .filter((ch) => ch.lessons.length > 0);
      } else if (chapterId) {
        chapters = chapters.filter((ch) => ch.id === chapterId);
      }

      if (chapters.length === 0) {
        return NextResponse.json(
          { error: 'No matching chapters/lessons found' },
          { status: 404 }
        );
      }

      syllabusContext = buildSyllabusContext({
        title: syllabus.title,
        subject: syllabus.subject,
        grade: syllabus.grade,
        chapters: chapters.map((ch) => ({
          name: ch.name,
          order: ch.order,
          lessons: ch.lessons.map((l) => ({
            name: l.name,
            description: l.description,
            order: l.order,
          })),
        })),
      });
    }

    const langName = languageMap[language] || 'English';
    const typeDesc = typeGuidance[questionType] || 'mixed question types';
    const diffDesc = difficultyGuidance[difficulty] || 'mixed difficulty';

    const systemPrompt = `You are an expert educational assessment writer. You create high-quality exam questions based on curriculum content.

CONTENT TO BASE QUESTIONS ON:
${syllabusContext || '(No specific syllabus provided - generate general questions)'}

QUESTION REQUIREMENTS:
- Generate exactly ${count} ${typeDesc}
- Difficulty level: ${diffDesc}
- Language: ${langName}
${includeAnswers ? '- Include suggested answers and mark schemes for each question' : '- Do NOT include suggested answers'}
- Questions should be educationally sound and test real understanding
- Use proper academic language appropriate for the subject and grade level

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON array. No explanation, no markdown, no code fences. Each element must have:
- "question": (string) The full question text, can include HTML formatting
- "marks": (number) Appropriate marks for the question
- "type": (string) One of: "mcq", "short", "essay", "structured"
- "difficulty": (string) One of: "easy", "medium", "hard"
${includeAnswers ? '- "suggestedAnswer": (string) A model answer with HTML formatting if needed' : ''}
${includeAnswers ? '- "markScheme": (string) Breakdown of how marks are allocated' : ''}
${questionType === 'mcq' || questionType === 'mixed' ? '- "options": (array of strings) Only for MCQ type - exactly 4 options like ["A) option1", "B) option2", "C) option3", "D) option4"]' : ''}

Example for MCQ:
[{"question":"What is 2+2?","marks":1,"type":"mcq","difficulty":"easy","suggestedAnswer":"B) 4","markScheme":"1 mark for correct answer","options":["A) 3","B) 4","C) 5","D) 6"]}]

Example for short answer:
[{"question":"Explain the process of photosynthesis.","marks":5,"type":"short","difficulty":"medium","suggestedAnswer":"Photosynthesis is the process by which...","markScheme":"2 marks for definition, 3 marks for explanation"}]

IMPORTANT: Return ONLY the JSON array. No other text.`;

    const userPrompt = `Generate ${count} ${typeDesc} at ${diffDesc} level in ${langName}.${syllabusContext ? ' Base them strictly on the provided syllabus content.' : ''} Return only the JSON array.`;

    const rawContent = await callLlm(systemPrompt, userPrompt, true);

    // Parse the response
    const cleanedContent = stripMarkdownCodeBlocks(rawContent);

    let questions: unknown[];
    try {
      questions = JSON.parse(cleanedContent);
    } catch {
      // Try to extract JSON array from the response
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse AI-generated questions', rawContent },
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

    // Add IDs to each question
    const questionsWithIds = questions.map((q: Record<string, unknown>, i: number) => ({
      ...q,
      id: `gen-${Date.now()}-${i}`,
      selected: false,
    }));

    return NextResponse.json(questionsWithIds);
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}