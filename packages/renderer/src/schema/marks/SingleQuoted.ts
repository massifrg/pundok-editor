import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { SINGLE_QUOTED_CLASS } from '../helpers';
import { MARK_NAME_SINGLE_QUOTED, SK } from '../../common';
import { asTiptapCommand } from '../helpers';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';

export interface SingleQuotedOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    singleQuoted: {
      /**
       * Set a singleQuoted mark
       */
      setSingleQuoted: () => ReturnType;
      /**
       * Toggle a single singleQuoted mark
       */
      toggleSingleQuoted: () => ReturnType;
      /**
       * Unset a singleQuoted mark
       */
      unsetSingleQuoted: () => ReturnType;
    };
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const SingleQuoted = Mark.create<SingleQuotedOptions>({
  name: MARK_NAME_SINGLE_QUOTED,
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: SINGLE_QUOTED_CLASS,
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
      setSingleQuoted: () => asTiptapCommand(setSingleQuotedCommand),
      toggleSingleQuoted: () => asTiptapCommand(toggleSingleQuotedCommand),
      unsetSingleQuoted: () => asTiptapCommand(unsetSingleQuotedCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_SINGLEQUOTE]: () => this.editor.commands.toggleSingleQuoted(),
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

const setSingleQuotedCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_SINGLE_QUOTED];
  return !!mark && setMarkNoAtoms(mark, null, { excludeNonLeafAtoms: 'whole', includeSpaces: true })(state, dispatch);
};
const toggleSingleQuotedCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_SINGLE_QUOTED];
  return !!mark && toggleMarkNoAtoms(mark, null, { excludeNonLeafAtoms: 'whole', includeSpaces: true })(state, dispatch);
};
const unsetSingleQuotedCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_SINGLE_QUOTED];
  return !!mark && unsetMarkNoAtoms(mark, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
};
