/**
 * Shared utilities for handling paste from MS Word, web pages (KaTeX/MathJax),
 * and other sources into TipTap/ProseMirror editors with math support.
 *
 * Handles:
 * - OMML (Office Math Markup Language) from desktop MS Word
 * - MathML from various sources
 * - KaTeX-rendered HTML (extracts MathML from .katex-mathml or falls back to text)
 * - MathJax-rendered HTML (extracts from mjx-* elements)
 * - Unicode linear math characters (superscripts, subscripts, operators, etc.)
 * - Word HTML cleanup (removes mso-* styles, Mso classes, v:/o:/w: namespaces)
 */

import { ommlToLatex, ommlTextToLatex, mathmlToLatex } from '@/components/editor/math-extension';

// ─── Attribute escaping for HTML ──────────────────────────────────

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

// ─── Word HTML cleanup ──────────────────────────────────────────────

/**
 * Strip MS Word–specific markup from pasted HTML while preserving
 * basic formatting and math node spans.
 */
export function cleanWordHtml(html: string): string {
  let clean = html;

  // Remove conditional comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');

  // Remove XML namespace declarations
  clean = clean.replace(/xmlns[:\w]*="[^"]*"/g, '');

  // Remove <style> blocks
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove <meta>, <link>, <?xml> tags
  clean = clean.replace(/<(?:meta|link|\?xml)[^>]*>/gi, '');

  // Remove v:, o:, w: namespace elements (keep m: for oMath handling)
  clean = clean.replace(/<\/?(?:v|o|w):[^>]*>/gi, '');

  // Remove remaining m: elements that are NOT oMath/oMathPara
  clean = clean.replace(/<\/?m:(?!oMath)[^>]*>/gi, '');

  // Clean style attributes: remove mso-* properties, keep the rest
  clean = clean.replace(/style="([^"]*)"/gi, (_: string, styles: string) => {
    const cleaned = styles
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s && !/\bmso-/i.test(s))
      .join('; ')
      .trim();
    return cleaned ? `style="${cleaned}"` : '';
  });

  // Clean class attributes: remove Mso* classes, keep the rest
  clean = clean.replace(/class="([^"]*)"/gi, (_: string, cls: string) => {
    const cleaned = cls
      .split(/\s+/)
      .filter((c: string) => !/^Mso/i.test(c) && !/^mso/i.test(c))
      .join(' ')
      .trim();
    return cleaned ? `class="${cleaned}"` : '';
  });

  // Remove empty <span> tags — BUT NOT spans with data-math-node attribute!
  clean = clean.replace(/<span(?![^>]*data-math-node)[^>]*>\s*<\/span>/gi, '');

  // Remove empty style/class attributes left behind
  clean = clean.replace(/\s*(style|class)=""/gi, '');

  return clean;
}

// ─── Math detection ───────────────────────────────────────────────

/**
 * Check if HTML contains any math content that needs special handling.
 * Detects OMML, MathML, KaTeX, MathJax, Unicode math, and Word markers.
 */
