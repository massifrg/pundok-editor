import { mergeAttributes } from '@tiptap/core';
import { HardBreak, type HardBreakOptions } from '@tiptap/extension-hard-break';
import {
  NODE_NAME_BREAK,
  SK_SET_LINEBREAK,
  SK_SET_LINEBREAK_ALT,
  SK_SET_SOFTBREAK,
} from '../../common';

export type BreakOptions = HardBreakOptions;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    softBreak: {
      /**
       * Add a hard break
       */
      setBreak: (soft?: boolean) => ReturnType;
    };
  }
}

export const Break = HardBreak.extend<BreakOptions>({
  name: NODE_NAME_BREAK,
  marks: '_',

  addAttributes() {
    return {
      soft: {
        default: false,
        parseHTML: (e) => ({ soft: e.classList.contains('soft') }),
        renderHTML: (attributes) => (attributes.soft ? { class: 'soft' } : {}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      { class: `br${node.attrs.soft ? ' soft' : ''}` },
      ['br', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)],
    ];
  },

  addCommands() {
    return {
      setBreak:
        (soft?: boolean) =>
          ({ commands, chain, state, editor }) => {
            return commands.first([
              () => commands.exitCode(),
              () =>
                commands.command(() => {
                  const { selection, storedMarks } = state;

                  if (selection.$from.parent.type.spec.isolating) {
                    return false;
                  }

                  const { keepMarks } = this.options;
                  const { splittableMarks } = editor.extensionManager;
                  const marks =
                    storedMarks ||
                    (selection.$to.parentOffset && selection.$from.marks());

                  const attrs = soft ? { soft: true } : {};
                  return chain()
                    .insertContent({ type: this.name, attrs })
                    .command(({ tr, dispatch }) => {
                      if (dispatch && marks && keepMarks) {
                        const filteredMarks = marks.filter((mark) =>
                          splittableMarks.includes(mark.type.name),
                        );

                        tr.ensureMarks(filteredMarks);
                      }

                      return true;
                    })
                    .run();
                }),
            ]);
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_SET_LINEBREAK]: () => this.editor.commands.setBreak(),
      [SK_SET_LINEBREAK_ALT]: () => this.editor.commands.setBreak(),
      [SK_SET_SOFTBREAK]: () => this.editor.commands.setBreak(true),
    };
  },
});
