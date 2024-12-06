import { mergeAttributes, Node } from '@tiptap/core';

export interface MetaBlocksOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaBlocks = Node.create<MetaBlocksOptions>({
  name: 'metaBlocks',
  content: 'block+',
  group: 'meta',
  isolating: true,

  // defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-blocks',
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
