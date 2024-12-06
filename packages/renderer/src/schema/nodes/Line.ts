import { mergeAttributes, Node } from '@tiptap/core';
import { LINE_BLOCK_CLASS, LINE_BLOCK_LINE_CLASS } from '../helpers/lineBlock';

export interface LineOptions {
  HTMLAttributes: Record<string, any>;
}

export const Line = Node.create<LineOptions>({
  name: 'line',
  content: 'inline*',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: LINE_BLOCK_LINE_CLASS,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div.${LINE_BLOCK_LINE_CLASS}`,
        getAttrs: (element) => {
          const e = element as HTMLElement;
          const p = e.parentElement;
          const isLine =
            p &&
            e.classList.contains(LINE_BLOCK_LINE_CLASS) &&
            p.localName === 'div' &&
            p.classList.contains(LINE_BLOCK_CLASS);
          return isLine ? {} : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
