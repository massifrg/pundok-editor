// slightly modified from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-strike/src/strike.ts

import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { MARK_NAME_STRIKEOUT, SK } from '../../common';
import { asTiptapCommand } from '../helpers';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';

export interface StrikeoutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    strikeout: {
      /**
       * Set a strikeout mark
       */
      setStrikeout: () => ReturnType;
      /**
       * Toggle a strikeout mark
       */
      toggleStrikeout: () => ReturnType;
      /**
       * Unset a strikeout mark
       */
      unsetStrikeout: () => ReturnType;
    };
  }
}

export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/;
export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g;

export const Strikeout = Mark.create<StrikeoutOptions>({
  name: MARK_NAME_STRIKEOUT,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 's',
      },
      {
        tag: 'del',
      },
      {
        tag: 'strike',
      },
      // {
      //   style: 'text-decoration',
      //   consuming: false,
      //   getAttrs: style => ((style as string).includes('line-through') ? {} : false),
      // },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      's',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setStrikeout: () => asTiptapCommand(setStrikeoutCommand),
      toggleStrikeout: () => asTiptapCommand(toggleStrikeoutCommand),
      unsetStrikeout: () => asTiptapCommand(unsetStrikeoutCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_STRIKEOUT]: () => this.editor.commands.toggleStrikeout(),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: inputRegex,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: pasteRegex,
        type: this.type,
      }),
    ];
  },
});

const setStrikeoutCommand: Command = (state, dispatch) =>
  setMarkNoAtoms(state.schema.marks[MARK_NAME_STRIKEOUT], null, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
const toggleStrikeoutCommand: Command = (state, dispatch) =>
  toggleMarkNoAtoms(state.schema.marks[MARK_NAME_STRIKEOUT], null, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
const unsetStrikeoutCommand: Command = (state, dispatch) =>
  unsetMarkNoAtoms(state.schema.marks[MARK_NAME_STRIKEOUT], { excludeNonLeafAtoms: 'whole' })(state, dispatch);
