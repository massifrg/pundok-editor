import { Editor } from "@tiptap/vue-3";
import { Node as PmNode } from '@tiptap/pm/model'
import { EditorState } from "@tiptap/pm/state";
import { isAbsolute, relative as relativePath } from 'path-browserify'
import {
  DocumentFormat,
  EditorKeyType,
  PundokEditorConfig,
  PundokEditorProject,
} from "../../common";
import { getIndexingState, pundokEditorUtilsPluginKey } from "../extensions";
import { EditorGUIProps, EditorGUIPropsClass } from "./EditorGUIProps";
import { mergeIndices } from "./indices";
import { nodeToPandocJsonString, PandocJsonExporterOptions } from "./PandocJsonExporter";

export interface DocState {
  /** The unique key of the editor. */
  readonly editorKey: EditorKeyType;
  /** Properties that modify the editor's behavior. */
  readonly guiProps: EditorGUIProps;
  /** The name of the document being edited. */
  readonly documentName?: string;
  /** The path or base URL where documents are read */
  readonly workingFolder?: string;
  /** The path or base URL where a copy of a document is saved */
  readonly copyFolder?: string;
  /** The path or base URL where images are picked */
  readonly imagesFolder?: string;
  /** The path or base URL where document or snippets are picked for inclusion */
  readonly includeFolder?: string;
  /** The predefined or last-opened input format */
  readonly workingFormat?: DocumentFormat;
  /** The predefined or last-saved as copy output format */
  readonly copyFormat?: DocumentFormat;
  /** The predefined or last-picked image format */
  readonly imagesFormat?: DocumentFormat;
  /** The predefined or last-included document or snippet */
  readonly includeFormat?: DocumentFormat;
  /** Resource path for pandoc conversions. FIXME: still useful? */
  readonly resourcePath?: string[];
  /** Current configuration in use in the editor. */
  readonly configuration?: PundokEditorConfig;
  /** Current project of the document being edited. */
  readonly project?: PundokEditorProject;
  /** `true` when the doc has changed and the changes are not saved in the original document or in another format with "save as" */
  readonly unsavedChanges?: boolean;
  /** `true` when the doc has changed and the changes have not been saved as a copy in another format. */
  readonly unsavedChangesAsCopy?: boolean;
  /** the document that has been saved */
  readonly savedDoc?: PmNode;
}

/** An interface to update the {@link DocState}. */
export interface DocStateUpdate {
  documentName: string | null;
  guiProps: Partial<EditorGUIProps> | null;
  resourcePath: string[] | null;
  workingFolder: string | null;
  copyFolder: string | null;
  imagesFolder: string | null;
  includeFolder: string | null;
  workingFormat: DocumentFormat | null;
  copyFormat?: DocumentFormat | null;
  imagesFormat?: DocumentFormat | null;
  includeFormat?: DocumentFormat | null;
  configuration: PundokEditorConfig | null;
  project: PundokEditorProject | null;
  unsavedChanges: boolean;
  unsavedChangesAsCopy: boolean;
  savedDoc: PmNode;
}

export const META_UPDATE_DOC_STATE = 'update-doc-state';

export function getDocState(state?: EditorState): DocState | undefined {
  return state ? pundokEditorUtilsPluginKey.getState(state) : undefined;
}

export function getEditorDocState(editor?: Editor): DocState | undefined {
  return getDocState(editor?.state);
}

export function getEditorGuiProps(editor?: Editor): EditorGUIProps | undefined {
  return getEditorDocState(editor)?.guiProps
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

// export function getDocStateIfEditorHasKey(
//   editor?: Editor,
//   editorKey?: EditorKeyType,
// ): DocState | undefined {
//   const docState = editor?.state
//     ? pundokEditorUtilsPluginKey.getState(editor.state)
//     : undefined;
//   return docState && docState.editorKey === editorKey ? docState : undefined;
// }

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
    let modified = false
    Object.entries(updates).forEach(([key, value]) => {
      // set a property to null if you want to reset it
      if (!modified) {
        let currentValue: any = currentDocState[key as keyof DocState]
        currentValue = currentValue === undefined ? null : currentValue
        modified = currentValue !== value
      }
      if (key !== 'savedDoc')
        console.log(`updateDocState: updated ${key} to ${JSON.stringify(value)}`)
      if (key === 'guiProps') {
        const guiProps = value !== null
          ? { ...newDocState.guiProps, ...(value as Partial<EditorGUIProps>) }
          : new EditorGUIPropsClass()
        newDocState = { ...newDocState, guiProps }
      } else {
        newDocState =
          value === null
            ? { ...newDocState, [key]: undefined }
            : { ...newDocState, [key]: value };
      }
    });
    if (modified) return {
      ...newDocState,
      editorKey: currentDocState.editorKey,
    };
  }
  return currentDocState;
}

export function makePathRelativeToDoc(docState: DocState, path: string): string {
  const basePath = docState?.workingFolder
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