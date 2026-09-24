import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_META_INLINES } from '../../common';

export interface MetaInlinesOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaInlines = Node.create<MetaInlinesOptions>({
  name: NODE_NAME_META_INLINES,
  content: 'inline*',
  group: 'meta',
  isolating: true,
  // defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-inlines',
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
