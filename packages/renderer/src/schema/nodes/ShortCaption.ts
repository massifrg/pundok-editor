import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_SHORT_CAPTION } from '../../common';

export interface ShortCaptionOptions {
  HTMLAttributes: Record<string, any>;
}

export const ShortCaption = Node.create({
  name: NODE_NAME_SHORT_CAPTION,
  content: 'inline*',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'short-caption',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.short-caption' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
