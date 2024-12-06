import { mergeAttributes, Node } from '@tiptap/core';

export interface FigureCaptionOptions {
  HTMLAttributes: Record<string, any>;
}

export const FigureCaption = Node.create({
  name: 'figureCaption',
  content: 'shortCaption? block+',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'figure-caption',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.figure-caption' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
