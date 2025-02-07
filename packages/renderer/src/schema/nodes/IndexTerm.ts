import { mergeAttributes, Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import {
  DEFAULT_INDEX_NAME,
  INDEX_NAME_ATTR,
  INDEX_TERM_CLASS,
  NODE_NAME_DIV,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_INDEX_TERM,
} from '../../common';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexTerm: {
      /**
       * Transform all the `Div` nodes with a `INDEX_TERM_CLASS` into an `IndexTerm`.
       */
      fixIndexTerms: () => ReturnType;
      /**
       * Transform an ordinary `Div` node (at `selection.from`) into an `IndexTerm`.
       */
      convertDivToIndexTerm: () => ReturnType;
      /**
       * Transform an `IndexTerm` (at `selection.from`) into an ordinary `Div` node.
       */
      convertIndexTermToDiv: () => ReturnType;
    };
  }
}

export interface IndexTermOptions {
  HTMLAttributes: Record<string, any>;
}

export const IndexTerm = Node.create<IndexTermOptions>({
  name: NODE_NAME_INDEX_TERM,
  content: 'block* indexTerm*',
  group: 'block',
  isolating: true,

  // defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: INDEX_TERM_CLASS,
      },
    };
  },

  // addAttributes() {
  //   return {
  //     // the name of the index this term belongs to, i.e. "index", "names", "topics"
  //     indexName: {
  //       default: DEFAULT_INDEX_NAME,
  //       parseHTML: (element) => element.getAttribute('data-index-name'),
  //       renderHTML: (attributes) => ({
  //         'data-index-name': attributes.indexName,
  //       }),
  //     },
  //     // the term unique identifier
  //     id: {
  //       default: null,
  //       parseHTML: (element) => element.getAttribute('id'),
  //       renderHTML: (attributes) => ({ id: attributes.id }),
  //     },
  //     // a string according to which this term is sorted in the index
  //     sortKey: {
  //       default: null,
  //       parseHTML: (element) => element.getAttribute('data-sort-key'),
  //       renderHTML: (attributes) => ({ 'data-sort-key': attributes.sortKey }),
  //     },
  //   };
  // },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      fixIndexTerms: () => ({ dispatch, state, tr }) => {
        const { doc, schema } = state
        const indexTermType = schema.nodes[NODE_NAME_INDEX_TERM]
        if (!indexTermType) return false
        if (dispatch) {
          const positions: number[] = []
          doc.descendants((node, pos, parent) => {
            const isParentIndex = parent?.type.name === NODE_NAME_INDEX_DIV
            const isParentTerm = parent?.type.name === NODE_NAME_INDEX_TERM
            const classes = node.attrs?.classes || []
            const mustBeTerm = node.type.name === NODE_NAME_DIV && classes.indexOf(INDEX_TERM_CLASS) >= 0
            if ((isParentIndex || isParentTerm) && mustBeTerm)
              positions.push(pos)
          })
          if (positions.length === 0)
            return false
          positions.sort((p1, p2) => p2 - p1)
          positions.forEach(pos => {
            const node = doc.nodeAt(pos)
            if (node) {
              const classes = node.attrs?.classes || []
              if (classes.indexOf(INDEX_TERM_CLASS) < 0) classes.push(INDEX_TERM_CLASS)
              tr.setNodeMarkup(pos, indexTermType, { ...node.attrs, classes })
            }
          })
          dispatch(tr)
        }
        return true
      },
      convertDivToIndexTerm:
        () =>
          ({ state, tr, dispatch }) => {
            const { doc, schema, selection } = state;
            if (selection instanceof NodeSelection) {
              const maybeDiv = doc.nodeAt(selection.from);
              if (maybeDiv && maybeDiv.type.name === NODE_NAME_DIV) {
                if (dispatch) {
                  let { id, kv } = maybeDiv.attrs;
                  kv = kv || {};
                  const indexTerm = schema.nodes[NODE_NAME_INDEX_TERM].createAndFill(
                    {
                      id,
                      indexName: kv[INDEX_NAME_ATTR] || DEFAULT_INDEX_NAME,
                      sortKey: kv['sort-key'],
                    },
                    maybeDiv.content
                  );
                  if (indexTerm) selection.replaceWith(tr, indexTerm);
                  else return false;
                  return true;
                }
              }
            }
            return false;
          },
      convertIndexTermToDiv:
        () =>
          ({ state, tr, dispatch }) => {
            const { doc, schema, selection } = state;
            if (selection instanceof NodeSelection) {
              const maybeIndexTerm = doc.nodeAt(selection.from);
              if (maybeIndexTerm && maybeIndexTerm.type.name === IndexTerm.name) {
                if (dispatch) {
                  let { id, indexName, sortKey } = maybeIndexTerm.attrs;
                  const div = schema.nodes[NODE_NAME_DIV].createAndFill(
                    {
                      id,
                      classes: [],
                      kv: {
                        [INDEX_NAME_ATTR]: indexName,
                        ['sort-key']: sortKey,
                      },
                    },
                    maybeIndexTerm.content
                  );
                  if (div) selection.replaceWith(tr, div);
                  else return false;
                  return true;
                }
              }
            }
            return false;
          },
    };
  },
});
