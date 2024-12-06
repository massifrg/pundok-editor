import { mergeAttributes, Node } from '@tiptap/core';
import { EmptySpanView } from '../index';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { SK_INSERT_ANCHOR } from '../../common';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emptySpan: {
      insertEmptySpan: (attrs: Record<string, any>) => ReturnType;
    };
  }
}

export interface EmptySpanOptions {
  HTMLAttributes: Record<string, any>;
  placeholder: (indexName: string) => string;
}

export const EmptySpan = Node.create<EmptySpanOptions>({
  name: 'emptySpan',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,
  marks: '_',

  addOptions() {
    return {
      HTMLAttributes: {},
      placeholder: (spanType: string) => '⚑',
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (e) => ((e as HTMLElement).hasChildNodes() ? false : null),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      this.options.placeholder(node.attrs.indexName),
    ];
  },

  addCommands() {
    return {
      insertEmptySpan:
        (attrs: Record<string, any>) =>
        ({ state, dispatch }) => {
          const emptySpanType = state.schema.nodes.emptySpan;
          const { $from, empty } = state.selection,
            index = $from.index();
          if (
            !empty ||
            !$from.parent.canReplaceWith(index, index, emptySpanType)
          )
            return false;
          if (dispatch) {
            const inode = emptySpanType.create(attrs);
            dispatch(state.tr.replaceSelectionWith(inode));
          }
          return true;
        },
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(EmptySpanView);
  },

  addKeyboardShortcuts() {
    return {
      [SK_INSERT_ANCHOR]: () =>
        this.editor.commands.insertEmptySpan({ classes: ['anchor'] }),
    };
  },
});
