import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import { DOUBLE_QUOTED_CLASS } from '../helpers/quoted';
import { MARK_NAME_DOUBLE_QUOTED, SK_TOGGLE_DOUBLEQUOTE } from '../../common';

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
      setDoubleQuoted:
        () =>
          ({ commands }) => {
            return commands.setMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
              includeSpaces: true,
            });
          },
      toggleDoubleQuoted:
        () =>
          ({ commands }) => {
            return commands.toggleMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
              includeSpaces: true,
            });
          },
      unsetDoubleQuoted:
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
      [SK_TOGGLE_DOUBLEQUOTE]: () => this.editor.commands.toggleDoubleQuoted(),
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
