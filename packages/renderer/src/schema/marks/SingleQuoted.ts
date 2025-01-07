import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import { SINGLE_QUOTED_CLASS } from '../helpers/quoted';
import { MARK_NAME_SINGLE_QUOTED, SK_TOGGLE_SINGLEQUOTE } from '../../common';

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
      setSingleQuoted:
        () =>
          ({ commands }) => {
            return commands.setMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
              includeSpaces: true,
            });
          },
      toggleSingleQuoted:
        () =>
          ({ commands }) => {
            return commands.toggleMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
              includeSpaces: true,
            });
          },
      unsetSingleQuoted:
        () =>
          ({ commands }) => {
            return commands.unsetMarkNoAtoms(this.name, {
              excludeNonLeafAtoms: 'whole',
            });
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_SINGLEQUOTE]: () => this.editor.commands.toggleSingleQuoted(),
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
