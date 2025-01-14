import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { TextSelection } from '@tiptap/pm/state';
import { Component } from 'vue';
import { NODE_NAME_META_LIST, NODE_NAME_META_MAP } from '../../common';
import { innerNodeDepth, templateNode } from '../helpers';
import { MetaMapView } from '../../components';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metaMap: {
      appendMetaMap: (pos?: number) => ReturnType;
    };
  }
}

export interface MetaMapOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaMap = Node.create<MetaMapOptions>({
  name: NODE_NAME_META_MAP,
  content: 'metaMapEntry+',
  group: 'meta',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-map',
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(MetaMapView as Component);
  },

  addCommands() {
    const self = this
    return {
      appendMetaMap: (pos?: number) => ({ dispatch, state, tr }) => {
        const { doc, schema, selection } = state;
        const metamap = templateNode(schema, NODE_NAME_META_MAP)
        if (!metamap) return false
        // console.log(metavalue)
        const entryType = schema.nodes[self.name];
        if (!entryType) return false;
        const $pos = pos ? doc.resolve(pos) : selection.$from
        const listDepth = innerNodeDepth($pos, node => node.type.name === NODE_NAME_META_LIST)
        if (!listDepth) return false
        let inspos: number
        const metalist = $pos.node(listDepth)
        inspos = $pos.start(listDepth) + metalist.content.size
        // console.log(`appendMetaMap, found metaList@${$pos.start(listDepth) - 1}, insertion pos: ${inspos}`)
        if (dispatch) {
          tr.insert(inspos, metamap.node)
          tr.setSelection(new TextSelection(tr.doc.resolve(inspos + 1)))
          dispatch(tr)
        }
        return true;
      },
    }
  }
})
