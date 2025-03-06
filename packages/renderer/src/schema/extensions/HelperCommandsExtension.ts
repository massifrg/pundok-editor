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
  Node as ProsemirrorNode,
  NodeType,
  ResolvedPos,
  Schema,
  Attrs,
  Fragment,
} from '@tiptap/pm/model';
import {
  NodeSelection,
  SelectionBookmark,
  TextSelection,
} from '@tiptap/pm/state';
import { getEditorConfiguration } from '..';
import {
  attrsForConversionTo,
  getMarkRangesBetween,
  pandocTableBodies,
  pandocTableSectionRows,
} from '../helpers';
import { Editor } from '@tiptap/vue-3';
import {
  NODE_NAME_BLOCKQUOTE,
  NODE_NAME_CAPTION,
  NODE_NAME_DEFINITION_TERM,
  NODE_NAME_DIV,
  NODE_NAME_FIGURE,
  NODE_NAME_FIGURE_CAPTION,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_INDEX_TERM,
  NODE_NAME_PANDOC_TABLE,
  NODE_NAME_SHORT_CAPTION,
  NODE_NAME_TABLE_BODY,
  NODE_NAME_TABLE_FOOT,
  NODE_NAME_TABLE_HEAD,
  SK_MOVE_NODE_DOWN,
  SK_MOVE_NODE_DOWN_INSIDE,
  SK_MOVE_NODE_UP,
  SK_MOVE_NODE_UP_INSIDE,
  typeNameOfElement,
} from '../../common';

export type TypeOrNode = string | NodeType | ProsemirrorNode | MarkType;
export const typeOrNodeName: (ton: TypeOrNode) => string = typeNameOfElement;

export interface TransformedNodeOrMark {
  nodeType?: NodeType;
  markType?: MarkType;
  attrs: Record<string, any>;
}

export type UpdateNodeOrMarkCallback = (
  nodeOrMark: ProsemirrorNode | Mark,
  pos?: number,
) => TransformedNodeOrMark | undefined;

