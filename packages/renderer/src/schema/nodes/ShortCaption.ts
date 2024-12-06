import { mergeAttributes, Node } from '@tiptap/core';

export interface ShortCaptionOptions {
  HTMLAttributes: Record<string, any>;
}

export const ShortCaption = Node.create({
  name: 'shortCaption',
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
