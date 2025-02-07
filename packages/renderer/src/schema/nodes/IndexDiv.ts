import { mergeAttributes, Node } from '@tiptap/core';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import {
  INDEX_CLASS,
  INDEX_NAME_ATTR,
  NODE_NAME_DIV,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_INDEX_TERM
} from '../../common';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexDiv: {
      /**
       * Transform all the `Div` nodes with a `INDEX_CLASS` into an `IndexDiv`.
       */
      fixIndexDivs: () => ReturnType;
      /**
       * Propagate the `INDEX_NAME_ATTR` attribute of an `IndexDiv` to its `IndexTerm` descendants.
       * @param indexPos When specified, work only on the `IndexDiv` at `indexPos`,
       *                 otherwise work on the `IndexDiv` nodes in the selection.
       */
      propagateIndexNameToTerms: (indexPos?: number) => ReturnType;
    };
  }
}

export interface IndexDivOptions {
  HTMLAttributes: Record<string, any>;
}

export const IndexDiv = Node.create<IndexDivOptions>({
  name: NODE_NAME_INDEX_DIV,
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

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      fixIndexDivs: () => ({ dispatch, state, tr }) => {
        const { doc, schema } = state
        const indexDivType = schema.nodes[NODE_NAME_INDEX_DIV]
        if (!indexDivType) return false
        if (dispatch) {
          const positions: number[] = []
          doc.descendants((node, pos) => {
            const classes = node.attrs?.classes || []
            if (node.type.name === NODE_NAME_DIV && classes.indexOf(INDEX_CLASS) >= 0)
              positions.push(pos)
          })
          if (positions.length === 0)
            return false
          positions.sort((p1, p2) => p2 - p1)
          positions.forEach(pos => {
            const node = doc.nodeAt(pos)
            if (node)
              tr.setNodeMarkup(pos, indexDivType, node.attrs)
          })
          dispatch(tr)
        }
        return true
      },
      propagateIndexNameToTerms:
        (indexPos?: number) =>
          ({ dispatch, state, tr }) => {
            let indexNode: ProsemirrorNode | undefined | null = undefined;
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
                if (n.type.name === NODE_NAME_INDEX_TERM) {
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
