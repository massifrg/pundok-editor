import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_META_BLOCKS } from '../../common';

export interface MetaBlocksOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaBlocks = Node.create<MetaBlocksOptions>({
  name: NODE_NAME_META_BLOCKS,
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
