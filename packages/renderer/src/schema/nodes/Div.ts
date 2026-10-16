import { Node, mergeAttributes } from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { lift, wrapIn } from '@tiptap/pm/commands';
import { NODE_NAME_DIV, SK } from '../../common';
import { asTiptapCommand } from '../helpers';

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
      setDiv: () => asTiptapCommand(setDivCommand),
      toggleDiv: () => asTiptapCommand(toggleDivCommand),
      unsetDiv: () => asTiptapCommand(unsetDivCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_DIV]: () =>
        this.editor.commands.toggleDiv(),
    };
  },
});

const setDivCommand: Command = (state, dispatch) => wrapIn(state.schema.nodes[NODE_NAME_DIV])(state, dispatch);
const toggleDivCommand: Command = (state, dispatch) => {
  const div = state.schema.nodes[NODE_NAME_DIV];
  const active = state.selection.$from.node(-1)?.type === div;
  return (active ? lift : wrapIn(div))(state, dispatch);
};
const unsetDivCommand: Command = (state, dispatch) => lift(state, dispatch);
