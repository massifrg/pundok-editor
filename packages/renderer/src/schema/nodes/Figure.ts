import { Node, mergeAttributes } from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { lift, wrapIn } from '@tiptap/pm/commands';
import { NODE_NAME_FIGURE, SK } from '../../common';
import { asTiptapCommand } from '../helpers';

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
      setFigure: () => asTiptapCommand(setFigureCommand),
      toggleFigure: () => asTiptapCommand(toggleFigureCommand),
      unsetFigure: () => asTiptapCommand(unsetFigureCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_FIGURE]: () =>
        this.editor.commands.toggleFigure(),
    };
  },
});

const setFigureCommand: Command = (state, dispatch) => wrapIn(state.schema.nodes[NODE_NAME_FIGURE])(state, dispatch);
const toggleFigureCommand: Command = (state, dispatch) => {
  const type = state.schema.nodes[NODE_NAME_FIGURE];
  return state.selection.$from.node(-1)?.type === type
    ? lift(state, dispatch)
    : wrapIn(type)(state, dispatch);
};
const unsetFigureCommand: Command = (state, dispatch) => lift(state, dispatch);
