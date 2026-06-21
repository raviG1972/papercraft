import { NextRequest, NextResponse } from 'next/server';
import { callLlm } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file as text
    const text = await file.text();

    if (!text.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Use LLM to extract syllabus structure
    const systemPrompt = `You are a syllabus extraction assistant. Extract the syllabus structure from the provided text.
Return a JSON object with this exact structure:
{
  "title": "Syllabus Title",
  "subject": "Subject Name",
  "grade": "Grade Level",
  "year": null,
  "language": "english",
  "chapters": [
    {
      "name": "Chapter Name",
      "order": 1,
      "lessons": [
        {
          "name": "Lesson Name",
          "description": null,
          "order": 1
        }
      ]
    }
  ]
}

Rules:
- Extract chapters and lessons/topics in order
- Set appropriate order numbers starting from 1
- If no clear year, set to null
- Language should be "english", "sinhala", or "tamil"
- Only return valid JSON, no extra text`;

    const result = await callLlm(systemPrompt, text, true);

    // Parse the result - handle potential markdown code blocks
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const syllabus = JSON.parse(jsonStr);

    return NextResponse.json(syllabus);
  } catch (error) {
    console.error('Error extracting syllabus:', error);
    return NextResponse.json(
      { error: 'Failed to extract syllabus structure' },
      { status: 500 }
    );
  }
}