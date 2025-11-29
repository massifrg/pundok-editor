import { mergeAttributes } from '@tiptap/core';
import { HardBreak, type HardBreakOptions } from '@tiptap/extension-hard-break';
import { NODE_BREAK_CLASS, NODE_BREAK_SOFT_CLASS, NODE_NAME_BREAK, SK } from '../../common';
import { getSpanAttrs } from '../helpers';

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
        // parseHTML: (e) => ({ soft: e.classList.contains(NODE_BREAK_SOFT_CLASS) }),
        renderHTML: (attributes) => (attributes.soft ? { class: NODE_BREAK_SOFT_CLASS } : {}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      { class: `${NODE_BREAK_CLASS}${node.attrs.soft ? (' ' + NODE_BREAK_SOFT_CLASS) : ''}` },
      ['br', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)],
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (e) => getSpanAttrs(this.name, e, this.editor?.state),
      }
    ]
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
      [SK.SET_LINEBREAK]: () => this.editor.commands.setBreak(),
      [SK.SET_LINEBREAK_ALT]: () => this.editor.commands.setBreak(),
      [SK.SET_SOFTBREAK]: () => this.editor.commands.setBreak(true),
    };
  },
});
