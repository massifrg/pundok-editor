import { getMarksBetween } from '@tiptap/vue-3';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorView } from '@tiptap/pm/view';
import { NodeSelection, Plugin } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import {
  ACTION_SET_ALTERNATIVE,
  setActionCommand,
  setActionEditAttributes
} from '../../actions';
import {
  EditAttributesActionProps,
  EditorKeyType,
  NODE_NAME_IMAGE,
  NODE_NAME_INDEX_REF,
  NODE_NAME_INDEX_TERM,
  NODE_NAME_PARAGRAPH,
  NODE_NAME_RAW_BLOCK,
  NODE_NAME_RAW_INLINE,
  SetAlternativeActionProps,
  SK_EDIT_ATTRIBUTES,
  SK_SET_ALTERNATIVE_0,
  SK_SET_ALTERNATIVE_1,
  SK_SET_ALTERNATIVE_2,
  SK_SET_ALTERNATIVE_3,
  SK_SET_ALTERNATIVE_4,
  SK_SET_ALTERNATIVE_5,
  SK_SET_ALTERNATIVE_6,
  SK_SET_ALTERNATIVE_7,
  SK_SET_ALTERNATIVE_8,
  SK_SET_ALTERNATIVE_9
} from '../../common';
import {
  DocState,
  DocStateUpdate,
  editableAttrsForNodeOrMark,
  editorKeyFromState,
  innerNodeDepth,
  META_UPDATE_DOC_STATE,
  SelectedNodeOrMark,
  updateDocState
} from '../helpers';
import { pundokEditorUtilsPluginKey } from './PundokEditorUtilsPluginKey';
import Paragraph from '@tiptap/extension-paragraph';
import { DefinitionTerm, Heading, Line, Metadata, Plain, ShortCaption } from '../nodes';
import { nudgeNumericValue, nudgeNumericValueAtIndex } from '../helpers/nudgeNumericValue';

let keyCounter = 1;

export function newEditorKey(): EditorKeyType {
  return keyCounter++;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pundokEditorUtils: {
      updateDocState: (update: Partial<DocStateUpdate>) => ReturnType;
      editAttributes: (props?: EditAttributesActionProps) => ReturnType;
      gotoDocLine: (i: number) => ReturnType;
      nudgeNumericValue: (
        sign: 1 | -1,
        x?: number,
        y?: number,
      ) => ReturnType;
    };
  }
}

export interface PundokEditorUtilsOptions { }

