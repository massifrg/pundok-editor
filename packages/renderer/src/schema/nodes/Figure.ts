import { Node, mergeAttributes } from '@tiptap/core';
import { NODE_NAME_FIGURE, SK_TOGGLE_FIGURE } from '../../common';

export interface FigureOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      setFigure: () => ReturnType;
      toggleFigure: () => ReturnType;
      unsetFigure: () => ReturnType;
    };
  }
}

export const Figure = Node.create<FigureOptions>({
  name: NODE_NAME_FIGURE,

  content: 'figureCaption? block+',

  group: 'block',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'figure',
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

  addCommands() {
    return {
      setFigure:
        () =>
          ({ commands }) => {
            return commands.wrapIn(this.name);
          },
      toggleFigure:
        () =>
          ({ commands }) => {
            return commands.toggleWrap(this.name);
          },
      unsetFigure:
        () =>
          ({ commands }) => {
            return commands.lift(this.name);
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_FIGURE]: () =>
        this.editor.commands.toggleFigure(),
    };
  },
});
