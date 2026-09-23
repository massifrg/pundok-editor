import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { DOUBLE_QUOTED_CLASS } from '../helpers/quoted';
import { MARK_NAME_DOUBLE_QUOTED, SK } from '../../common';
import { asTiptapCommand } from '../helpers/command';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';

export interface DoubleQuotedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    doubleQuoted: {
      /**
       * Set a doubleQuoted mark
       */
      setDoubleQuoted: () => ReturnType;
      /**
       * Toggle a double doubleQuoted mark
       */
      toggleDoubleQuoted: () => ReturnType;
      /**
       * Unset a doubleQuoted mark
       */
      unsetDoubleQuoted: () => ReturnType;
    };
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const DoubleQuoted = Mark.create<DoubleQuotedOptions>({
  name: MARK_NAME_DOUBLE_QUOTED,
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: DOUBLE_QUOTED_CLASS,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'q' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'q',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setDoubleQuoted: () => asTiptapCommand(setDoubleQuotedCommand),
      toggleDoubleQuoted: () => asTiptapCommand(toggleDoubleQuotedCommand),
      unsetDoubleQuoted: () => asTiptapCommand(unsetDoubleQuotedCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_DOUBLEQUOTE]: () => this.editor.commands.toggleDoubleQuoted(),
    };
  },

  // addInputRules() {
  //   return [
  //     markInputRule({
  //       find: inputRegex,
  //       type: this.type,
  //     }),
  //   ]
  // },

  // addPasteRules() {
  //   return [
  //     markPasteRule({
  //       find: pasteRegex,
  //       type: this.type,
  //     }),
  //   ]
  // },
});

const setDoubleQuotedCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_DOUBLE_QUOTED];
  return !!mark && setMarkNoAtoms(mark, null, { excludeNonLeafAtoms: 'whole', includeSpaces: true })(state, dispatch);
};
const toggleDoubleQuotedCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_DOUBLE_QUOTED];
  return !!mark && toggleMarkNoAtoms(mark, null, { excludeNonLeafAtoms: 'whole', includeSpaces: true })(state, dispatch);
};
const unsetDoubleQuotedCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_DOUBLE_QUOTED];
  return !!mark && unsetMarkNoAtoms(mark, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
};
