// slightly modified from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-strike/src/strike.ts

import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import { SK_TOGGLE_STRIKEOUT } from '../../common';

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
  name: 'strikeout',

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
      setStrikeout:
        () =>
        ({ commands }) => {
          return commands.setMarkNoAtoms(this.name, null, {
            excludeNonLeafAtoms: 'whole',
          });
        },
      toggleStrikeout:
        () =>
        ({ commands }) => {
          return commands.toggleMarkNoAtoms(this.name, null, {
            excludeNonLeafAtoms: 'whole',
          });
        },
      unsetStrikeout:
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
      [SK_TOGGLE_STRIKEOUT]: () => this.editor.commands.toggleStrikeout(),
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
