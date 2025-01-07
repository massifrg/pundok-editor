import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_META_MAP } from '../../common';

export interface MetaMapOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaMap = Node.create<MetaMapOptions>({
  name: NODE_NAME_META_MAP,
  content: 'metaMapEntry+',
  group: 'meta',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-map',
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
