import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import {
  domToMathType,
  PANDOC_DEFAULT_MATH_TYPE,
  PANDOC_MATH_TYPES,
  mathTypeToHtmlAttributes,
} from '../helpers/mathType';
import { SK_TOGGLE_MATH } from '../../common';

export interface MathOptions {
  HTMLAttributes: Record<string, any>;
  mathTypes: string[];
  defaultMathType: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      /**
       * Set a math mark
       */
      setMath: () => ReturnType;
      /**
       * Toggle a math mark
       */
      toggleMath: () => ReturnType;
      /**
       * Unset a math mark
       */
      unsetMath: () => ReturnType;
    };
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const Math = Mark.create<MathOptions>({
  name: 'math',
  excludes: '_',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'math',
      },
      mathTypes: PANDOC_MATH_TYPES,
      defaultMathType: PANDOC_DEFAULT_MATH_TYPE,
    };
  },

  addAttributes() {
    return {
      mathType: {
        default: this.options.defaultMathType,
        parseHTML: (e) => domToMathType(e),
        renderHTML: (attrs) => mathTypeToHtmlAttributes(attrs.mathType),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span.math' }];
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
      setMath:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleMath:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetMath:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_MATH]: () => this.editor.commands.toggleMath(),
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
