import { mergeAttributes, Node } from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Component } from 'vue';
import { innerNodeDepth, templateNode } from '../helpers';
import { NODE_NAME_META_LIST } from '../../common';
import { MetaListView } from '../../components';
import { asTiptapCommand } from '../helpers';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metaList: {
      appendMetaListItem: (
        metaTypeName: string,
        pos?: number
      ) => ReturnType;
    };
  }
}

export interface MetaListOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaList = Node.create<MetaListOptions>({
  name: NODE_NAME_META_LIST,
  content: 'meta*',
  group: 'meta',
  isolating: true,
  // defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-list',
        style: 'list-style-type: square',
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'ul',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(MetaListView as Component);
  },

  addCommands() {
    return {
      appendMetaListItem: (metaTypeName: string, pos?: number) =>
        asTiptapCommand(appendMetaListItemCommand(metaTypeName, pos)),
    };
  },
});

const appendMetaListItemCommand = (metaTypeName: string, pos?: number): Command =>
  (state, dispatch) => {
    const { doc, schema, selection } = state;
    const $pos = pos ? doc.resolve(pos) : selection.$from;
    const mapDepth = innerNodeDepth($pos, node => node.type.name === NODE_NAME_META_LIST);
    if (!mapDepth) return false;
    const item = templateNode(schema, metaTypeName);
    if (!item) return false;
    const metalist = $pos.node(mapDepth);
    const inspos = $pos.start(mapDepth) + metalist.content.size;
    if (dispatch) dispatch(state.tr.insert(inspos, item.node));
    return true;
  };
