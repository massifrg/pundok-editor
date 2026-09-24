import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_META_STRING } from '../../common';

export interface MetaStringOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaString = Node.create<MetaStringOptions>({
  name: NODE_NAME_META_STRING,
  content: 'text*',
  group: 'meta',
  isolating: true,
  marks: '',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-string',
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
