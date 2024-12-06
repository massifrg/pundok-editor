import { mergeAttributes, Node } from '@tiptap/core';
import { Node as PmNode } from '@tiptap/pm/model';
import { INDEX_CLASS, INDEX_NAME_ATTR } from '../../common';
import { IndexTerm } from './IndexTerm';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexDiv: {
      propagateIndexNameToTerms: (indexPos?: number) => ReturnType;
    };
  }
}

export interface IndexDivOptions {
  HTMLAttributes: Record<string, any>;
}

export const IndexDiv = Node.create<IndexDivOptions>({
  name: 'indexDiv',
  content: '(div|indexTerm|rawBlock)+',
  group: 'block',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: INDEX_CLASS,
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      propagateIndexNameToTerms:
        (indexPos?: number) =>
        ({ dispatch, state, tr }) => {
          let indexNode: PmNode | undefined | null = undefined;
          let start = indexPos && indexPos + 1;
          const { doc, selection } = state;
          if (indexPos) indexNode = doc.nodeAt(indexPos);
          if (!indexNode || indexNode.type.name !== this.name) {
            const $from = selection.$from;
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              if (node.type.name === this.name) {
                indexNode = node;
                start = $from.start(d);
                break;
              }
            }
          }
          if (!indexNode || !start) return false;
          const indexName = indexNode.attrs.kv[INDEX_NAME_ATTR];
          if (!indexName) return false;
          if (dispatch) {
            indexNode.descendants((n, p) => {
              if (n.type.name === IndexTerm.name) {
                const kv = { ...n.attrs.kv, [INDEX_NAME_ATTR]: indexName };
                console.log(`change index name at ${start! + p}`);
                tr = tr.setNodeAttribute(start! + p, 'kv', kv);
              }
            });
            dispatch(tr);
          }
          return true;
        },
    };
  },
});