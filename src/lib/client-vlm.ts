/**
 * Client-side AI OCR using Google Gemini Vision.
 *
 * Calls Gemini 2.0 Flash Vision directly from the browser.
 * The user's API key is stored in localStorage (entered via a settings UI).
 *
 * Much better than Tesseract for:
 * - Mathematical formulas and equations (LaTeX output)
 * - Chemical formulas
 * - Tables with complex formatting
 * - Mixed text + math content
 * - English characters in Sinhala/Tamil papers
 * - Diagrams (described in text)
 */

export type OcrLanguage = 'english' | 'sinhala' | 'tamil';
export type OcrProgress = { status: string; message: string; progress: number };

/** localStorage key for the user's Gemini API key */
export const GEMINI_KEY_STORAGE = 'papercraft_gemini_key';

/** Get the stored Gemini API key (localStorage first, then NEXT_PUBLIC env var) */
export function getStoredGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(GEMINI_KEY_STORAGE);
  if (stored) return stored;
  // Fallback to the env var (set via NEXT_PUBLIC_GEMINI_API_KEY)
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
}

/** Save the Gemini API key to localStorage */
export function setStoredGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectLanguage(text: string): OcrLanguage {
  let sinhalaCount = 0;
  let tamilCount = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x0D80 && code <= 0x0DFF) sinhalaCount++;
    if (code >= 0x0B80 && code <= 0x0BFF) tamilCount++;
  }
  if (sinhalaCount > 0) return 'sinhala';
  if (tamilCount > 0) return 'tamil';
  return 'english';
}

/**
 * Convert a File (image or PDF) to an array of { blob, name }.
 * PDFs are rendered page-by-page via pdf.js.
 */
async function filesToImages(
  files: File[],
  onProgress?: (msg: string, pct: number) => void
): Promise<{ blob: Blob; name: string }[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const images: { blob: Blob; name: string }[] = [];
  let globalIdx = 0;
  const totalCount = files.length;

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];

    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let p = 1; p <= pdf.numPages; p++) {
        onProgress?.(
          `Converting PDF page ${p} of ${pdf.numPages} (${file.name})...`,
          Math.round((globalIdx / Math.max(totalCount, 1)) * 40)
        );

        const page = await pdf.getPage(p);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Use JPEG for much smaller payload (~200KB vs ~5MB PNG)
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
        });

        images.push({ blob, name: `${file.name} - Page ${p}` });
        page.cleanup();
        globalIdx++;
      }
    } else if (file.type.startsWith('image/')) {
      onProgress?.(`Processing image: ${file.name}`, Math.round((globalIdx / Math.max(totalCount, 1)) * 40));
      // Convert uploaded images to JPEG to reduce payload size
      const img = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      // White background for JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      img.close();
      const jpegBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
      });
      images.push({ blob: jpegBlob, name: file.name });
      globalIdx++;
    }
  }

  return images;
}

/**
 * Convert a Blob to a base64 data URL string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
 * Extract text from a single page image using Gemini Vision.
 * Called directly from the browser — no server needed.
 */
async function extractPageText(
  base64DataUrl: string,
  apiKey: string,
  pageIndex: number,
  maxRetries: number = 2
): Promise<string> {
  // Use Gemini 2.0 Flash — a vision-capable model.
  // gemma-4-31b-it is text-only and CANNOT process images.
  const model = 'gemini-2.0-flash';
  // Strip the data:image/jpeg;base64, prefix — Gemini wants raw base64
  const base64Data = base64DataUrl.split(',')[1];

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
                      mimeType: 'image/jpeg',
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
        if (!text) throw new Error('Gemini returned empty response for this page');
        return text;
      }

      // Retry on rate limit or server errors
      if (res.status === 429 || res.status >= 500) {
        if (attempt < maxRetries) {
          const waitMs = 10000 * Math.pow(2, attempt);
          console.warn(
            `[AI OCR] Page ${pageIndex + 1}: Rate limited (${res.status}). Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms`
          );
          await sleep(waitMs);
          continue;
        }
      }

      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini API error on page ${pageIndex + 1}: ${res.status} ${errBody.slice(0, 200)}`);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const waitMs = 10000 * Math.pow(2, attempt);
      console.warn(
        `[AI OCR] Page ${pageIndex + 1}: Error. Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms`
      );
      await sleep(waitMs);
    }
  }

  throw new Error(`AI OCR failed on page ${pageIndex + 1} after all retries`);
}

/**
 * Run AI-powered OCR on uploaded files.
 *
 * 1. Check for Gemini API key in localStorage
 * 2. Convert PDFs to images (browser-side via pdf.js)
 * 3. Send each page to Gemini Vision (browser-side, no server)
 * 4. Combine results with page break markers
 */
export async function runAiOcr(
  files: File[],
  onProgress?: (progress: OcrProgress) => void
): Promise<{ text: string; language: OcrLanguage; pageCount: number }> {
  const update = (status: string, message: string, progress: number) =>
    onProgress?.({ status, message, progress });

  // Check for API key
  const apiKey = getStoredGeminiKey();
  if (!apiKey) {
    throw new Error(
      'Gemini API key not set. Click the ⚙️ icon above to add your free API key from Google AI Studio.'
    );
  }

  // Step 1: Convert files to images (browser-side)
  update('converting', 'Preparing files for AI OCR...', 5);
  const images = await filesToImages(files, (msg, pct) => {
    update('converting', msg, 5 + pct);
  });

  if (images.length === 0) {
    throw new Error('No pages could be extracted from the files');
  }

  // Step 2: Send each page to Gemini Vision
  const pageTexts: string[] = [];
  const totalPages = images.length;

  for (let i = 0; i < totalPages; i++) {
    const pct = 45 + Math.round(((i + 0.5) / totalPages) * 50);
    update('ocr', `AI reading page ${i + 1} of ${totalPages}...`, pct);

    const base64 = await blobToBase64(images[i].blob);
    const text = await extractPageText(base64, apiKey, i);

    if (text) {
      pageTexts.push(text);
    }

    const donePct = 45 + Math.round(((i + 1) / totalPages) * 50);
    update('ocr', `Page ${i + 1} of ${totalPages} done`, donePct);
  }

  // Step 3: Join pages
  const fullText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n');

  if (!fullText.trim()) {
    throw new Error('No text could be extracted by AI OCR');
  }

  const language = detectLanguage(fullText);
  update('done', 'AI OCR complete', 100);

  return { text: fullText, language, pageCount: totalPages };
}