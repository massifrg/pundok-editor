import { mergeAttributes, Node } from '@tiptap/core';
import { LINE_BLOCK_CLASS } from '../helpers/lineBlock';

export interface LineBlockOptions {
  HTMLAttributes: Record<string, any>
}

export const LineBlock = Node.create<LineBlockOptions>({
  name: 'lineBlock',
  content: 'line*',
  group: 'block',

  addOptions() {
    return {
      HTMLAttributes: {
        class: LINE_BLOCK_CLASS,
      },
    };
  },

  parseHTML() {
    return [{ tag: `div.${LINE_BLOCK_CLASS}` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
