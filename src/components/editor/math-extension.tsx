/**
 * Custom TipTap extension for LaTeX math rendering via KaTeX.
 *
 * Uses a pure ProseMirror NodeView (NO React) for maximum
 * compatibility across SSR, hydration, and all deployment targets.
 *
 * - Use the Σ / □ toolbar buttons to insert a math block
 * - Double-click any rendered formula to edit the LaTeX source
 * - Paste from MS Word: equations are auto-converted to LaTeX
 *   (supports both OMML and MathML formats)
 */

import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

// ─── Lazy-loaded katex (avoids bundling issues on some platforms) ──

let _katex: typeof import('katex') | null = null;

async function loadKatex() {
  if (!_katex) {
    try {
      _katex = await import('katex');
    } catch {
      // katex failed to load — fallback text rendering will be used
    }
  }
  return _katex;
}

function renderKatexToHtml(formula: string, displayMode: boolean): string {
  if (!_katex) {
    return `<span style="font-family:monospace;font-size:0.875rem;background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:4px">${escapeHtml(formula)}</span>`;
  }
  try {
    return _katex.renderToString(formula, {
      displayMode: !!displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return `<span style="color:#ef4444;font-size:0.75rem;font-family:monospace">${escapeHtml(formula)}</span>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── OMML to LaTeX converter (for MS Word paste) ─────────────────

export function ommlToLatex(ommlHtml: string): string {
  let latex = ommlHtml;
  latex = latex.replace(/xmlns[:\w]*="[^"]*"/g, '');
  latex = latex.replace(/<m:oMath[^>]*>/g, '');
  latex = latex.replace(/<\/m:oMath>/g, '');
  latex = latex.replace(/<m:oMathPara[^>]*>/g, '');
  latex = latex.replace(/<\/m:oMathPara>/g, '');

  latex = latex.replace(
    /<m:f>\s*<m:num>([\s\S]*?)<\/m:num>\s*<m:den>([\s\S]*?)<\/m:den>\s*<\/m:f>/gs,
    (_, num, den) => `\\frac{${ommlTextToLatex(num)}}{${ommlTextToLatex(den)}}`
  );
  latex = latex.replace(
    /<m:sSup>\s*<m:e>([\s\S]*?)<\/m:e>\s*<m:sup>([\s\S]*?)<\/m:sup>\s*<\/m:sSup>/gs,
    (_, base, sup) => `${ommlTextToLatex(base)}^{${ommlTextToLatex(sup)}}`
  );
  latex = latex.replace(
    /<m:sSub>\s*<m:e>([\s\S]*?)<\/m:e>\s*<m:sub>([\s\S]*?)<\/m:sub>\s*<\/m:sSub>/gs,
    (_, base, sub) => `${ommlTextToLatex(base)}_{${ommlTextToLatex(sub)}}`
  );
  latex = latex.replace(
    /<m:sSubSup>\s*<m:e>([\s\S]*?)<\/m:e>\s*<m:sub>([\s\S]*?)<\/m:sub>\s*<m:sup>([\s\S]*?)<\/m:sup>\s*<\/m:sSubSup>/gs,
    (_, base, sub, sup) => `${ommlTextToLatex(base)}_{${ommlTextToLatex(sub)}}^{${ommlTextToLatex(sup)}}`
  );
  latex = latex.replace(
    /<m:nary>(?:<m:naryPr>[\s\S]*?<\/m:naryPr>)?\s*(?:<m:sub>([\s\S]*?)<\/m:sub>)?\s*(?:<m:sup>([\s\S]*?)<\/m:sup>)?\s*<m:e>([\s\S]*?)<\/m:e>\s*<\/m:nary>/gs,
    (_: string, sub: string, sup: string, body: string) => {
      const base = ommlTextToLatex(body).trim();
      const naryMatch = ommlHtml.match(/<m:naryPr>[\s\S]*?<m:chr[^>]*>([\s\S]*?)<\/m:chr>/s);
      const chr = naryMatch ? naryMatch[1].trim() : '';
      let cmd = '\\sum';
      if (chr === '∫') cmd = '\\int';
      else if (chr === '∏') cmd = '\\prod';
      const subText = sub ? `_{${ommlTextToLatex(sub).trim()}}` : '';
      const supText = sup ? `^{${ommlTextToLatex(sup).trim()}}` : '';
      return `${cmd}${subText}${supText} ${base}`;
    }
  );
  latex = latex.replace(
    /<m:rad>(?:<m:radPr>[\s\S]*?<\/m:radPr>)?\s*(?:<m:deg\/>|<m:deg>\s*<\/m:deg>)?\s*<m:e>([\s\S]*?)<\/m:e>\s*<\/m:rad>/gs,
    (_: string, content: string) => `\\sqrt{${ommlTextToLatex(content)}}`
  );
  latex = latex.replace(
    /<m:rad>(?:<m:radPr>[\s\S]*?<\/m:radPr>)?\s*<m:deg>\s*(?:<m:r>(?:<m:rPr>[\s\S]*?<\/m:rPr>)?\s*(?:<m:t[^>]*>)?([\s\S]*?)(?:<\/m:t>)?\s*<\/m:r>)\s*<\/m:deg>\s*<m:e>([\s\S]*?)<\/m:e>\s*<\/m:rad>/gs,
    (_: string, deg: string, content: string) => `\\sqrt[${ommlTextToLatex(deg).trim()}]{${ommlTextToLatex(content)}}`
  );
  latex = latex.replace(
    /<m:borderBox>(?:<m:borderBoxPr>[\s\S]*?<\/m:borderBoxPr>)?\s*<m:e>([\s\S]*?)<\/m:e>\s*<\/m:borderBox>/gs,
    (_: string, content: string) => `\\boxed{${ommlTextToLatex(content)}}`
  );
  latex = latex.replace(
    /<m:func>\s*<m:fName>([\s\S]*?)<\/m:fName>\s*<m:e>([\s\S]*?)<\/m:e>\s*<\/m:func>/gs,
    (_: string, fname: string, arg: string) => {
      const fn = ommlTextToLatex(fname).trim();
      const a = ommlTextToLatex(arg).trim();
      const knownFns = ['sin', 'cos', 'tan', 'log', 'ln', 'lim', 'max', 'min', 'exp', 'det'];
      if (knownFns.includes(fn.toLowerCase())) return `\\${fn.toLowerCase()}(${a})`;
      return `\\operatorname{${fn}}(${a})`;
    }
  );
  latex = latex.replace(
    /<m:d>\s*(?:<m:dPr>([\s\S]*?)<\/m:dPr>)?\s*<m:e>([\s\S]*?)<\/m:e>\s*<\/m:d>/gs,
    (_: string, props: string, content: string) => {
      const begMatch = props?.match(/<m:begChr[^>]*>([\s\S]*?)<\/m:begChr>/s);
      const endMatch = props?.match(/<m:endChr[^>]*>([\s\S]*?)<\/m:endChr>/s);
      const beg = begMatch ? begMatch[1].trim() : '(';
      const end = endMatch ? endMatch[1].trim() : ')';
      const c = ommlTextToLatex(content);
      if (beg === '(' && end === ')') return `(${c})`;
      return `\\left${beg} ${c} \\right${end}`;
    }
  );
  latex = latex.replace(
    /<m:acc>\s*(?:<m:accPr>([\s\S]*?)<\/m:accPr>)?\s*<m:e>([\s\S]*?)<\/m:e>\s*<\/m:acc>/gs,
    (_: string, props: string, content: string) => {
      const chrMatch = props?.match(/<m:chr[^>]*>([\s\S]*?)<\/m:chr>/s);
      const chr = chrMatch ? chrMatch[1].trim() : '';
      const c = ommlTextToLatex(content);
      const accentMap: Record<string, string> = {
        '̄': '\\bar', '̂': '\\hat', '̃': '\\tilde', '̇': '\\dot',
        '̈': '\\ddot', '→': '\\vec', '′': '\\prime',
      };
      return `${accentMap[chr] || '\\hat'}{${c}}`;
    }
  );
  latex = latex.replace(/<m:r>(?:<m:rPr>[\s\S]*?<\/m:rPr>)?\s*(?:<m:t[^>]*>)?([\s\S]*?)(?:<\/m:t>)?\s*<\/m:r>/gs, '$1');
  latex = latex.replace(/<m:t[^>]*>([\s\S]*?)<\/m:t>/gs, '$1');
  latex = latex.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return latex;
}

export function ommlTextToLatex(html: string): string {
  let text = html;
  text = text.replace(/<m:r>(?:<m:rPr>[\s\S]*?<\/m:rPr>)?\s*(?:<m:t[^>]*>)?([\s\S]*?)(?:<\/m:t>)?\s*<\/m:r>/gs, '$1');
  text = text.replace(/<m:t[^>]*>([\s\S]*?)<\/m:t>/gs, '$1');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// ─── MathML to LaTeX converter ───────────────────────────────────

export function mathmlToLatex(mathmlHtml: string): string {
  if (typeof document === 'undefined') {
    return mathmlHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(mathmlHtml, 'application/xml');
    const mathEl = doc.querySelector('math');
    if (!mathEl) return '';
    return convertMathmlElement(mathEl).trim();
  } catch {
    return mathmlHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
  }
}

function convertMathmlElement(el: Element): string {
  if (!el) return '';
  const tag = (el.tagName || '').toLowerCase();
  const children = Array.from(el.children);

  switch (tag) {
    case 'math':
    case 'mrow':
      return children.map(convertMathmlElement).join(' ');
    case 'mfrac':
      return `\\frac{${children[0] ? convertMathmlElement(children[0]) : ''}}{${children[1] ? convertMathmlElement(children[1]) : ''}}`;
    case 'msup':
      return `${children[0] ? convertMathmlElement(children[0]) : ''}^{${children[1] ? convertMathmlElement(children[1]) : ''}}`;
    case 'msub':
      return `${children[0] ? convertMathmlElement(children[0]) : ''}_{${children[1] ? convertMathmlElement(children[1]) : ''}}`;
    case 'msubsup':
      return `${children[0] ? convertMathmlElement(children[0]) : ''}_{${children[1] ? convertMathmlElement(children[1]) : ''}}^{${children[2] ? convertMathmlElement(children[2]) : ''}}`;
    case 'msqrt':
      return `\\sqrt{${children.map(convertMathmlElement).join('')}}`;
    case 'mroot':
      return `\\sqrt[${children[1] ? convertMathmlElement(children[1]) : ''}]{${children[0] ? convertMathmlElement(children[0]) : ''}}`;
    case 'mover':
      return `\\overset{${children[1] ? convertMathmlElement(children[1]) : ''}}{${children[0] ? convertMathmlElement(children[0]) : ''}}`;
    case 'munder':
      return `\\underset{${children[1] ? convertMathmlElement(children[1]) : ''}}{${children[0] ? convertMathmlElement(children[0]) : ''}}`;
    case 'munderover':
      return `\\underset{${children[1] ? convertMathmlElement(children[1]) : ''}}{\\overset{${children[2] ? convertMathmlElement(children[2]) : ''}}{${children[0] ? convertMathmlElement(children[0]) : ''}}}`;
    case 'mo':
      return mapMathmlOp(el.textContent || '');
    case 'mi':
    case 'mn':
      return el.textContent || '';
    case 'mtext':
    case 'ms':
      return `\\text{${el.textContent || ''}}`;
    case 'mspace':
      return ' ';
    case 'mstyle':
    case 'mpadded':
    case 'mphantom':
      return children.map(convertMathmlElement).join(' ');
    case 'mtable':
      return `\\begin{array}{c} ${children.map(convertMathmlElement).join(' \\\\ ')} \\end{array}`;
    case 'mtr':
      return children.map(convertMathmlElement).join(' & ');
    case 'mtd':
      return children.map(convertMathmlElement).join(' ');
    case 'mfenced': {
      const open = el.getAttribute('open') || '(';
      const close = el.getAttribute('close') || ')';
      const inner = children.map(convertMathmlElement).join(', ');
      return `\\left${open} ${inner} \\right${close}`;
    }
    default:
      return el.textContent || '';
  }
}

function mapMathmlOp(op: string): string {
  const ops: Record<string, string> = {
    '+': ' + ', '-': ' - ', '=': ' = ',
    '×': '\\times ', '÷': '\\div ', '·': '\\cdot ', '±': '\\pm ',
    '≤': '\\leq ', '≥': '\\geq ', '≠': '\\neq ',
    '≈': '\\approx ', '≡': '\\equiv ', '∼': '\\sim ', '∝': '\\propto ',
    '∑': '\\sum ', '∏': '\\prod ', '∫': '\\int ', '∂': '\\partial ',
    '∇': '\\nabla ', '∞': '\\infty ',
    '→': '\\to ', '←': '\\leftarrow ', '↔': '\\leftrightarrow ',
    '⇒': '\\Rightarrow ', '⇐': '\\Leftarrow ', '⇔': '\\Leftrightarrow ',
    '∴': '\\therefore ', '∵': '\\because ',
    '⊕': '\\oplus ', '⊗': '\\otimes ',
    '∧': '\\wedge ', '∨': '\\vee ', '¬': '\\neg ',
    '∈': '\\in ', '⊂': '\\subset ', '⊃': '\\supset ',
    '⊆': '\\subseteq ', '⊇': '\\supseteq ',
    '∪': '\\cup ', '∩': '\\cap ', '∅': '\\emptyset ',
    '∀': '\\forall ', '∃': '\\exists ',
    '…': '\\ldots ', '⋮': '\\vdots ', '⋯': '\\cdots ',
  };
  return ops[op] || op;
}

// ─── Pure ProseMirror NodeView (NO React) ─────────────────────────
//
// Returns a plain object from a factory function — the most compatible
// approach with ProseMirror across all bundlers and environments.

function createMathNodeView(...args: unknown[]) {
  try {
    let node: ProseNode;
    let view: EditorView;
    let getPos: (() => number) | boolean;

    if (args.length >= 3 && args[0] && (args[0] as any).type) {
      // Standard ProseMirror calling convention: (node, view, getPos, ...)
      node = args[0] as ProseNode;
      view = args[1] as EditorView;
      getPos = args[2] as (() => number) | boolean;
    } else if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      // TipTap v3 wrapped calling convention: single options object
      const opts = args[0] as Record<string, unknown>;
      node = opts.node as ProseNode;
      view = opts.view as EditorView;
      getPos = opts.getPos as (() => number) | boolean;
    } else {
      console.warn('[MathNV] unexpected args:', args.length, typeof args[0]);
      const span = document.createElement('span');
      span.textContent = 'math';
      return { dom: span, update: () => false, destroy() {}, ignoreMutation() { return true; } };
    }

    if (!node) {
      console.warn('[MathNV] node unresolved');
      const span = document.createElement('span');
      span.textContent = 'math';
      return { dom: span, update: () => false, destroy() {}, ignoreMutation() { return true; } };
    }

    return _createMathNodeViewInner(node, view!, getPos!);
  } catch (err) {
    console.error('[MathNV] error:', err);
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-block;font-family:monospace;font-size:0.875rem;background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:4px;cursor:pointer';
    try { span.textContent = (args[0] as any)?.node?.attrs?.latex || 'math'; } catch { span.textContent = 'math'; }
    return { dom: span, update: () => false, destroy() {}, ignoreMutation() { return true; } };
  }
}

function _createMathNodeViewInner(
  node: ProseNode,
  view: EditorView,
  getPos: (() => number) | boolean,
) {
  const getPosFn = typeof getPos === 'function' ? getPos : () => getPos as number;

  // DOM elements
  const dom = document.createElement('span');
  dom.style.display = 'inline-block';
  dom.style.whiteSpace = 'normal';

  const inner = document.createElement('span');
  inner.style.display = 'inline-block';
  inner.style.cursor = 'pointer';
  inner.style.padding = '2px 4px';
  inner.style.borderRadius = '4px';
  inner.style.transition = 'background-color 0.15s';
  inner.title = 'Double-click to edit';

  dom.appendChild(inner);

  // State
  let currentNode = node;
  let editing = false;
  let ignoreBlur = false;

  // Render KaTeX into the inner span
  function renderMath() {
    try {
      const { latex, displayMode } = currentNode.attrs;
      inner.innerHTML = renderKatexToHtml(latex || '', displayMode);
    } catch (e) {
      console.error('[MathNV] renderMath error:', e);
      inner.textContent = currentNode?.attrs?.latex || '';
    }
  }

  // Start inline editing mode
  function startEditing() {
    if (editing) return;
    editing = true;

    const currentLatex = currentNode.attrs.latex || '';
    inner.innerHTML = '';
    inner.style.backgroundColor = '';
    inner.style.cursor = 'default';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:hsl(var(--muted));border-radius:6px;border:1px solid hsl(var(--primary)/0.5)';

    const dollarL = document.createElement('span');
    dollarL.textContent = '$';
    dollarL.style.cssText = 'font-size:0.75rem;color:hsl(var(--muted-foreground));font-family:monospace';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentLatex;
    input.placeholder = 'LaTeX formula...';
    input.style.cssText = 'background:transparent;border:none;outline:none;font-size:0.875rem;font-family:monospace;min-width:60px;max-width:300px';

    const dollarR = document.createElement('span');
    dollarR.textContent = '$';
    dollarR.style.cssText = 'font-size:0.75rem;color:hsl(var(--muted-foreground));font-family:monospace';

    wrapper.appendChild(dollarL);
    wrapper.appendChild(input);
    wrapper.appendChild(dollarR);
    inner.appendChild(wrapper);

    requestAnimationFrame(() => { input.focus(); input.select(); });

    function finishEdit() {
      if (ignoreBlur) return;
      const val = input.value.trim();
      const pos = getPosFn();
      if (typeof pos !== 'number') return;
      if (val) {
        const tr = view.state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, latex: val });
        view.dispatch(tr);
      } else {
        const tr = view.state.tr.delete(pos, pos + currentNode.nodeSize);
        view.dispatch(tr);
      }
    }

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ignoreBlur = true;
        finishEdit();
      }
      if (e.key === 'Escape') {
        ignoreBlur = true;
        editing = false;
        renderMath();
        inner.style.cursor = 'pointer';
      }
    });

    input.addEventListener('blur', () => {
      if (ignoreBlur) { ignoreBlur = false; return; }
      finishEdit();
    });
  }

  // Hover effect
  inner.addEventListener('mouseenter', () => {
    if (!editing) inner.style.backgroundColor = 'rgba(0,0,0,0.04)';
  });
  inner.addEventListener('mouseleave', () => {
    if (!editing) inner.style.backgroundColor = '';
  });

  // Double-click to edit
  inner.addEventListener('dblclick', () => startEditing());

  // Initial render
  renderMath();

  // Ensure KaTeX is loaded
  if (!_katex) {
    loadKatex().then(() => { if (!editing) renderMath(); });
  }

  // Return the NodeView interface — plain object, no class
  return {
    dom,
    update(newNode: ProseNode): boolean {
      if (newNode.type !== currentNode.type) return false;
      currentNode = newNode;
      if (!editing) renderMath();
      return true;
    },
    destroy() { /* no cleanup needed */ },
    ignoreMutation() { return true }, // prevent ProseMirror from interfering with our DOM
  };
}

// ─── TipTap Math Node ─────────────────────────────────────────────

interface MathNodeAttrs {
  latex: string;
  displayMode: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      setMath: (attrs: { latex: string; displayMode?: boolean }) => ReturnType;
      unsetMath: () => ReturnType;
    };
  }
}

export const MathExtension = Node.create({
  name: 'math',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('latex') || '',
        renderHTML: (attributes) => ({ latex: attributes.latex }),
      },
      displayMode: {
        default: false,
        parseHTML: (element) => {
          const val = element.getAttribute('displaymode');
          if (val !== null) return val === 'true';
          return false;
        },
        renderHTML: (attributes) => ({
          displaymode: String(!!attributes.displayMode),
        }),
      },
    };
  },

  addCommands() {
    return {
      setMath:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      unsetMath:
        () =>
        ({ commands }) => {
          return commands.deleteSelection();
        },
    };
  },

  parseHTML() {
    return [
      { tag: 'math-node' },
      {
        tag: 'span[data-math-node]',
        getAttrs: (dom: HTMLElement) => ({
          latex: dom.getAttribute('data-latex') || '',
          displayMode: dom.getAttribute('data-display-mode') === 'true',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['math-node', mergeAttributes(HTMLAttributes)];
  },

  addInputRules() {
    return [
      {
        find: /\$\$(.+?)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          state.tr
            .replaceWith(range.from, range.to, state.schema.nodes.math.create({ latex, displayMode: true }))
            .scrollIntoView();
        },
      },
      {
        find: /\$(.+?)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          state.tr
            .replaceWith(range.from, range.to, state.schema.nodes.math.create({ latex, displayMode: false }))
            .scrollIntoView();
        },
      },
    ];
  },

  addNodeView() {
    return createMathNodeView;
  },
});

// ─── Pre-load katex (client-only) ─────────────────────────────────

if (typeof window !== 'undefined') {
  loadKatex();
}