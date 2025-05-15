import { EditorState } from "@tiptap/pm/state";
import {
  EditorKeyType,
  PANDOC_TYPES_VERSION,
  PundokEditorConfig,
  PundokEditorProject,
  SaveResponse
} from "../../common";
import { getIndexingState, pundokEditorUtilsPluginKey } from "../extensions";
import { Editor } from "@tiptap/vue-3";
import { isAbsolute, parse as parsePath, relative as relativePath } from 'path-browserify'
import { nodeToPandocJsonString, PandocJsonExporterOptions } from "./PandocJsonExporter";
import { mergeIndices } from "./indices";

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

export const META_UPDATE_DOC_STATE = 'update-doc-state';

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

export function updateDocState(
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

export function docBasePath(docState: DocState): string | undefined {
  let basePath = docState.project?.path
  if (basePath)
    return basePath
  basePath = docState.lastSaveResponse?.doc.path
  if (basePath)
    return parsePath(basePath).dir
  basePath = docState.resourcePath && docState.resourcePath[0]
  if (basePath)
    return basePath
}

export function makePathRelativeToDoc(docState: DocState, path: string): string {
  const basePath = docBasePath(docState)
  return basePath && isAbsolute(path)
    ? relativePath(basePath, path)
    : path
}

export function getDocAsJsonString(
  state: EditorState,
  options?: PandocJsonExporterOptions
): string {
  if (state) {
    const docState = getDocState(state)
    const document = state.doc;
    const indexingState = getIndexingState(state)
    const indices = mergeIndices(
      indexingState?.indices || docState?.configuration?.indices,
      indexingState?.docIndices
    )
    return nodeToPandocJsonString(document, { indices, ...options });
  }
  return '{}'
}