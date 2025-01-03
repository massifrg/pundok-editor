import {
  type CommandProps,
  Extension,
  getMarkType,
  getNodeType,
} from '@tiptap/core';
import { isObject, isString } from 'lodash';
import {
  Mark,
  MarkType,
  Node as PmNode,
  NodeRange,
  NodeType,
  ResolvedPos,
  Schema,
  Attrs,
} from '@tiptap/pm/model';
import {
  NodeSelection,
  SelectionBookmark,
  TextSelection,
} from '@tiptap/pm/state';
import {
  Blockquote,
  Div,
  Figure,
  getEditorConfiguration,
  IndexDiv,
  PandocTable,
  TableBody,
  TableFoot,
  TableHead,
} from '..';
import {
  attrsForConversionTo,
  getMarkRangesBetween,
  pandocTableBodies,
  pandocTableSectionRows,
} from '../helpers';
import { Editor } from '@tiptap/vue-3';
import {
  SK_MOVE_NODE_DOWN,
  SK_MOVE_NODE_UP,
  typeNameOfElement,
} from '../../common';

export type TypeOrNode = string | NodeType | PmNode | MarkType;
export const typeOrNodeName: (ton: TypeOrNode) => string = typeNameOfElement;

export interface TransformedNodeOrMark {
  nodeType?: NodeType;
  markType?: MarkType;
  attrs: Record<string, any>;
}

export type UpdateNodeOrMarkCallback = (
  nodeOrMark: PmNode | Mark,
  pos?: number,
) => TransformedNodeOrMark | undefined;

export function nodeTypeOf(
  ton: TypeOrNode,
  schema: Schema,
): NodeType | undefined {
  if (ton instanceof NodeType) return ton;
  else if (ton instanceof PmNode) return ton.type;
  else if (ton instanceof MarkType) return undefined;
  else return schema.nodes[ton];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    helperCommands: {
      /**
       * Attributes update controlled by a callback
       */
      updateNodeAttributesAtPos: (
        typeOrNode: TypeOrNode,
        attrs: Record<string, any>,
        pos: number,
      ) => ReturnType;
      /**
       * Remove all marks from current, non-empty selection
       */
      removeAllMarks: () => ReturnType;
      /**
       * Remove a mark in a range
       */
      removeMark: (
        from: number,
        to: number,
        mark: Mark | MarkType,
      ) => ReturnType;
      /**
       * Add a (Pandoc Attrs's) class to the nodes or marks of typeOrNode in current selection
       */
      addPandocAttrClass: (typeOrNode: TypeOrNode, c: string) => ReturnType;
      /**
       * Remove a (Pandoc Attrs's) class, if present, to the nodes or marks of typeOrNode in current selection
       */
      removePandocAttrClass: (typeOrNode: TypeOrNode, c: string) => ReturnType;
      /**
       * Set a (Pandoc Attrs's) attribute to the nodes or marks of typeOrNode in current selection
       */
      setPandocAttrAttribute: (
        typeOrNode: TypeOrNode,
        name: string,
        value: string,
      ) => ReturnType;
      /**
       * Unset (delete) a (Pandoc Attrs's) attribute from the nodes or marks of typeOrNode in current selection
       */
      unsetPandocAttrAttribute: (
        typeOrNode: TypeOrNode,
        name: string,
      ) => ReturnType;

      /**
       * Delete node at pos. If node is set, checks whether the NodeType matches before deleting
       */
      deleteNodeAtPos: (
        pos: number,
        node?: PmNode | NodeType | string,
      ) => ReturnType;

      /**
       * Convert node at pos into a compatible node
       */
      convertNode: (toNodeType: NodeType | string, pos?: number) => ReturnType;

      /**
       * appendChildToNodeAtPos(pos, node)
       */
      insertChildToNodeAtPos: (
        pos: number,
        child: PmNode,
        index: number,
        attrs?: Attrs,
      ) => ReturnType;

      /**
       * appendChildToNodeAtPos(pos, node)
       */
      appendChildToNodeAtPos: (pos: number, child: PmNode) => ReturnType;

      /**
       * Moves child among its siblings (up, down, start, end)
       */
      moveChild: (
        where: 'up' | 'down' | 'start' | 'end' | 'before' | 'after',
        pos?: number,
      ) => ReturnType;

      /**
       * Lift the contents of a container of blocks (Div, Figure, Blockquote, Index)
       */
      unwrapNodeAtPos: (pos: number) => ReturnType;

      /**
       * Try to reset the selection stored in a bookmark
       * @param bookmark
       */
      setSelectionFromBookmark: (bookmark: SelectionBookmark) => ReturnType;

      /**
       * Selects a range of text.
       * @param from
       * @param to
       * @returns
       */
      setTextSelectionRange: (from: number, to: number) => ReturnType;
    };
  }
}

