import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { PMCitation } from '../helpers/citation';

export interface CiteOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cite: {
      /**
       * Set a cite mark
       */
      setCite: () => ReturnType,
      /**
       * Toggle a cite mark
       */
      toggleCite: () => ReturnType,
      /**
       * Unset a cite mark
       */
      unsetCite: () => ReturnType,
    }
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const Cite = Mark.create<CiteOptions>({
  name: 'cite',

  priority: 1200,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      citations: {
        default: [] as PMCitation[],
        parseHTML(element) {
          return JSON.parse(element.getAttribute('data-citations') || '[]');
        },
        renderHTML(attr) {
          return {
            'data-citations': JSON.stringify(attr.citations),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'cite' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['cite', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCite: () => ({ commands }) => {
        return commands.setMark(this.name);
      },
      toggleCite: () => ({ commands }) => {
        return commands.toggleMark(this.name);
      },
      unsetCite: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },

  // addKeyboardShortcuts() {
  //   return {
  //     'Mod-k': () => this.editor.commands.toggleCite(),
  //   }
  // },

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
