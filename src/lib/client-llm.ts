/**
 * Client-side LLM helper — calls Google Gemini API directly from the browser.
 *
 * This avoids Vercel serverless function timeouts and rate limit issues.
 * The scan feature (OCR + AI structuring) now runs 100% in the browser.
 *
 * Requires NEXT_PUBLIC_GEMINI_API_KEY env var.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse JSON from LLM output (handles markdown code fences, etc.)
 */
function parseLlmJson<T>(raw: string): T | null {
  let jsonStr = raw.trim();
  const codeBlock = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

interface StructuredPaper {
  title: string;
  subject: string;
  language: string;
  totalQuestions: number;
  questions: Array<{
    id: string;
    number: string;
    text: string;
    type: 'mcq' | 'short' | 'essay' | 'structured';
    options: string[] | null;
    marks: number | null;
  }>;
}

/**
 * Structure OCR text into exam questions using Gemini — runs entirely in the browser.
 */
export async function structureOcrText(
  text: string,
  language: string,
  pageCount: number,
  onRetry?: (attempt: number, maxRetries: number, waitMs: number) => void
): Promise<StructuredPaper> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API key not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in your Vercel environment variables.'
    );
  }

  const langNote =
    language === 'sinhala'
      ? 'The text is in Sinhala (සිංහල). Keep all text in Sinhala script.'
      : language === 'tamil'
        ? 'The text is in Tamil (தமிழ்). Keep all text in Tamil script.'
        : 'The text is in English.';

  const systemPrompt = `You are an exam paper structuring assistant. I have extracted text from a question paper using OCR. The OCR text is accurate in characters but has no structure.

${langNote}
This paper has ${pageCount} page(s). Pages are separated by "--- PAGE BREAK ---".

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

  const userPrompt = `${text}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no extra text.`;

  const model = 'gemma-4-31b-it';
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            // NOTE: responseMimeType:'application/json' is NOT supported by gemma-4-31b-it.
            // The parseStructureResult fallback handles raw/marked-up JSON output.
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini returned empty response');
      }

      return parseStructureResult(rawText.trim(), language);
    }

    // Retry on 429 (rate limit) or 5xx (server errors)
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`Gemini API error: ${res.status}`);

      if (attempt < maxRetries) {
        const retryAfter = res.headers.get('retry-after');
        let waitMs: number;

        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          waitMs = isNaN(seconds) ? 10000 : Math.max(seconds * 1000, 1000);
        } else {
          // Exponential backoff: 15s, 30s, 60s (no timeout in browser)
          waitMs = 15000 * Math.pow(2, attempt);
        }

        console.warn(
          `[Client Gemini] Rate limited (${res.status}). Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms...`
        );
        onRetry?.(attempt + 1, maxRetries, waitMs);
        await sleep(waitMs);
        continue;
      }
    }

    // Non-retryable error
    const errBody = await res.text();
    console.error('[Client Gemini] API error:', res.status, errBody);

    if (res.status === 429) {
      throw new Error(
        'Rate limit exceeded. Please wait 1-2 minutes and try again.'
      );
    }

    throw new Error(`Gemini API error: ${res.status}`);
  }

  throw lastError || new Error('Gemini API failed after retries');
}

function parseStructureResult(raw: string, language: string): StructuredPaper {
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
        id: `scanned-${crypto.randomUUID().slice(0, 8)}`,
        number: q.number ? String(q.number) : String(idx + 1),
        text: String(q.text),
        type: validTypes.includes(q.type || '') ? (q.type as StructuredPaper['questions'][number]['type']) : 'short',
        options: Array.isArray(q.options) ? q.options.filter(Boolean).map(String) : null,
        marks: typeof q.marks === 'number' ? q.marks : null,
      })),
  };
}