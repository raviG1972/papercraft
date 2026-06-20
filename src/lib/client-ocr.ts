/**
 * Client-side OCR service using Tesseract.js (browser) + pdf.js (PDF rendering).
 *
 * All OCR runs in the browser — no server timeouts, works on Vercel free tier.
 * Language data is downloaded once and cached in the browser (IndexedDB).
 *
 * Both Tesseract.js and pdf.js are dynamically imported to avoid
 * server-side bundling issues in Next.js.
 */

export type OcrLanguage = 'english' | 'sinhala' | 'tamil';

export interface OcrProgress {
  status: string;
  message: string;
  progress: number;
}

export interface OcrResult {
  text: string;
  language: OcrLanguage;
  pageCount: number;
}

/**
 * Detect language from text using Unicode ranges.
 */
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
 * Convert a PDF File to an array of image Blobs (one per page).
 * Uses pdf.js to render each page to a canvas, then exports as PNG.
 */
async function pdfToImages(
  pdfjsLib: typeof import('pdfjs-dist'),
  file: File,
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob[]> {
  // Set worker source to CDN (avoids bundling the worker file)
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: Blob[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Converting page ${i} of ${pdf.numPages}...`, Math.round((i / pdf.numPages) * 100));

    const page = await pdf.getPage(i);
    const scale = 2; // 2x for better OCR quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    images.push(blob);
    page.cleanup();
  }

  return images;
}

/**
 * Run full OCR pipeline on uploaded files.
 *
 * 1. Convert PDFs to images (pdf.js in browser)
 * 2. Run Tesseract with sin+eng+tam on all images
 * 3. Detect language from output
 *
 * @param files - Array of File objects (images or PDFs)
 * @param onProgress - Optional progress callback
 * @returns OCR result with extracted text, detected language, and page count
 */
export async function runClientOcr(
  files: File[],
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  const update = (status: string, message: string, progress: number) =>
    onProgress?.({ status, message, progress });

  // Dynamically import both libraries — they only work in the browser
  const [{ default: Tesseract }, pdfjsLib] = await Promise.all([
    import('tesseract.js'),
    import('pdfjs-dist'),
  ]);

  // Step 1: Convert all files to image Blobs
  update('converting', 'Preparing files...', 5);

  const allImages: Blob[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type === 'application/pdf') {
      const images = await pdfToImages(pdfjsLib, file, (msg, pct) => {
        const basePct = Math.round((i / files.length) * 50);
        update('converting', msg, basePct + Math.round(pct / files.length));
      });
      allImages.push(...images);
    } else if (file.type.startsWith('image/')) {
      allImages.push(file);
    }
  }

  if (allImages.length === 0) {
    throw new Error('No pages could be extracted from the files');
  }

  // Step 2: Run Tesseract OCR with all three languages
  update('ocr', `Initializing OCR engine...`, 50);

  const worker = await Tesseract.createWorker('sin+eng+tam', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        const ocrPct = 50 + Math.round(m.progress * 0.4);
        update('ocr', `Running OCR...`, ocrPct);
      }
    },
  });

  const pageTexts: string[] = [];

  for (let i = 0; i < allImages.length; i++) {
    const pct = 50 + Math.round(((i + 1) / allImages.length) * 40);
    update('ocr', `Running OCR on page ${i + 1} of ${allImages.length}...`, pct);

    const result = await worker.recognize(allImages[i]);
    const text = result.data.text.trim();
    if (text) pageTexts.push(text);
  }

  await worker.terminate();

  // Step 3: Join pages and detect language
  const fullText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n');

  if (!fullText.trim()) {
    throw new Error('No text could be extracted from the files');
  }

  const language = detectLanguage(fullText);
  update('done', 'OCR complete', 90);

  return { text: fullText, language, pageCount: allImages.length };
}

/**
 * Run OCR on a single image file (used by the "Read from Image" feature).
 * Simpler than runClientOcr — no PDF support, no progress tracking.
 *
 * @param file - A single image File
 * @returns OCR text and detected language
 */
export async function ocrSingleImage(
  file: File
): Promise<{ text: string; language: OcrLanguage }> {
  const [{ default: Tesseract }] = await Promise.all([
    import('tesseract.js'),
  ]);

  const worker = await Tesseract.createWorker('sin+eng+tam', 1);

  const result = await worker.recognize(file);
  await worker.terminate();

  const text = result.data.text.trim();

  if (!text) {
    throw new Error('No text could be extracted from the image');
  }

  const language = detectLanguage(text);

  return { text, language };
}