import { mergeAttributes, Node } from '@tiptap/core';
import { isCellSelection } from '../helpers';
import { CellSelection } from '@massifrg/prosemirror-tables-sections';
import { SK_BREAK_PLAIN, SK_TOGGLE_PLAIN } from '../../common';

export interface PlainOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    plain: {
      /**
       * Set a plain
       */
      setPlain: () => ReturnType;
      /**
       * Put a line break in a Plain
       */
      setBreakInPlain: () => ReturnType;
      /**
       * Toggle a plain
       */
      togglePlain: () => ReturnType;
    };
  }
}

export const Plain = Node.create<PlainOptions>({
  name: 'plain',

  priority: 100,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'plain',
      },
    };
  },

  group: 'block',

  content: 'inline*',

  // parseHTML() {
  //   return [
  //     {
  //       tag: 'p',
  //       context: 'td|th',
  //       getAttrs(n) {
  //         const e = n as HTMLElement
  //         const p = e.parentElement
  //         if (!p) return false;
  //         const parentTag = p.localName
  //         console.log(p.classList)
  //         if (!p.classList.contains('inline-content')) return false
  //         if (p.localName !== 'td' && p.localName !== 'th') return false;
  //         return {}
  //       }
  //     },
  //   ]
  // },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setPlain:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
      setBreakInPlain:
        () =>
        ({ commands, state }) => {
          const { doc, selection } = state;
          const { empty, from } = selection;
          if (empty) {
            let inPlain = false;
            doc.nodesBetween(from, from, (node) => {
              if (node.type.name === this.name) {
                inPlain = true;
                return false;
              }
              return true;
            });
            if (inPlain) return commands.setBreak();
          }
          return false;
        },
      togglePlain:
        () =>
        ({ commands, state }) => {
          const sel = state.selection;
          if (isCellSelection(sel)) {
            let plains = 0,
              paras = 0;
            (sel as CellSelection).forEachCell((cell) => {
              if (cell.firstChild) {
                const firstTypeName = cell.firstChild.type.name;
                if (firstTypeName == 'paragraph') paras++;
                else if (firstTypeName == 'plain') plains++;
              }
            });
            return commands.setCellContentType(
              paras > plains ? 'plain' : 'paragraph',
            );
          } else {
            return commands.toggleNode(this.name, 'paragraph');
          }
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_BREAK_PLAIN]: () => this.editor.commands.setBreakInPlain(),
      [SK_TOGGLE_PLAIN]: () => this.editor.commands.togglePlain(),
    };
  },
});
