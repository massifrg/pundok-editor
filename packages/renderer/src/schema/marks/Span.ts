import { Mark, mergeAttributes } from '@tiptap/core';
import { SK_TOGGLE_SPAN } from '../../common';

export interface SpanOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    span: {
      setSpan: (attributes?: { customClasses: string[] }) => ReturnType;
      toggleSpan: (attributes?: { customClasses: string[] }) => ReturnType;
      unsetSpan: () => ReturnType;
      // unsetSpanIfUnsetAttrs: (options?: DefaultAttrValuesOptions, from?: number, to?: number) => ReturnType,
    };
  }
}

export const Span = Mark.create<SpanOptions>({
  name: 'span',
  priority: 500,
  excludes: '',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
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
      setSpan:
        (attributes) =>
        ({ commands }) => {
          return commands.setMarkNoAtoms(this.name, attributes, {
            excludeNonLeafAtoms: 'only-content',
          });
        },
      toggleSpan:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMarkNoAtoms(this.name, attributes, {
            excludeNonLeafAtoms: 'only-content',
            extendEmptyMarkRange: true,
          });
        },
      unsetSpan:
        () =>
        ({ commands }) => {
          return commands.unsetMarkNoAtoms(this.name, {
            excludeNonLeafAtoms: 'only-content',
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_SPAN]: () => this.editor.commands.toggleSpan(),
    };
  },
});
