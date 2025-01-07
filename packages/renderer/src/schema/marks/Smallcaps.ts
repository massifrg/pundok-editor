import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import { MARK_NAME_SMALLCAPS, SK_TOGGLE_SMALLCAPS } from '../../common';

export interface SmallcapsOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smallcaps: {
      /**
       * Set a smallcaps mark
       */
      setSmallcaps: () => ReturnType;
      /**
       * Toggle a smallcaps mark
       */
      toggleSmallcaps: () => ReturnType;
      /**
       * Unset a smallcaps mark
       */
      unsetSmallcaps: () => ReturnType;
    };
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const Smallcaps = Mark.create<SmallcapsOptions>({
  name: MARK_NAME_SMALLCAPS,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'smallcaps',
        style: 'font-variant: small-caps',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (e) =>
          (e as HTMLElement).classList.contains('smallcaps') ? null : false,
      },
      // {
      //   style: 'font-variant',
      //   getAttrs: value => /^small-caps$/.test(value as string) && null
      // },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setSmallcaps:
        () =>
          ({ commands }) => {
            return commands.setMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
            });
          },
      toggleSmallcaps:
        () =>
          ({ commands }) => {
            return commands.toggleMarkNoAtoms(this.name, null, {
              excludeNonLeafAtoms: 'whole',
            });
          },
      unsetSmallcaps:
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
      [SK_TOGGLE_SMALLCAPS]: () => this.editor.commands.toggleSmallcaps(),
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