export function hasMathContent(html: string): boolean {
  // OMML (Office Math Markup Language) — desktop MS Word
  if (/<m:oMath[\s>\/]/i.test(html)) return true;
  if (/oMathPara/i.test(html)) return true;

  // MathML
  if (/<math[\s>\/]/i.test(html) && /<\/math\s*>/i.test(html)) return true;

  // KaTeX rendered HTML
  if (/\bkatex\b/i.test(html)) return true;
  if (/class="[^"]*katex[^"]*"/i.test(html)) return true;

  // MathJax rendered HTML
  if (/\bMathJax\b/i.test(html)) return true;
  if (/\bmjx-/i.test(html)) return true;

  // Unicode linear math characters
  if (hasUnicodeMathChars(html)) return true;

  // Word-specific markers
  if (/mso-/i.test(html)) return true;
  if (/xmlns:o\s*=/i.test(html)) return true;
  if (/class="Mso/i.test(html)) return true;

  return false;
}

/**
 * Check if text has $...$ or $$...$$ inline math patterns.
 */
export function hasInlineMathDelimiters(text: string): boolean {
  return /\$\$[^$]+?\$\$/.test(text) || /\$[^$\n]+?\$/.test(text);
}

// ─── Unicode math detection ────────────────────────────────────────

const UNICODE_SUPERSCRIPTS = /[\u00B2\u00B3\u00B9\u2070\u2074-\u2079\u207B\u207C\u207D\u207F\u2080-\u2089\u2090-\u209C]/;
const UNICODE_SUBSCRIPTS = /[\u2080-\u208E\u2090-\u209C]/;
const UNICODE_MATH_SYMBOLS = /[×÷±√∞≠≤≥≈∝∑∏∫∂∇∈⊂⊃⊆⊇∪∩∅∀∃∴∵⊕⊗∧∨¬→←↔⇒⇐⇔∓∘·ℕℤℚℝℂ]/;
const UNICODE_FRACTIONS = /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/;

function hasUnicodeMathChars(html: string): boolean {
  const text = html.replace(/<[^>]*>/g, '');
  if (!text.trim()) return false;
  return UNICODE_SUPERSCRIPTS.test(text) || UNICODE_SUBSCRIPTS.test(text) ||
         UNICODE_MATH_SYMBOLS.test(text) || UNICODE_FRACTIONS.test(text);
}

// ─── KaTeX HTML processing ─────────────────────────────────────────

/**
 * Process KaTeX-rendered HTML spans.
 *
 * KaTeX renders equations as:
 *   <span class="katex">
 *     <span class="katex-mathml"><math>...</math></span>   ← MathML source
 *     <span class="katex-html" aria-hidden="true">...</span>  ← visual rendering
 *   </span>
 *
 * Strategy: extract the MathML from .katex-mathml and convert to LaTeX.
 * Fallback: extract text content from the katex-html span.
 */
function processKatexHtml(html: string): string {
  // Match <span class="katex ..."> blocks (may have additional classes)
  return html.replace(
    /<span\s+[^>]*class="[^"]*katex(?:-display)?[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<\/span>\s*<\/span>/gi,
    (match) => {
      // Try to find MathML inside katex-mathml
      const mathmlMatch = match.match(/<math[^>]*>([\s\S]*?)<\/math>/i);
      if (mathmlMatch) {
        const latex = mathmlToLatex(match);
        if (latex.trim()) {
          const isDisplay = /katex-display/i.test(match);
          return `<span data-math-node data-latex="${escapeAttr(latex.trim())}" data-display-mode="${isDisplay}"></span>`;
        }
      }

      // Fallback: extract text content
      const textContent = match.replace(/<[^>]*>/g, '').trim();
      if (textContent) {
        return `<span data-math-node data-latex="${escapeAttr(textContent)}" data-display-mode="false"></span>`;
      }

      return ''; // Remove if nothing useful found
    }
  );
}

/**
 * Simpler KaTeX pattern for single-level katex spans.
 */
function processKatexSimple(html: string): string {
  // Match various KaTeX span patterns
  return html.replace(
    /<span\s+class="[^"]*\bkatex(?:-display)?\b[^"]*"[^>]*>([\s\S]*?)<\/span>(?:\s*<\/span>)*/gi,
    (match) => {
      // Check if already processed (has data-math-node)
      if (/data-math-node/i.test(match)) return match;

      // Try to find MathML
      const mathmlMatch = match.match(/<math[^>]*>([\s\S]*?)<\/math>/i);
      if (mathmlMatch) {
        const latex = mathmlToLatex(match);
        if (latex.trim()) {
          const isDisplay = /katex-display/i.test(match);
          return `<span data-math-node data-latex="${escapeAttr(latex.trim())}" data-display-mode="${isDisplay}"></span>`;
        }
      }

      // Fallback: text content
      const div = document.createElement('div');
      div.innerHTML = match;
      const text = div.textContent?.trim() || '';
      if (text) {
        return `<span data-math-node data-latex="${escapeAttr(text)}" data-display-mode="false"></span>`;
      }

      return match; // Leave unchanged if can't process
    }
  );
}

// ─── MathJax HTML processing ───────────────────────────────────────

function processMathJaxHtml(html: string): string {
  // MathJax v3: <mjx-container> elements
  return html.replace(
    /<mjx-container[^>]*>([\s\S]*?)<\/mjx-container>/gi,
    (match) => {
      // Check for MathML inside
      const mathmlMatch = match.match(/<math[^>]*>([\s\S]*?)<\/math>/i);
      if (mathmlMatch) {
        const latex = mathmlToLatex(match);
        if (latex.trim()) {
          const isDisplay = /display\s*=\s*["']?\s*true/i.test(match) || /mjx-display/i.test(match);
          return `<span data-math-node data-latex="${escapeAttr(latex.trim())}" data-display-mode="${isDisplay}"></span>`;
        }
      }

      // Fallback: text content
      const div = document.createElement('div');
      div.innerHTML = match;
      const text = div.textContent?.trim() || '';
      if (text) {
        return `<span data-math-node data-latex="${escapeAttr(text)}" data-display-mode="false"></span>`;
      }

      return match;
    }
  );
}

// ─── Main paste processing ─────────────────────────────────────────

/**
 * Process pasted HTML that may contain mathematical equations.
 *
 * Handles: OMML, MathML, KaTeX, MathJax, Unicode linear math.
 */
export function processMathInPastedHtml(html: string): string {
  let processed = html;

  // Step 1: Process KaTeX-rendered spans (before MathML, since KaTeX wraps MathML)
  processed = processKatexSimple(processed);

  // Step 2: Process MathJax-rendered spans
  processed = processMathJaxHtml(processed);

  // Step 3: Replace OMML display equations (oMathPara)
  processed = processed.replace(
    /<m:oMathPara[^>]*>([\s\S]*?)<\/m:oMathPara>/gi,
    (match) => {
      const latex = ommlToLatex(match);
      const finalLatex = latex.trim() || ommlTextToLatex(match).trim();
      if (!finalLatex) return '';
      return `<span data-math-node data-latex="${escapeAttr(finalLatex)}" data-display-mode="true"></span>`;
    }
  );

  // Step 4: Replace OMML inline equations (oMath)
  processed = processed.replace(
    /<m:oMath[^>]*>([\s\S]*?)<\/m:oMath>/gi,
    (match) => {
      const latex = ommlToLatex(match);
      const finalLatex = latex.trim() || ommlTextToLatex(match).trim();
      if (!finalLatex) return '';
      return `<span data-math-node data-latex="${escapeAttr(finalLatex)}" data-display-mode="false"></span>`;
    }
  );

  // Step 5: Replace any remaining MathML equations
  processed = processed.replace(
    /<math[^>]*>([\s\S]*?)<\/math>/gi,
    (match) => {
      const latex = mathmlToLatex(match);
      if (!latex.trim()) return match;
      const isDisplay = /display\s*=\s*["']?\s*block/i.test(match);
      return `<span data-math-node data-latex="${escapeAttr(latex.trim())}" data-display-mode="${isDisplay}"></span>`;
    }
  );

  // Step 6: Clean remaining Word/complex HTML
  processed = cleanWordHtml(processed);

  return processed;
}

/**
 * Extract plain text from HTML, useful for comparing content loss.
 */
export function extractTextFromHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').trim();
}