export function doNothingCommand(props: CommandProps) {
  return false;
}

export function getSchemaTypeNameByName(
  name: string,
  schema: Schema,
): 'node' | 'mark' | null {
  if (schema.nodes[name]) {
    return 'node';
  }

  if (schema.marks[name]) {
    return 'mark';
  }

  return null;
}

export function updateAttributesCommand(
  typeOrNode: TypeOrNode,
  callback: UpdateNodeOrMarkCallback,
) {
  return (props: CommandProps) => {
    const { tr, state, dispatch } = props;

    let nodeType: NodeType | null = null;
    let markType: MarkType | null = null;

    const isNode = !!(typeOrNode as PmNode).type;
    const typeOrName: string | NodeType | MarkType = isNode
      ? (typeOrNode as PmNode).type
      : (typeOrNode as string | NodeType | MarkType);
    const schemaType = getSchemaTypeNameByName(
      typeof typeOrName === 'string' ? typeOrName : typeOrName.name,
      state.schema,
    );

    if (!schemaType) {
      return false;
    }

    if (schemaType === 'node') {
      nodeType = getNodeType(typeOrName as NodeType, state.schema);
    }

    if (schemaType === 'mark') {
      markType = getMarkType(typeOrName as MarkType, state.schema);
    }

    if (dispatch) {
      tr.selection.ranges.forEach((range) => {
        const from = range.$from.pos;
        const to = range.$to.pos;

        state.doc.nodesBetween(from, to, (node, pos) => {
          const doUpdate =
            nodeType && (isNode ? node === typeOrNode : nodeType === node.type);
          if (doUpdate) {
            const transformed = callback(node, pos);
            if (transformed) {
              const { attrs, nodeType } = transformed;
              tr.setNodeMarkup(pos, nodeType, attrs);
            }
          }

          if (markType && node.marks.length) {
            node.marks.forEach((mark) => {
              if (markType === mark.type) {
                const trimmedFrom = Math.max(pos, from);
                const trimmedTo = Math.min(pos + node.nodeSize, to);
                const newAttrs = callback(mark)?.attrs;
                if (newAttrs) {
                  tr.addMark(trimmedFrom, trimmedTo, markType.create(newAttrs));
                } else {
                  return false;
                }
              }
            });
          }
        });
      });
    }

    return true;
  };
}

