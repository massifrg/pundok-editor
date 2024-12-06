import { mergeAttributes, Node } from '@tiptap/core';

export interface MetaListOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaList = Node.create<MetaListOptions>({
  name: 'metaList',
  content: 'meta*',
  group: 'meta',
  isolating: true,
  // defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-list',
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
