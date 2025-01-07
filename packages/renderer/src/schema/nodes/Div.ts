import { Node, mergeAttributes } from '@tiptap/core';
import { NODE_NAME_DIV, SK_TOGGLE_DIV } from '../../common';

export interface DivOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    div: {
      setDiv: () => ReturnType;
      toggleDiv: () => ReturnType;
      unsetDiv: () => ReturnType;
    };
  }
}

export const Div = Node.create<DivOptions>({
  name: NODE_NAME_DIV,

  content: 'block+',

  group: 'block',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'div',
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
      setDiv:
        () =>
          ({ commands }) => {
            return commands.wrapIn(this.name);
          },
      toggleDiv:
        () =>
          ({ commands }) => {
            return commands.toggleWrap(this.name);
          },
      unsetDiv:
        () =>
          ({ commands }) => {
            return commands.lift(this.name);
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_DIV]: () =>
        this.editor.commands.wrapIn(this.editor.schema.nodes.div),
    };
  },
});