export const HelperCommandsExtension = Extension.create({
  name: 'helperCommands',

  addKeyboardShortcuts() {
    return {
      [SK_MOVE_NODE_UP]: () => this.editor.commands.moveChild('up'),
      [SK_MOVE_NODE_DOWN]: () => this.editor.commands.moveChild('down'),
    };
  },

  addCommands() {
    return {
      updateNodeAttributesAtPos: (typeOrNode, attrs, pos) => {
        return updateAttributesCommand(typeOrNode, (n, p) => {
          if (pos === p) {
            return { attrs };
          }
        });
      },

      removeAllMarks:
        () =>
        ({ tr, dispatch }) => {
          const { from, to, empty } = tr.selection;
          if (empty) return false;
          const markRanges = getMarkRangesBetween(from, to, tr.doc);
          if (markRanges.length === 0) return false;
          if (dispatch) {
            markRanges.forEach((mr) => {
              tr.removeMark(from, to, mr.mark);
            });
          }
          return true;
        },

      removeMark:
        (from: number, to: number, mark: Mark | MarkType) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            dispatch(tr.removeMark(from, to, mark));
          }
          return true;
        },

      addPandocAttrClass: (typeOrNode, c) => {
        if (c && c.length > 0)
          return updateAttributesCommand(typeOrNode, (n) => {
            const attrs = n.attrs;
            let classes: string[] | null | undefined = attrs.classes;
            if (classes === undefined) return undefined;
            classes = classes || [];
            if (classes.includes(c)) return undefined;
            classes = [...classes, c];
            return { attrs: { ...attrs, classes } };
          });
        return doNothingCommand;
      },

      removePandocAttrClass: (typeOrNode, c) => {
        if (c && c.length > 0)
          return updateAttributesCommand(typeOrNode, (n) => {
            const attrs = n.attrs;
            let classes: string[] | null | undefined = attrs.classes;
            if (classes === undefined) return undefined;
            classes = classes || [];
            if (!classes.includes(c)) return undefined;
            classes = classes.filter((oc) => oc !== c);
            return { attrs: { ...attrs, classes } };
          });
        return doNothingCommand;
      },

      setPandocAttrAttribute: (typeOrNode, name, value) => {
        if (name && value && name.length > 0)
          return updateAttributesCommand(typeOrNode, (n) => {
            const attrs = n.attrs;
            let kv: Record<string, string> | null | undefined = attrs.kv;
            if (kv === undefined) return undefined;
            kv = kv || {};
            kv[name] = value;
            return { attrs: { ...attrs, kv } };
          });
        return doNothingCommand;
      },

      unsetPandocAttrAttribute: (typeOrNode, name) => {
        if (name && name.length > 0)
          return updateAttributesCommand(typeOrNode, (n) => {
            const attrs = n.attrs;
            let kv: Record<string, string> | null | undefined = attrs.kv;
            if (!isObject(kv)) return undefined;
            kv = Object.fromEntries(
              Object.entries(kv).filter(([k, v]) => k !== name),
            );
            return { attrs: { ...attrs, kv } };
          });
        return doNothingCommand;
      },

      deleteNodeAtPos:
        (pos, node) =>
        ({ dispatch, state, tr }) => {
          const doc = tr.doc;
          try {
            if (node) {
              const nodeAtPos = doc.nodeAt(pos);
              let matchingNodeTypeName: string | undefined = undefined;
              if (isString(node)) {
                const nodeType = state.schema.nodes[node as string];
                matchingNodeTypeName = nodeType && nodeType.name;
              } else if (node instanceof NodeType) {
                matchingNodeTypeName = node.name;
              } else if (node instanceof PmNode) {
                matchingNodeTypeName = node.type.name;
              }
              if (
                matchingNodeTypeName &&
                nodeAtPos &&
                matchingNodeTypeName !== nodeAtPos.type.name
              ) {
                return false;
              }
            }
            if (parentCantLiveWithoutNodeAtPos(doc, pos)) return false;
            if (dispatch) {
              tr.setSelection(NodeSelection.create(doc, pos)).deleteSelection();
            }
          } catch (err) {
            console.log(err);
            return false;
          }
          return true;
        },

      convertNode:
        (toNodeType: NodeType | string, nodePos?: number) =>
        ({ dispatch, editor, state, tr }) => {
          let fromNode: PmNode | null, pos: number;
          if (nodePos) {
            fromNode = state.doc.nodeAt(nodePos);
            pos = nodePos;
          } else {
            const $from = state.selection.$from;
            fromNode = $from.node();
            pos = $from.start() - 1;
          }
          if (!fromNode || pos < 0) return false;
          if (dispatch) {
            const nodeType = isString(toNodeType)
              ? state.schema.nodes[toNodeType]
              : toNodeType;
            const config = getEditorConfiguration(editor as Editor);
            const attrs = {
              ...fromNode.attrs,
              ...attrsForConversionTo(fromNode, toNodeType, config),
            };
            try {
              tr.setNodeMarkup(pos, nodeType, attrs, fromNode.marks);
            } catch (err) {
              return false;
            }
            dispatch(tr);
          }
          return true;
        },

      insertChildToNodeAtPos:
        (pos: number, child: PmNode, index: number = 0, attrs?: Attrs) =>
        ({ dispatch, state, tr }) => {
          const doc = state.doc;
          const node = pos < 0 ? doc : doc.nodeAt(pos);
          if (!node || node.isAtom || node.isLeaf) return false;
          if (dispatch) {
            let childPos = pos + 1;
            for (let i = 0; i < Math.min(index, node.childCount); i++) {
              childPos += node.child(i).nodeSize;
            }
            tr.insert(childPos, child);
            if (attrs) tr.setNodeMarkup(childPos, null, attrs);
          }
          return true;
        },

      /**
       * appendChildToNodeAtPos(pos, node)
       */
      appendChildToNodeAtPos:
        (pos: number, child: PmNode) =>
        ({ editor }) =>
          editor.commands.insertChildToNodeAtPos(pos, child, -1),

      moveChild:
        (
          where: 'up' | 'down' | 'start' | 'end' | 'before' | 'after',
          pos?: number,
        ) =>
        ({ dispatch, state, tr }) => {
          const { doc, selection } = state;
          let $pos: ResolvedPos;
          let nodeToMove: PmNode | null = null;
          // let parent: PmNode | null = null
          // let oldIndex = -1
          let newIndex: number | null = -1;
          if (pos) {
            nodeToMove = doc.nodeAt(pos);
            $pos = doc.resolve(nodeToMove ? pos + 1 : pos);
          } else {
            nodeToMove =
              selection instanceof NodeSelection && !selection.node.isInline
                ? selection.node
                : null;
            $pos = nodeToMove
              ? doc.resolve(selection.from + 1)
              : selection.$from;
          }
          let depth = $pos.depth;
          if (depth === 0) return false;
          let parent = $pos.node(depth - 1);
          let oldIndex = $pos!.index(depth - 1);
          let offset = 0;
          if (where === 'up' || where === 'before') offset = -1;
          else if (where === 'down' || where === 'after') offset = 2;
          else if (where === 'start' || where === 'end') offset = 0;
          else return false;

          function canGoUp() {
            if (--depth >= 0) {
              parent = $pos!.node(depth);
              oldIndex = $pos!.index(depth);
              nodeToMove = parent.child(oldIndex);
              newIndex =
                where === 'end'
                  ? parent.childCount
                  : where === 'start'
                    ? 0
                    : oldIndex + offset;
              return true;
            }
            return false;
          }

          if (nodeToMove) {
            // if node is selected, find parent and check if it has at least 2 children
            while (!nodeToMove || oldIndex < 0 || newIndex < 0) {
              if (!canGoUp() || parent.childCount < 2) return false;
            }
          } else {
            // go up and find a parent that has at least two children
            while (
              !nodeToMove ||
              oldIndex < 0 ||
              newIndex < 0 ||
              newIndex > parent.childCount
            ) {
              if (!canGoUp()) return false;
              while (parent.childCount < 2) {
                if (!canGoUp()) return false;
              }
            }
          }
          if (!parent || !nodeToMove || nodeToMove.type.spec.tableRole)
            return false;
          // console.log(
          //   `node is a ${nodeToMove.type.name} and it starts at ${$pos.start(
          //     depth,
          //   )}`,
          // );
          // console.log(`parent is a ${parent.type.name}`);
          newIndex = oldIndex;
          switch (where) {
            case 'up':
            case 'before':
              newIndex--;
              break;
            case 'down':
            case 'after':
              newIndex += 2;
              break;
            case 'start':
              newIndex = 0;
            case 'end':
              newIndex = parent.childCount;
            default:
              return false;
          }
          // console.log(`oldIndex=${oldIndex}, newIndex=${newIndex}`);
          if (newIndex < 0 || newIndex > parent.childCount) return false;
          if (dispatch) {
            let oldPos: number | undefined = undefined;
            let newPos: number | undefined = undefined;
            let curpos = $pos.start(depth);
            for (let i = 0; i < parent.childCount; i++) {
              if (i === oldIndex) oldPos = curpos;
              if (i === newIndex) newPos = curpos;
              curpos += parent.child(i).nodeSize;
            }
            if (newIndex === parent.childCount) newPos = curpos;
            if (!oldPos || !newPos) return false;
            const isEmptyTextSelection =
              selection.empty && selection instanceof TextSelection;
            const cursorOffset =
              (isEmptyTextSelection && selection.from - oldPos) || 1;
            // console.log(
            //   `oldPos=${oldPos}, newPos=${newPos}, cursorOffset=${cursorOffset}`,
            // );
            if (oldPos > newPos) {
              tr.delete(oldPos, oldPos + nodeToMove.nodeSize)
                .insert(newPos, nodeToMove)
                .setSelection(
                  TextSelection.create(tr.doc, newPos + cursorOffset),
                );
            } else {
              tr.insert(newPos, nodeToMove)
                .delete(oldPos, oldPos + nodeToMove.nodeSize)
                .setSelection(
                  TextSelection.create(
                    tr.doc,
                    newPos - nodeToMove.nodeSize + cursorOffset,
                  ),
                );
            }
            dispatch(tr);
          }
          return true;
        },

      unwrapNodeAtPos:
        (pos: number) =>
        ({ dispatch, state, tr }) => {
          const doc: PmNode = state.doc;
          const container = doc.nodeAt(pos);
          if (!container) return false;
          const name = container.type.name;
          if (
            name === Div.name ||
            name === Figure.name ||
            name === Blockquote.name ||
            name === IndexDiv.name
          ) {
            const targetDepth = doc.resolve(pos).depth;
            const nodeRange = new NodeRange(
              doc.resolve(pos + 1),
              doc.resolve(pos + container.content.size),
              targetDepth + 1,
            );
            if (dispatch) {
              dispatch(tr.lift(nodeRange, targetDepth));
            }
            return true;
          }
          return false;
        },

      setSelectionFromBookmark:
        (bookmark: SelectionBookmark) =>
        ({ dispatch, state, tr }) => {
          if (!bookmark) return false;
          if (dispatch) {
            dispatch(tr.setSelection(bookmark.resolve(state.doc)));
          }
          return true;
        },

      setTextSelectionRange:
        (from: number, to: number) =>
        ({ dispatch, state, tr }) => {
          if (!from || !to || from > to || from < 0 || to < 0) return false;
          const doc = state.doc;
          if (to > doc.content.size) return false;
          if (dispatch)
            dispatch(
              tr.setSelection(
                new TextSelection(doc.resolve(from), doc.resolve(to)),
              ),
            );
          return true;
        },
    };
  },
});

function parentCantLiveWithoutNodeAtPos(doc: PmNode, pos: number) {
  const nodeAtPos = doc.nodeAt(pos);
  if (nodeAtPos) {
    const rpos = doc.resolve(pos);
    const parent = rpos.parent;
    if (parent) {
      const parentTypeName = parent.type.name;
      switch (parentTypeName) {
        case PandocTable.name:
          return (
            nodeAtPos.type.name == TableBody.name &&
            pandocTableBodies(parent).length <= 1
          );
        case TableBody.name:
        case TableHead.name:
        case TableFoot.name:
          return pandocTableSectionRows(parent).length <= 1;
        default:
          return false;
      }
    }
  }
  return false;
}