export const PundokEditorUtilsExtension =
  Extension.create<PundokEditorUtilsOptions>({
    name: 'pundokEditorUtils',

    addOptions() {
      return {};
    },

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: pundokEditorUtilsPluginKey,
          state: {
            // init(config, instance): DocumentState {
            //   return new DocumentState(newEditorKey());
            // },
            // apply(tr, value, oldState, newState): DocumentState {
            //   return value;
            // },
            init(config, instance): DocState {
              return {
                editorKey: newEditorKey(),
              };
            },
            apply(tr, currentDocState, oldState, newState): DocState {
              // console.log(currentDocState);
              let updatedDocState = currentDocState;
              const updates: Partial<DocStateUpdate> = tr.getMeta(
                META_UPDATE_DOC_STATE,
              );
              if (updates)
                updatedDocState = updateDocState(currentDocState, updates);
              const alreadyFullyUnsaved =
                updatedDocState.nativeUnsavedChanges &&
                updatedDocState.unsavedChanges;
              if (tr.docChanged && !alreadyFullyUnsaved) {
                updatedDocState = updateDocState(updatedDocState, {
                  nativeUnsavedChanges: true,
                  unsavedChanges: true,
                });
              }
              // notify current update even if it has unset the callback field
              if (currentDocState.callback)
                currentDocState.callback(updatedDocState);
              return updatedDocState;
            },
          },
          props: {
            handleDoubleClickOn(
              view: EditorView,
              pos: number,
              node: ProsemirrorNode,
              nodePos: number,
              event: MouseEvent,
              direct: boolean,
            ) {
              // console.log(`pos=${pos}, nodePos=${nodePos}`);
              const editorKey = editorKeyFromState(view.state);
              if (!editorKey) return false;
              switch (node.type.name) {
                case NODE_NAME_RAW_INLINE:
                  setActionEditAttributes(
                    editorKey,
                    {
                      from: pos,
                      to: pos,
                      pos: nodePos,
                      node,
                      name: NODE_NAME_RAW_INLINE,
                    },
                    { tab: 'text' },
                  );
                  return true;
                case NODE_NAME_INDEX_REF:
                  setActionEditAttributes(
                    editorKey,
                    {
                      from: pos,
                      to: pos,
                      pos: nodePos,
                      node,
                      name: NODE_NAME_INDEX_REF,
                    },
                    { tab: 'idref' },
                  );
                  return true
                case NODE_NAME_IMAGE:
                  setActionEditAttributes(
                    editorKey,
                    {
                      from: pos,
                      to: pos,
                      pos: nodePos,
                      node,
                      name: NODE_NAME_IMAGE,
                    },
                    { tab: 'target' },
                  );
                  return true;
              }
              return false;
            },
            handleDOMEvents: {
              wheel: (view, event) => {
                if (event.altKey) {
                  const sign = (event.deltaY !== 0) && (event.deltaY < 0 ? 1 : -1)
                  if (sign && this.editor.can().nudgeNumericValue(sign, event.clientX, event.clientY)) {
                    this.editor.commands.nudgeNumericValue(sign, event.clientX, event.clientY)
                    event.preventDefault()
                    return true
                  }
                }
                return false
              }
            }
          },
        }),
      ];
    },

    addCommands() {
      return {
        updateDocState:
          (update: Partial<DocStateUpdate>) =>
            ({ dispatch, tr }) => {
              // set a property to null if you want to reset it
              if (dispatch) dispatch(tr.setMeta(META_UPDATE_DOC_STATE, update));
              return true;
            },
        editAttributes:
          (props) =>
            ({ dispatch, editor, state }) => {
              const sel = state.selection;
              const selectNode = props?.selectNode || (() => true)
              let nodeOrMark: SelectedNodeOrMark | undefined = undefined;
              if (sel instanceof NodeSelection) {
                const node = (sel as NodeSelection).node;
                const attrs = editableAttrsForNodeOrMark(node);
                if (selectNode(node) && attrs.length > 0) {
                  nodeOrMark = {
                    name: node.type.name,
                    node,
                    pos: sel.from,
                    from: sel.from,
                    to: sel.from + node.nodeSize,
                  };
                }
              } else {
                const markRange = getMarksBetween(
                  sel.from,
                  sel.to,
                  state.doc,
                ).find((mr) => editableAttrsForNodeOrMark(mr.mark).length > 0);
                if (markRange) {
                  nodeOrMark = {
                    name: markRange.mark.type.name,
                    mark: markRange.mark,
                    pos: markRange.from,
                    from: markRange.from,
                    to: markRange.to,
                  };
                } else {
                  const $from = sel.$from;
                  let depth = $from.depth;
                  while (depth > 0) {
                    let node = $from.node(depth);
                    if (editableAttrsForNodeOrMark(node).length > 0) {
                      if (
                        selectNode(node) &&
                        !isParagraphOfIndexTerm(node, $from.node(depth - 1))
                      ) {
                        const start = sel.$from.start(depth) - 1;
                        nodeOrMark = {
                          name: node.type.name,
                          node: node,
                          pos:
                            state.doc.nodeAt(start - 1) === node
                              ? start - 1
                              : start,
                          from: start,
                          to: $from.end(depth),
                        };
                        break;
                      }
                    }
                    depth--;
                  }
                }
              }
              if (nodeOrMark) {
                // console.log(nodeOrMark)
                if (dispatch)
                  setActionEditAttributes(editor.state, nodeOrMark, props);
                return true;
              }
              return false;
            },
        gotoDocLine: (i: number) => ({ dispatch, state, tr }) => {
          if (!i) return false;
          let count: number = 0
          let found = false
          let foundPos = 0
          let foundNode: ProsemirrorNode | null = null
          const doc = state.doc
          doc.descendants((node, pos) => {
            const tn = node.type.name
            if (tn === Metadata.name) return false
            if (tn === Paragraph.name || tn === Plain.name
              || tn === Heading.name || tn === Line.name
              || tn === ShortCaption.name || tn === DefinitionTerm.name) {
              count++
              if (count === i) {
                found = true
                foundPos = pos
                foundNode = node
              }
            }
            return !found
          })
          if (!found) return false
          if (dispatch) {
            dispatch(tr.setSelection(NodeSelection.create(doc, foundPos)))
          }
          return true
        },
        nudgeNumericValue: (sign, x, y) => ({ dispatch, state, tr, view }) => {
          const { selection } = state
          /** RawInline */
          let node: ProsemirrorNode | null = null
          let index: number | undefined = undefined
          let node_start: number | undefined = undefined
          if (selection instanceof NodeSelection
            && selection.node.type.name === NODE_NAME_RAW_INLINE) {
            node = selection.node
            node_start = selection.from + 1
          } else if (x && y) {
            const pac = view.posAtCoords({ left: x, top: y })
            if (pac) {
              const { pos, inside } = pac
              // console.log(`pos=${pos}, inside=${inside}`)
              // console.log(state.doc.resolve(pos))
              node = state.doc.nodeAt(inside)
              index = pos - inside
              node_start = inside + 1
            }
          }
          if (node && node.type.name === NODE_NAME_RAW_INLINE && node_start) {
            const text = node.attrs.text
            const modified = nudgeNumericValue(text, sign)
            if (modified) {
              if (dispatch) {
                dispatch(tr.setNodeAttribute(node_start - 1, "text", modified))
              }
              return true
            }
            return false
          }
          /** RawBlock */
          if (!node && selection.empty) {
            const { $from, from } = selection
            const inner = innerNodeDepth($from, (n => n.type.name === NODE_NAME_RAW_BLOCK))
            if (!inner) return false
            node_start = $from.start(inner)
            index = from - node_start
            node = $from.node(inner)
          } else if (node?.type.name !== NODE_NAME_RAW_BLOCK) {
            return false
          }
          if (node && node_start && index) {
            const modified = nudgeNumericValueAtIndex(node.textContent, index, sign)
            if (modified) {
              if (dispatch) {
                const { start, end, value } = modified
                dispatch(tr.insertText(value, node_start + start, node_start + end))
              }
              return true
            }
          }
          return false
        }
      };
    },

    addKeyboardShortcuts() {
      const altCmd = (n: number) => setActionCommand(
        this.editor.state,
        ACTION_SET_ALTERNATIVE,
        { alternative: n } as SetAlternativeActionProps
      )
      return {
        [SK_EDIT_ATTRIBUTES]: () => this.editor.commands.editAttributes(),
        [SK_SET_ALTERNATIVE_0]: () => altCmd(0),
        [SK_SET_ALTERNATIVE_1]: () => altCmd(1),
        [SK_SET_ALTERNATIVE_2]: () => altCmd(2),
        [SK_SET_ALTERNATIVE_3]: () => altCmd(3),
        [SK_SET_ALTERNATIVE_4]: () => altCmd(4),
        [SK_SET_ALTERNATIVE_5]: () => altCmd(5),
        [SK_SET_ALTERNATIVE_6]: () => altCmd(6),
        [SK_SET_ALTERNATIVE_7]: () => altCmd(7),
        [SK_SET_ALTERNATIVE_8]: () => altCmd(8),
        [SK_SET_ALTERNATIVE_9]: () => altCmd(9),
      };
    },
  });

function isParagraphOfIndexTerm(
  node: ProsemirrorNode,
  parent: ProsemirrorNode,
): boolean {
  return parent?.type.name === NODE_NAME_INDEX_TERM
    && node?.type.name === NODE_NAME_PARAGRAPH
}
