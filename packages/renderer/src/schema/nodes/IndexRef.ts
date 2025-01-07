import { mergeAttributes, Node } from '@tiptap/core';
import { Node as PmNode } from '@tiptap/pm/model';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Component } from 'vue';
import { IndexRefView } from '../../components';
import {
  DEFAULT_INDEX_NAME,
  DEFAULT_INDEX_REF_CLASS,
  INDEX_NAME_ATTR,
  INDEX_RANGE_ATTR,
  INDEXED_TEXT_ATTR,
  NODE_NAME_INDEX_REF,
} from '../../common';

export const INDEX_RANGE_START_CLASS = 'index-start';
export const INDEX_RANGE_STOP_CLASS = 'index-stop';
export const INDEX_RANGE_NONE = 'NONE';
export const INDEX_RANGE_START = 'START';
export const INDEX_RANGE_STOP = 'STOP';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexRef: {
      propagateIdref: (
        refNode: PmNode,
        propagate: (refNode: PmNode, node: PmNode) => boolean,
      ) => ReturnType;
    };
  }
}

export interface IndexRefOptions {
  HTMLAttributes: Record<string, any>;
  placeholder: (indexName: string) => string;
}

export const IndexRef = Node.create<IndexRefOptions>({
  name: NODE_NAME_INDEX_REF,
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,
  marks: '_',

  addOptions() {
    return {
      HTMLAttributes: {
        class: DEFAULT_INDEX_REF_CLASS,
      },
      placeholder: (spanType: string) => '@',
    };
  },

  // addAttributes() {
  //   return {
  //     indexName: {
  //       default: DEFAULT_INDEX_NAME,
  //       parseHTML: (element) => element.getAttribute('data-index-name'),
  //       renderHTML: (attributes) => ({
  //         'data-index-name': attributes.indexName,
  //       }),
  //     },
  //     idref: {
  //       default: null,
  //       parseHTML: (element) => element.getAttribute('idref'),
  //       renderHTML: ({ idref }) => (idref ? { idref } : {}),
  //     },
  //     indexRange: {
  //       default: INDEX_RANGE_NONE,
  //       parseHTML(element: HTMLElement) {
  //         const cl = element.classList;
  //         const isStart = cl.contains(INDEX_RANGE_START_CLASS);
  //         const isStop = cl.contains(INDEX_RANGE_STOP_CLASS);
  //         return isStart === isStop
  //           ? INDEX_RANGE_NONE
  //           : isStart
  //           ? INDEX_RANGE_START
  //           : INDEX_RANGE_STOP;
  //       },
  //       renderHTML: ({ indexRange }) =>
  //         !indexRange || indexRange === INDEX_RANGE_NONE
  //           ? {}
  //           : {
  //               class:
  //                 indexRange === INDEX_RANGE_START
  //                   ? INDEX_RANGE_START_CLASS
  //                   : INDEX_RANGE_STOP_CLASS,
  //             },
  //     },
  //     indexedText: {
  //       default: null,
  //     },
  //   };
  // },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (e) => ((e as HTMLElement).hasChildNodes() ? false : null),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { classes, kv } = node.attrs;
    const htmlClasses = [...classes];
    const attributes: Record<string, any> = {
      [`data-${INDEX_NAME_ATTR}`]: kv[INDEX_NAME_ATTR] || DEFAULT_INDEX_NAME,
    };
    if (kv.idref) attributes.idref = kv.idref;
    const indexRange = kv[INDEX_RANGE_ATTR];
    if (indexRange === INDEX_RANGE_START)
      htmlClasses.push(INDEX_RANGE_START_CLASS);
    if (indexRange === INDEX_RANGE_STOP)
      htmlClasses.push(INDEX_RANGE_STOP_CLASS);
    if (classes) attributes.class = htmlClasses.join(' ');
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, attributes),
      this.options.placeholder(node.attrs.indexName),
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(IndexRefView as Component);
  },

  addCommands() {
    return {
      propagateIdref:
        (
          refNode: PmNode,
          propagate: (
            refNode: PmNode,
            node: PmNode,
          ) => boolean = defaultPropagate,
        ) =>
          ({ dispatch, state, tr }) => {
            if (refNode.type.name !== NODE_NAME_INDEX_REF) return false;
            const idref = refNode.attrs.kv.idref;
            if (!idref) return false;
            if (dispatch) {
              state.doc.descendants((node, pos) => {
                if (refNode !== node && node.type.name === NODE_NAME_INDEX_REF) {
                  if (propagate(refNode, node)) {
                    const newAttrs = {
                      ...node.attrs,
                      kv: { ...node.attrs.kv, idref },
                    };
                    tr.setNodeMarkup(pos, null, newAttrs);
                  }
                }
                return true;
              });
              dispatch(tr);
            }
            return true;
          },
    };
  },
});

function defaultPropagate(refNode: PmNode, node: PmNode): boolean {
  const refkv = refNode.attrs.kv || {};
  const indexName = refkv[INDEX_NAME_ATTR];
  const indexedText = refkv[INDEXED_TEXT_ATTR];
  const kv = node.attrs.kv || {};
  return (
    node.type.name === NODE_NAME_INDEX_REF &&
    indexName &&
    kv[INDEXED_TEXT_ATTR] === indexedText
  );
}
