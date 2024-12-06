import { mergeAttributes, Node } from '@tiptap/core';
import {
  DEFAULT_INDEX_NAME,
  INDEX_NAME_ATTR,
  INDEX_TERM_CLASS,
} from '../../common';
import { NodeSelection } from '@tiptap/pm/state';
import { Div } from './Div';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexTerm: {
      convertDivToIndexTerm: () => ReturnType;
      convertIndexTermToDiv: () => ReturnType;
    };
  }
}

export interface IndexTermOptions {
  HTMLAttributes: Record<string, any>;
}

export const IndexTerm = Node.create<IndexTermOptions>({
  name: 'indexTerm',
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
      convertDivToIndexTerm:
        () =>
        ({ state, tr, dispatch }) => {
          const { doc, schema, selection } = state;
          if (selection instanceof NodeSelection) {
            const maybeDiv = doc.nodeAt(selection.from);
            if (maybeDiv && maybeDiv.type.name === Div.name) {
              if (dispatch) {
                let { id, kv } = maybeDiv.attrs;
                kv = kv || {};
                const indexTerm = schema.nodes.indexTerm.createAndFill(
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
                const div = schema.nodes.div.createAndFill(
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
