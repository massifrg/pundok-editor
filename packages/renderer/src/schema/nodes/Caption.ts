import { mergeAttributes, Node } from '@tiptap/core';

export interface CaptionOptions {
  HTMLAttributes: Record<string, any>;
}

export const Caption = Node.create({
  name: 'caption',
  content: 'shortCaption? block+',
  isolating: true,
  tableRole: 'caption',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'table-caption',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'caption' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'caption',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
