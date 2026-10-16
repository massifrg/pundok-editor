import { mergeAttributes, Node } from '@tiptap/core';
import { CellSelection } from '@massifrg/prosemirror-tables-sections';
import type { Command } from '@tiptap/pm/state';
import { setBlockType } from '@tiptap/pm/commands';
import { NODE_NAME_BREAK, NODE_NAME_PLAIN, NODE_PLAIN_CLASS, SK } from '../../common';
import { isCellSelection } from '../helpers/pandocTable';
import { asTiptapCommand } from '../helpers';

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
  name: NODE_NAME_PLAIN,

  priority: 100,

  addOptions() {
    return {
      HTMLAttributes: {
        class: NODE_PLAIN_CLASS,
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
      setPlain: () => asTiptapCommand(setPlainCommand),
      setBreakInPlain: () => asTiptapCommand(setBreakInPlainCommand),
      togglePlain: () => asTiptapCommand(togglePlainCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.BREAK_PLAIN]: () => this.editor.commands.setBreakInPlain(),
      [SK.TOGGLE_PLAIN]: () => this.editor.commands.togglePlain(),
    };
  },
});

const setPlainCommand: Command = (state, dispatch) =>
  setBlockType(state.schema.nodes[NODE_NAME_PLAIN])(state, dispatch);

const setBreakInPlainCommand: Command = (state, dispatch) => {
  const { empty, from } = state.selection;
  if (!empty) return false;
  let inPlain = false;
  state.doc.nodesBetween(from, from, (node) => {
    if (node.type.name === NODE_NAME_PLAIN) {
      inPlain = true;
      return false;
    }
    return true;
  });
  if (!inPlain) return false;
  const breakType = state.schema.nodes[NODE_NAME_BREAK];
  if (!breakType) return false;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(breakType.create()));
  return true;
};

const togglePlainCommand: Command = (state, dispatch) => {
  const sel = state.selection;
  if (isCellSelection(sel)) {
    let plains = 0, paras = 0;
    (sel as CellSelection).forEachCell((cell) => {
      if (cell.firstChild?.type.name === 'paragraph') paras++;
      else if (cell.firstChild?.type.name === NODE_NAME_PLAIN) plains++;
    });
    const type = state.schema.nodes[paras > plains ? NODE_NAME_PLAIN : 'paragraph'];
    if (!type) return false;
    if (dispatch) {
      const tr = state.tr;
      (sel as CellSelection).forEachCell((cell, pos) => {
        if (cell.childCount === 1 && cell.firstChild!.type !== type)
          tr.replaceRangeWith(pos + 1, pos + 1 + cell.content.size, type.create(null, cell.firstChild!.content));
      });
      dispatch(tr);
    }
    return true;
  }
  const target = sel.$from.parent.type.name === NODE_NAME_PLAIN
    ? state.schema.nodes.paragraph
    : state.schema.nodes[NODE_NAME_PLAIN];
  return !!target && setBlockType(target)(state, dispatch);
};
