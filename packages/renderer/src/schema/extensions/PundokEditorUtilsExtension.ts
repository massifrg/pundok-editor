import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorView } from '@tiptap/pm/view';
import {
  EditorState,
  NodeSelection,
  Plugin,
  PluginKey,
} from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { IndexRef, IndexTerm, Paragraph, RawInline } from '..';
import { setActionEditAttributes } from '../../actions';

import {
  EditorKeyType,
  PundokEditorConfig,
  PundokEditorProject,
  SaveResponse,
  SK_EDIT_ATTRIBUTES,
} from '../../common';
import { Editor, getMarksBetween } from '@tiptap/vue-3';
import { editableAttrsForNodeOrMark, SelectedNodeOrMark } from '../helpers';

export const META_UPDATE_DOC_STATE = 'update-doc-state';

let keyCounter = 1;

export function newEditorKey(): EditorKeyType {
  return keyCounter++;
}

export interface DocState {
  /** The unique key of the editor. */
  readonly editorKey: EditorKeyType;
  /** The name of the document being edited. */
  readonly documentName?: string;
  /** Resource path for pandoc conversions. FIXME: still useful? */
  readonly resourcePath?: string[];
  /** Current configuration in use in the editor. */
  readonly configuration?: PundokEditorConfig;
  /** Current project of the document being edited. */
  readonly project?: PundokEditorProject;
  /** The result of the last save operation. */
  readonly lastSaveResponse?: SaveResponse;
  /** The result of the last export operation. */
  readonly lastExportResponse?: SaveResponse;
  /** `true` when the doc has changed and the changes are not saved in JSON yet. FIXME: native format too? */
  readonly nativeUnsavedChanges?: boolean;
  /** `true` when the doc has changed and the changes are not saved in any format. */
  readonly unsavedChanges?: boolean;
  /** callback to get notified when the doc state changes. */
  readonly callback?: (updated: DocState) => void;
}

/** An interface to update the {@link DocState}. */
export interface DocStateUpdate {
  documentName: string | null;
  resourcePath: string[] | null;
  configuration: PundokEditorConfig | null;
  project: PundokEditorProject | null;
  lastSaveResponse: SaveResponse | null;
  lastExportResponse: SaveResponse | null;
  nativeUnsavedChanges: boolean;
  unsavedChanges: boolean;
  callback: ((updated: DocState) => void) | null;
}

export function getDocState(state?: EditorState): DocState | undefined {
  return state ? pundokEditorUtilsPluginKey.getState(state) : undefined;
}

export function getEditorDocState(editor?: Editor): DocState | undefined {
  return getDocState(editor?.state);
}

export function getEditorConfiguration(
  editorOrState: Editor | EditorState,
): PundokEditorConfig | undefined {
  const state =
    editorOrState instanceof EditorState
      ? editorOrState
      : (editorOrState as Editor)?.state;
  const docState = getDocState(state);
  return docState?.project?.computedConfig || docState?.configuration;
}

export function getEditorProject(
  editorOrState: Editor | EditorState,
): PundokEditorProject | undefined {
  const state =
    editorOrState instanceof EditorState
      ? editorOrState
      : (editorOrState as Editor)?.state;
  return getDocState(state)?.project;
}

export function getDocStateIfEditorHasKey(
  editor?: Editor,
  editorKey?: EditorKeyType,
): DocState | undefined {
  const docState = editor?.state
    ? pundokEditorUtilsPluginKey.getState(editor.state)
    : undefined;
  return docState && docState.editorKey === editorKey ? docState : undefined;
}

export function editorKeyFromState(
  state?: EditorState,
): EditorKeyType | undefined {
  const docState = getDocState(state);
  return docState ? docState.editorKey : undefined;
}

function updateDocState(
  currentDocState: DocState,
  updates: Partial<DocStateUpdate>,
): DocState {
  if (updates) {
    let newDocState: DocState = { ...currentDocState };
    Object.entries(updates).forEach(([key, value]) => {
      // set a property to null if you want to reset it
      newDocState =
        value === null
          ? { ...newDocState, [key]: undefined }
          : { ...newDocState, [key]: value };
    });
    newDocState = {
      ...newDocState,
      editorKey: currentDocState.editorKey,
    };
    return newDocState;
  }
  return currentDocState;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pundokEditorUtils: {
      updateDocState: (update: Partial<DocStateUpdate>) => ReturnType;
      editAttributes: () => ReturnType;
    };
  }
}

export interface PundokEditorUtilsOptions { }

export const pundokEditorUtilsPluginKey = new PluginKey(
  'pundokEditorUtilsPlugin',
);

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
                case RawInline.name:
                  setActionEditAttributes(
                    editorKey,
                    {
                      from: pos,
                      to: pos,
                      pos: nodePos,
                      node,
                      name: RawInline.name,
                    },
                    'text',
                  );
                  return true;
                case IndexRef.name:
                  setActionEditAttributes(
                    editorKey,
                    {
                      from: pos,
                      to: pos,
                      pos: nodePos,
                      node,
                      name: IndexRef.name,
                    },
                    'idref',
                  );
                  return true;
              }
              return false;
            },
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
          () =>
            ({ dispatch, editor, state }) => {
              const sel = state.selection;
              let nodeOrMark: SelectedNodeOrMark | undefined = undefined;
              let tab: string | undefined = undefined;
              if (sel instanceof NodeSelection) {
                const node = (sel as NodeSelection).node;
                const attrs = editableAttrsForNodeOrMark(node);
                if (attrs.length > 0) {
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
                        depth <= 0 ||
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
                  setActionEditAttributes(editor.state, nodeOrMark, tab);
                return true;
              }
              return false;
            },
      };
    },

    addKeyboardShortcuts() {
      return {
        [SK_EDIT_ATTRIBUTES]: () => this.editor.commands.editAttributes(),
      };
    },
  });

function isParagraphOfIndexTerm(
  node: ProsemirrorNode,
  parent: ProsemirrorNode,
): boolean {
  return (
    parent?.type.name === IndexTerm.name && node?.type.name === Paragraph.name
  );
}
