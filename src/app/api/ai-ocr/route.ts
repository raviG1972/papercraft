import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ai-ocr
 *
 * Server-side AI OCR using Vision model.
 * - On Vercel / with GEMINI_API_KEY: calls Gemini Vision directly
 * - In Z.ai sandbox: uses z-ai-web-dev-sdk VLM as fallback
 *
 * Accepts a single page image as base64 data URL and returns extracted text.
 * Client sends one request per page for progress tracking.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const OCR_PROMPT = `You are an expert exam paper OCR assistant. Extract ALL text from this exam paper page image with MAXIMUM accuracy.

CRITICAL ACCURACY RULES:
1. Transcribe EVERY character perfectly — especially English letters, numbers, and symbols.
2. Pay extra attention to commonly misread characters:
   - Distinguish: O/0 (letter O vs zero), l/1/I (lowercase L vs 1 vs uppercase I)
   - Distinguish: S/5, Z/2, B/8, rn/m, cl/d
   - Preserve exact case: "The" not "the" if it's capitalized
3. Do NOT add, remove, or change any characters. Transcribe exactly what is printed.

FOR MATHEMATICAL FORMULAS AND EQUATIONS:
- Wrap them in LaTeX delimiters: $$ ... $$
- Examples:
  - Simple: $$A = \\pi r^2$$
  - Fraction: $$\\frac{a}{b} + \\frac{c}{d}$$
  - Square root: $$\\sqrt{x^2 + y^2}$$
  - Integral: $$\\int_0^1 f(x)\\,dx$$
  - Summation: $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

FOR CHEMICAL FORMULAS:
- Use proper subscripts: $$H_2O$$, $$H_2SO_4$$, $$CaCO_3$$, $$CH_3COOH$$

STRUCTURE PRESERVATION:
- Question numbers (01, 02, 1(a), 1(i), etc.)
- Section headers and instructions
- Marks allocation [05 marks], (10 marks)
- Tables — use | separators
- Answer spaces — mark as [________]

LANGUAGE RULES:
- Keep ALL text in its ORIGINAL language (Sinhala, Tamil, or English).
- Do NOT translate anything.
- For mixed-language papers (e.g. Sinhala paper with English technical terms), keep each word in its original language.

DIAGRAMS:
- If a section contains only a diagram/figure with no text, describe briefly:
  [Diagram: description]

OUTPUT:
- Extract EVERY piece of text on the page. Do not skip or summarize.
- Output the extracted text only. No explanations, no preamble.`;

/**
 * Extract text using Gemini Vision API directly (works on Vercel with GEMINI_API_KEY).
 */
async function ocrViaGemini(
  base64Data: string,
  mimeType: string,
  maxRetries = 2
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  // Use Gemini 2.0 Flash — a vision-capable model.
  // gemma-4-31b-it is text-only and CANNOT process images.
  const model = 'gemini-2.0-flash';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: OCR_PROMPT },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 16384,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error('Gemini returned empty response');
        return text;
      }

      // Retry on 429 or 5xx
      if (res.status === 429 || res.status >= 500) {
        if (attempt < maxRetries) {
          const waitMs = 5000 * Math.pow(2, attempt);
          console.warn(
            `[AI OCR Gemini] Rate limited/server error (${res.status}). Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms`
          );
          await sleep(waitMs);
          continue;
        }
      }

      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini API error: ${res.status} — ${errBody.slice(0, 200)}`);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const waitMs = 5000 * Math.pow(2, attempt);
      console.warn(`[AI OCR Gemini] Error. Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms`);
      await sleep(waitMs);
    }
  }

  throw new Error('Gemini OCR failed after all retries');
}

/**
 * Extract text using z-ai-web-dev-sdk VLM (works in Z.ai sandbox).
 */
async function ocrViaZaiSdk(base64DataUrl: string): Promise<string> {
  const { ensureZaiConfig } = await import('@/lib/ensure-zai-config');
  const ZAI = (await import('z-ai-web-dev-sdk')).default;

  ensureZaiConfig();
  const zai = await ZAI.create();

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          { type: 'image_url', image_url: { url: base64DataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  });

  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Z.ai SDK returned empty response');
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, fileName } = body;

    if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'imageData is required as a valid base64 data URL' },
        { status: 400 }
      );
    }

    // Parse the data URL to get mime type and raw base64
    const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid data URL format' },
        { status: 400 }
      );
    }

    const mimeType = matches[1];       // e.g. "image/jpeg"
    const base64Data = matches[2];    // raw base64 string (no prefix)

    let extractedText: string;

    // Strategy 1: Gemini API (works on Vercel with GEMINI_API_KEY)
    if (process.env.GEMINI_API_KEY) {
      console.log(`[AI OCR] Using Gemini Vision for: ${fileName || 'page'}`);
      extractedText = await ocrViaGemini(base64Data, mimeType);
    }
    // Strategy 2: z-ai-web-dev-sdk (works in Z.ai sandbox)
    else {
      console.log(`[AI OCR] Using z-ai-web-dev-sdk for: ${fileName || 'page'}`);
      extractedText = await ocrViaZaiSdk(imageData);
    }

    // Detect language from extracted text
    let sinhalaCount = 0;
    let tamilCount = 0;
    for (const char of extractedText) {
      const code = char.charCodeAt(0);
      if (code >= 0x0d80 && code <= 0x0dff) sinhalaCount++;
      if (code >= 0x0b80 && code <= 0x0bff) tamilCount++;
    }
    const language = sinhalaCount > 0 ? 'sinhala' : tamilCount > 0 ? 'tamil' : 'english';

    return NextResponse.json({ text: extractedText, language });
  } catch (error: unknown) {
    console.error('[AI OCR] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: `AI OCR failed: ${message}` }, { status: 500 });
  }
}