export function nodeTypeOf(
  ton: TypeOrNode,
  schema: Schema,
): NodeType | undefined {
  if (ton instanceof NodeType) return ton;
  else if (ton instanceof ProsemirrorNode) return ton.type;
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
        node?: ProsemirrorNode | NodeType | string,
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
        child: ProsemirrorNode,
        index: number,
        attrs?: Attrs,
      ) => ReturnType;

      /**
       * appendChildToNodeAtPos(pos, node)
       */
      appendChildToNodeAtPos: (pos: number, child: ProsemirrorNode) => ReturnType;

      /**
       * Moves child among its siblings (up, down, start, end)
       */
      moveChild: (
        where: 'up' | 'down' | 'start' | 'end' | 'before' | 'after' | 'up-inside' | 'down-inside',
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

      /**
       * Set the content of the selected Node (at pos?) with a single text node whose content is passed as first argument.
       * @param content 
       * @param pos 
       * @returns 
       */
      setTextContent: (content: string, pos?: number) => ReturnType;

      /**
       * Select the previous node of the same kind.
       * @param n the node or node type to find
       */
      selectPrev: (n?: ProsemirrorNode | NodeType) => ReturnType;

      /**
       * Select the next node of the same kind.
       * @param n the node or node type to find
       */
      selectNext: (n?: ProsemirrorNode | NodeType) => ReturnType;

      /**
       * A better implementation of scrollIntoView().
       * @param pos
       * @returns 
       */
      scrollPosToCenterIfNotVisible: (pos: number) => ReturnType;
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

    const isNode = !!(typeOrNode as ProsemirrorNode).type;
    const typeOrName: string | NodeType | MarkType = isNode
      ? (typeOrNode as ProsemirrorNode).type
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
      [SK_MOVE_NODE_UP_INSIDE]: () => this.editor.commands.moveChild('up-inside'),
      [SK_MOVE_NODE_DOWN_INSIDE]: () => this.editor.commands.moveChild('down-inside'),
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
                } else if (node instanceof ProsemirrorNode) {
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
            let fromNode: ProsemirrorNode | null, pos: number;
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
        (pos: number, child: ProsemirrorNode, index: number = 0, attrs?: Attrs) =>
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
        (pos: number, child: ProsemirrorNode) =>
          ({ editor }) =>
            editor.commands.insertChildToNodeAtPos(pos, child, -1),

      moveChild:
        (
          where: 'up' | 'down' | 'start' | 'end' | 'before' | 'after' | 'up-inside' | 'down-inside',
          pos?: number,
        ) => where === 'up-inside' || where === 'down-inside'
            ? moveChildInside(where, pos)
            : moveChild(where, pos),

      unwrapNodeAtPos:
        (pos: number) =>
          ({ dispatch, state, tr }) => {
            const doc: ProsemirrorNode = state.doc;
            const container = doc.nodeAt(pos);
            if (!container) return false;
            const name = container.type.name;
            if (
              name === NODE_NAME_DIV ||
              name === NODE_NAME_FIGURE ||
              name === NODE_NAME_BLOCKQUOTE ||
              name === NODE_NAME_INDEX_DIV
            ) {
              // const targetDepth = doc.resolve(pos).depth;
              let content = container.content
              if (name === NODE_NAME_FIGURE && container.childCount > 0) {
                const maybeCaption = container.child(0)
                if (maybeCaption.type.name === NODE_NAME_FIGURE_CAPTION)
                  content = container.slice(maybeCaption.nodeSize, content.size).content
              }
              if (dispatch) {
                dispatch(tr.delete(pos, pos + container.nodeSize).insert(pos, content))
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

      setTextContent: (content: string, pos?: number) => ({ dispatch, state, tr }) => {
        if (!content || content.length === 0)
          return false
        const { doc, selection } = state
        if (!pos && !(selection instanceof NodeSelection))
          return false
        const node = pos
          ? doc.nodeAt(pos)
          : (selection as NodeSelection).node
        if (!node || !node.inlineContent)
          return false
        if (dispatch) {
          const text = state.schema.text(content)
          const newNode = node.type.createChecked(node.attrs, Fragment.from(text))
          if (pos)
            dispatch(
              tr.setSelection(new NodeSelection(doc.resolve(pos)))
                .replaceSelectionWith(newNode, true)
            )
          else
            dispatch(
              tr.replaceSelectionWith(newNode, true)
            )
        }
        return true
      },

      selectPrev: (n?: ProsemirrorNode | NodeType) => ({ dispatch, state, tr, view }) => {
        const { doc, selection } = state
        const { from, $head } = selection
        let searchedType: NodeType
        let last = from
        if (n) {
          if (n instanceof NodeType)
            searchedType = n
          else if (n instanceof Node)
            searchedType = n.type
        } else if (selection instanceof NodeSelection) {
          searchedType = selection.node.type
        } else {
          searchedType = $head.node().type
        }
        // console.log(`searching for previous ${searchedType!.name}`)
        let prevNodePos: number | undefined = undefined;
        doc.nodesBetween(0, last >= 0 ? last : 0, (node, pos) => {
          if (node.type === searchedType)
            prevNodePos = prevNodePos ? (pos > prevNodePos && pos < last ? pos : prevNodePos) : pos
          return true
        })
        if (prevNodePos && dispatch) {
          tr.setSelection(new NodeSelection(doc.resolve(prevNodePos)))
          const dom = view.nodeDOM(prevNodePos) as HTMLElement | null
          if (dom && !isElementInViewport(dom)) {
            // tr.scrollIntoView()
            dom.scrollIntoView({
              behavior: 'smooth', // Smooth scrolling
              block: 'center',    // Vertical alignment: 'start', 'center', or 'end'
              // inline: 'center'    // Horizontal alignment (optional)
            });
          }
        }
        return !!prevNodePos
      },

      selectNext: (n?: ProsemirrorNode | NodeType) => ({ dispatch, state, tr, view }) => {
        const { doc, selection } = state
        const { to, $head } = selection
        let searchedType: NodeType
        let first = to
        if (n) {
          if (n instanceof NodeType)
            searchedType = n
          else if (n instanceof Node)
            searchedType = n.type
        } else if (selection instanceof NodeSelection) {
          searchedType = selection.node.type
        } else {
          searchedType = $head.node().type
        }
        // console.log(`searching for next ${searchedType!.name}`)
        let nextNodePos: number | undefined = undefined;
        doc.nodesBetween(first, doc.content.size, (node, pos) => {
          if (node.type === searchedType)
            nextNodePos = nextNodePos ? (pos < nextNodePos && pos > first ? pos : nextNodePos) : pos
          return true
        })
        if (nextNodePos && dispatch) {
          tr.setSelection(new NodeSelection(doc.resolve(nextNodePos)))
          const dom = view.nodeDOM(nextNodePos) as HTMLElement | null
          if (dom && !isElementInViewport(dom)) {
            // tr.scrollIntoView()
            dom.scrollIntoView({
              behavior: 'smooth', // Smooth scrolling
              block: 'center',    // Vertical alignment: 'start', 'center', or 'end'
              // inline: 'center'    // Horizontal alignment (optional)
            });
          }
        }
        return !!nextNodePos
      },

      scrollPosToCenterIfNotVisible: (pos: number) => ({ dispatch, state, view }) => {
        let dom = view.nodeDOM(pos) as HTMLElement | null
        if (!dom || !(dom instanceof HTMLElement)) {
          const $pos = state.doc.resolve(pos)
          let p = $pos.start()
          if (!$pos.node().isText) p--
          // console.log(`node: ${$pos.node().type.name} at ${p}`)
          dom = view.nodeDOM(p) as HTMLElement | null
        }
        if (dom && (dom instanceof HTMLElement)) {
          if (dispatch && !isElementInViewport(dom)) {
            dom.scrollIntoView({
              behavior: 'smooth',
              block: 'center',    // Vertical alignment: 'start', 'center', or 'end'
              // inline: 'center'    // Horizontal alignment (optional)
            });
          }
          return true
        }
        return false
      }
    };
  },
});

function isElementInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

function parentCantLiveWithoutNodeAtPos(doc: ProsemirrorNode, pos: number) {
  const nodeAtPos = doc.nodeAt(pos);
  if (nodeAtPos) {
    const rpos = doc.resolve(pos);
    const parent = rpos.parent;
    if (parent) {
      const parentTypeName = parent.type.name;
      switch (parentTypeName) {
        case NODE_NAME_PANDOC_TABLE:
          return (
            nodeAtPos.type.name == NODE_NAME_TABLE_BODY &&
            pandocTableBodies(parent).length <= 1
          );
        case NODE_NAME_TABLE_BODY:
        case NODE_NAME_TABLE_HEAD:
        case NODE_NAME_TABLE_FOOT:
          return pandocTableSectionRows(parent).length <= 1;
        default:
          return false;
      }
    }
  }
  return false;
}

function moveChild(where: 'up' | 'down' | 'start' | 'end' | 'before' | 'after', pos?: number): ((cp: CommandProps) => boolean) {
  return ({ dispatch, state, tr }) => {
    const { doc, selection } = state;
    let $pos: ResolvedPos;
    let nodeToMove: ProsemirrorNode | null = null;
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
      return false
    const nodeType = nodeToMove.type.name
    if (nodeType === NODE_NAME_CAPTION
      || nodeType === NODE_NAME_SHORT_CAPTION
      || nodeType === NODE_NAME_FIGURE_CAPTION
      || nodeType === NODE_NAME_DEFINITION_TERM)
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
  }
}

function moveChildInside(where: 'up-inside' | 'down-inside', pos?: number): ((cp: CommandProps) => boolean) {
  return ({ dispatch, state, tr }) => {
    let nodeToMove: ProsemirrorNode | null = null
    const movingUp = where === 'up-inside'
    const { doc, selection } = state
    const $pos = pos ? doc.resolve(pos + 1) : selection.$anchor
    let depth = $pos.depth
    let acceptorIndex: number
    let acceptor: ProsemirrorNode | null = null
    let parent: ProsemirrorNode
    const indexOffset = movingUp ? -1 : 1
    while (depth > 0) {
      nodeToMove = $pos.node(depth)
      parent = $pos.node(depth - 1)
      acceptorIndex = $pos.index(depth - 1) + indexOffset
      // console.log(`depth=${depth}, possible node ${nodeToMove!.type.name}, index=${$pos.index(depth - 1)}, acceptorIndex=${acceptorIndex}, parent is ${parent.type.name}`)
      if (acceptorIndex >= 0 && acceptorIndex < parent.childCount) {
        acceptor = parent.child(acceptorIndex)
        // console.log(`acceptor is a ${acceptor.type.name}`)
        if (canMoveInside(nodeToMove, acceptor))
          break
      }
      depth--
    }
    if (!acceptor || !nodeToMove) return false
    // console.log(`depth=${depth}, moving a ${nodeToMove!.type.name} into a ${acceptor!.type.name}`)
    const oldPos = $pos.start(depth) - 1
    let newPos = $pos.start(depth - 1) // parent start
    for (let i = 0; i < acceptorIndex!; i++)
      newPos += parent!.child(i).nodeSize
    newPos += movingUp ? acceptor!.content.size + 1 : 1

    // console.log(`moving a ${nodeToMove!.type.name}@${oldPos} into a ${acceptor!.type.name}@${newPos}`)
    if (depth <= 0) return false
    if (dispatch) {
      const isEmptyTextSelection =
        selection.empty && selection instanceof TextSelection;
      const cursorOffset =
        (isEmptyTextSelection && selection.from - oldPos) || 1;
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
    return true
  }
}

function canMoveInside(moving: ProsemirrorNode, acceptor: ProsemirrorNode) {
  const movName = moving.type.name
  const accName = acceptor.type.name
  return accName === NODE_NAME_DIV
    || accName === NODE_NAME_FIGURE
    || accName === NODE_NAME_BLOCKQUOTE
    || (accName === NODE_NAME_INDEX_TERM && movName === NODE_NAME_INDEX_TERM)
}