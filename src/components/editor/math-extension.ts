import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MathViewInline } from './math-view-inline';
import { MathViewBlock } from './math-view-block';

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: {
        '\\placeholder': '\\textcolor{#888}{\\square}',
        '\\ph': '\\textcolor{#888}{\\square}',
      },
    });
  } catch {
    return `<span class="text-destructive text-xs">Invalid LaTeX</span>`;
  }
}

export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => ({ 'data-latex': attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'inline-math',
        class: 'inline-math-node',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathViewInline);
  },

  addCommands() {
    return {
      insertInlineMath:
        (latex?: string) =>
        ({ commands, state, dispatch }) => {
          const { tr, selection } = state;
          const node = this.type.create({ latex: latex || '\\placeholder ' });
          if (dispatch) {
            tr.replaceRangeWith(selection.from, selection.to, node);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {};
  },
});

export const BlockMath = Node.create({
  name: 'blockMath',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => ({ 'data-latex': attributes.latex }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="block-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'block-math',
        class: 'block-math-node',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathViewBlock);
  },

  addCommands() {
    return {
      insertBlockMath:
        (latex?: string) =>
        ({ commands, state, dispatch }) => {
          const { tr, selection } = state;
          const node = this.type.create({ latex: latex || '\\placeholder ' });
          if (dispatch) {
            const from = selection.from;
            tr.replaceRangeWith(from, selection.to, node);
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

export { renderLatex };