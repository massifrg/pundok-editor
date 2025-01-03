import { Extension } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { EditorState, Transaction } from '@tiptap/pm/state';
import {
  DEFAULT_INDEX_NAME,
  INDEX_CLASS,
  INDEX_NAME_ATTR,
  INDEX_TERM_CLASS,
  PundokEditorConfig,
} from '../../common';

interface ProsemirrorPandocFixerOptions {
  state: EditorState;
  tr?: Transaction;
  node: Node;
  pos: number;
  config?: Partial<PundokEditorConfig>;
}

type ProsemirrorPandocFixer = (
  options: ProsemirrorPandocFixerOptions
) => Transaction;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fixDocStructure: {
      fixNodeAtPos: (
        pos: number,
        config?: Partial<PundokEditorConfig>
      ) => ReturnType;
    };
  }
}

export const FixDocStructureExtension = Extension.create({
  name: 'fixDocStructure',

  addCommands() {
    return {
      fixNodeAtPos:
        (pos, config) =>
          ({ dispatch, state, tr }) => {
            const node = state.doc.nodeAt(pos);
            if (node) {
              let transaction = nodeFromAttrsFixer(config)({
                node,
                pos,
                state,
                tr,
              });
              if (dispatch) dispatch(transaction);
              return true;
            }
            return false;
          },
    };
  },
});

// const indexRefFixer: ProsemirrorPandocFixer = ({ state, tr, node, pos }) => {
//   const transaction = tr || state.tr
//   if (node.type.name === 'indexRef')
//   return transaction.replaceRangeWith(pos, pos + node.nodeSize, transformedNode)
// }

// TODO: externalize names' constants
const NODE_NAME_DIV = 'div'
const NODE_NAME_INDEX_DIV = 'indexDiv'
const NODE_NAME_INDEX_TERM = 'indexTerm'

// const divEncodedNodeNames = [Div.name, IndexDiv.name, IndexTerm.name];
const divEncodedNodeNames = [NODE_NAME_DIV, NODE_NAME_INDEX_DIV, NODE_NAME_INDEX_TERM];

const divEncodedNodesFixer: ProsemirrorPandocFixer = ({
  state,
  tr,
  node,
  pos,
  config,
}) => {
  let transaction = tr || state.tr;
  let newTypeName = node.type.name;
  let attrs = node.attrs;
  if (divEncodedNodeNames.includes(newTypeName)) {
    let { classes, kv } = attrs || {};
    if (classes.includes(INDEX_CLASS)) {
      newTypeName = NODE_NAME_DIV;
      let indexName = kv[INDEX_NAME_ATTR];
      if (!indexName)
        indexName =
          (config?.indices && config.indices[0].indexName) ||
          DEFAULT_INDEX_NAME;
      if (indexName) kv[INDEX_NAME_ATTR] = indexName;
      classes = (classes as string[]).filter((c) => c !== INDEX_TERM_CLASS);
      attrs = { ...node.attrs, classes, kv };
    } else if (classes.includes(INDEX_TERM_CLASS)) {
      newTypeName = NODE_NAME_INDEX_TERM;
    } else {
      newTypeName = NODE_NAME_DIV;
    }
  }
  if (newTypeName !== node.type.name) {
    // console.log(`${node.type.name} => ${newTypeName}`)
    const newNode = state.schema.nodes[newTypeName].createAndFill(
      attrs,
      node.content
    );
    if (newNode) {
      transaction = transaction.replaceRangeWith(
        pos,
        pos + node.nodeSize,
        newNode
      );
    }
  }
  return transaction;
};

const DEFAULT_FIXERS: Record<string, ProsemirrorPandocFixer> = {
  [NODE_NAME_DIV]: divEncodedNodesFixer,
  [NODE_NAME_INDEX_DIV]: divEncodedNodesFixer,
  [NODE_NAME_INDEX_TERM]: divEncodedNodesFixer,
};

export function nodeFromAttrsFixer(
  config?: Partial<PundokEditorConfig>,
  fixers: Record<string, ProsemirrorPandocFixer> = DEFAULT_FIXERS
): ProsemirrorPandocFixer {
  // const indicesNames = config.indices?.map(i => i.indexName) || []
  return (options) => {
    const { state, tr, node } = options;
    let transaction = tr || state.tr;
    const fixer = fixers[node.type.name];
    if (fixer) {
      transaction = fixer(options);
    }
    return transaction;
  };
}
