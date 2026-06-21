/**
 * Shared LLM helper — calls Google Gemini API for text generation.
 *
 * Works everywhere: Z.ai sandbox, Vercel, local dev, etc.
 * Requires GEMINI_API_KEY env var (free at https://aistudio.google.com/apikey)
 *
 * Falls back to z-ai-web-dev-sdk when GEMINI_API_KEY is not set
 * (so local Z.ai dev still works without extra setup).
 */

interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  jsonMode = true
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    return callGemini(geminiKey, systemPrompt, userPrompt, jsonMode);
  }

  // Fallback: z-ai-web-dev-sdk (only works in Z.ai sandbox)
  return callZaiSdk(systemPrompt, userPrompt);
}

// ─── Google Gemini ─────────────────────────────────────────────────────

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean
): Promise<string> {
  const model = 'gemma-4-31b-it';

  const contents = [
    { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
  ];

  if (jsonMode) {
    contents[0].parts[0].text +=
      '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no extra text.';
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            // NOTE: responseMimeType:'application/json' is NOT supported by gemma-4-31b-it.
            // parseLlmJson fallback handles raw/marked-up JSON output.
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Gemini returned empty response');
      }

      return text.trim();
    }

    // Only retry on 429 (rate limit) or 5xx (server errors)
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`Gemini API error: ${res.status}`);

      if (attempt < maxRetries) {
        // Use Retry-After header if provided, otherwise exponential backoff
        const retryAfter = res.headers.get('retry-after');
        let waitMs: number;

        if (retryAfter) {
          // Could be seconds or a date
          const seconds = parseInt(retryAfter, 10);
          waitMs = isNaN(seconds) ? 10000 : Math.max(seconds * 1000, 1000);
        } else {
          // Exponential backoff: 3s, 6s, 12s
          waitMs = 3000 * Math.pow(2, attempt);
        }

        console.warn(
          `[Gemini] Rate limited (${res.status}). Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms...`
        );
        await sleep(waitMs);
        continue;
      }
    }

    // Non-retryable error
    const errBody = await res.text();
    console.error('[Gemini] API error:', res.status, errBody);

    if (res.status === 429) {
      throw new Error(
        'Gemini API rate limit exceeded. Please wait 1-2 minutes and try again, or use a paid Gemini API key for higher limits.'
      );
    }

    throw new Error(`Gemini API error: ${res.status}`);
  }

  throw lastError || new Error('Gemini API failed after retries');
}

// ─── Z.ai SDK fallback ─────────────────────────────────────────────────

async function callZaiSdk(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const { ensureZaiConfig } = await import('@/lib/ensure-zai-config');
  const ZAI = (await import('z-ai-web-dev-sdk')).default;

  ensureZaiConfig();
  const zai = await ZAI.create();

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Z.ai SDK returned empty response');
  return raw.trim();
}

/**
 * Safely parse JSON from LLM output (handles markdown code fences, etc.)
 */
export function parseLlmJson<T>(raw: string): T | null {
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