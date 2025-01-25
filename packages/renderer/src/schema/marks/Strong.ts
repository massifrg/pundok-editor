// adapted from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-bold/src/bold.ts

import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import { MARK_NAME_STRONG, SK_TOGGLE_STRONG } from '../../common';

export interface StrongOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    strong: {
      /**
       * Set a strong mark
       */
      setStrong: () => ReturnType;
      /**
       * Toggle a strong mark
       */
      toggleStrong: () => ReturnType;
      /**
       * Unset a strong mark
       */
      unsetStrong: () => ReturnType;
    };
  }
}

export const starInputRegex = /(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))$/;
export const starPasteRegex = /(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))/g;
export const underscoreInputRegex = /(?:^|\s)((?:__)((?:[^__]+))(?:__))$/;
export const underscorePasteRegex = /(?:^|\s)((?:__)((?:[^__]+))(?:__))/g;

export const Strong = Mark.create<StrongOptions>({
  name: MARK_NAME_STRONG,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'strong',
      },
      {
        tag: 'b',
        getAttrs: (node) =>
          (node as HTMLElement).style.fontWeight !== 'normal' && null,
      },
      // {
      //   style: 'font-weight',
      //   getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      // },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'strong',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setStrong:
        () =>
          ({ commands }) => {
            return commands.setMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
            });
          },
      toggleStrong:
        () =>
          ({ commands }) => {
            return commands.toggleMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
            });
          },
      unsetStrong:
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
      [SK_TOGGLE_STRONG]: () => this.editor.commands.toggleStrong(),
      // [SK_TOGGLE_BOLD_ALT]: () => this.editor.commands.toggleStrong(),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: starInputRegex,
        type: this.type,
      }),
      markInputRule({
        find: underscoreInputRegex,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: starPasteRegex,
        type: this.type,
      }),
      markPasteRule({
        find: underscorePasteRegex,
        type: this.type,
      }),
    ];
  },
});
