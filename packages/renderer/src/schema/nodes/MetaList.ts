import { mergeAttributes, Node } from '@tiptap/core';
import { innerNodeDepth, templateNode } from '../helpers';
import { NODE_NAME_META_LIST } from '../../common';

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

  addCommands() {
    return {
      appendMetaListItem:
        (metaTypeName: string, pos?: number) =>
          ({ dispatch, state, tr }) => {
            const { doc, schema, selection } = state;
            const $pos = pos ? doc.resolve(pos) : selection.$from
            const mapDepth = innerNodeDepth($pos, node => node.type.name === NODE_NAME_META_LIST)
            console.log(`appendMetaListItem, pos = ${JSON.stringify(pos)}`)
            if (!mapDepth) return false
            const item = templateNode(schema, metaTypeName);
            if (!item) return false
            const metalist = $pos.node(mapDepth)
            const inspos = $pos.start(mapDepth) + metalist.content.size
            console.log(`appendMetaListItem, $pos.start(mapDepth) = ${$pos.start(mapDepth)}`)
            console.log(`appendMetaListItem, found ${metalist?.type.name}, insertion pos: ${inspos}`)
            if (dispatch) {
              if (!item) return false;
              dispatch(tr.insert(inspos, item.node));
            }
            return true;
          }
    }
  }
});
