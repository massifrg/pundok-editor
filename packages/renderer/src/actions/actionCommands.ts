import {
  ACTION_EDIT_ATTRIBUTES,
  ACTION_DOCUMENT_EXPORT,
  ACTION_DOCUMENT_IMPORT,
  ACTION_SHOW_EXPORT_DIALOG,
  ACTION_SHOW_IMPORT_DIALOG,
  ActionForNodeOrMark,
  ACTION_NEW_EMPTY_DOCUMENT,
  ACTION_SHOW_PROJECT_STRUCTURE_DIALOG,
  ACTION_DOCUMENT_OPEN,
  ACTION_CLOSE_EDITOR,
  ACTION_SETUP_VIEWER,
  ACTION_DOCUMENT_TRANSFORM,
  BaseActionForNodeOrMark,
} from './actions';
import {
  DocumentContext,
  EditorKeyType,
  InputConverter,
  OutputConverter,
  PandocFilterTransform,
  StoredDoc,
  ViewerSetup,
} from '../common';
import { useActions } from '../stores';
import { editorKeyFromState } from '../schema';
import { SelectedNodeOrMark } from '../schema/helpers';
import { EditorState } from '@tiptap/pm/state';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { NotesViewAction } from './viewAction';

function editorKeyFrom(
  stateOrKey: EditorState | EditorKeyType,
): EditorKeyType | undefined {
  return stateOrKey instanceof EditorState
    ? editorKeyFromState(stateOrKey)
    : stateOrKey;
}

export function setActionNewEmptyDocument(
  stateOrKey: EditorState | EditorKeyType,
  configurationName?: string,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey) {
    useActions().setAction({
      ...ACTION_NEW_EMPTY_DOCUMENT,
      editorKey,
      props: configurationName ? { configurationName } : {},
    });
  }
}

export function setActionOpenDocument(
  stateOrKey: EditorState | EditorKeyType,
  context: DocumentContext,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  // console.log(`setActionImportDocument, editorKey=${editorKey}`);
  if (editorKey) {
    useActions().setAction({
      ...ACTION_DOCUMENT_OPEN,
      editorKey,
      props: {
        context: {
          ...context,
          editorKey,
        },
      },
    });
  }
}

export function setActionImportDocument(
  stateOrKey: EditorState | EditorKeyType,
  inputConverter: InputConverter,
  storedDoc?: Partial<StoredDoc>,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  // console.log(`setActionImportDocument, editorKey=${editorKey}`);
  if (editorKey) {
    useActions().setAction({
      ...ACTION_DOCUMENT_IMPORT,
      editorKey,
      props: {
        inputConverter,
        storedDoc,
      },
    });
  }
}

export function setActionExportDocument(
  stateOrKey: EditorState | EditorKeyType,
  outputConverter: OutputConverter,
  storedDoc?: Partial<StoredDoc>,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey) {
    useActions().setAction({
      ...ACTION_DOCUMENT_EXPORT,
      editorKey,
      props: {
        outputConverter,
        storedDoc,
      },
    });
  }
}

export function setActionShowImportDialog(
  stateOrKey: EditorState | EditorKeyType,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey)
    useActions().setAction({ ...ACTION_SHOW_IMPORT_DIALOG, editorKey });
}

export function setActionShowExportDialog(
  stateOrKey: EditorState | EditorKeyType,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey)
    useActions().setAction({ ...ACTION_SHOW_EXPORT_DIALOG, editorKey });
}

export interface ActionEditAttributesProps {
  tab?: string,
  action?: BaseActionForNodeOrMark,
  selectNode?: (node: ProsemirrorNode) => boolean,
}

export function setActionEditAttributes(
  stateOrKey: EditorState | EditorKeyType,
  nodeOrMark: SelectedNodeOrMark,
  props?: ActionEditAttributesProps,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey) {
    const action: ActionForNodeOrMark = {
      ...ACTION_EDIT_ATTRIBUTES,
      editorKey,
      nodeOrMark,
      props,
    };
    useActions().setAction(action);
  }
}

export function setActionShowProjectStructureDialog(
  stateOrKey: EditorState | EditorKeyType,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey)
    useActions().setAction({
      ...ACTION_SHOW_PROJECT_STRUCTURE_DIALOG,
      editorKey,
    });
}

function setViewActionNotes(
  stateOrKey: EditorState | EditorKeyType,
  command: 'open' | 'close',
  noteType?: string,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey)
    useActions().setViewAction({
      type: 'notes',
      editorKey,
      command,
      noteType,
    } as NotesViewAction);
}

export function setViewActionCloseNotes(
  stateOrKey: EditorState | EditorKeyType,
  noteType?: string,
) {
  setViewActionNotes(stateOrKey, 'close', noteType);
}

export function setViewActionExpandNotes(
  stateOrKey: EditorState | EditorKeyType,
  noteType?: string,
) {
  setViewActionNotes(stateOrKey, 'open', noteType);
}

export function setActionCloseEditor(stateOrKey: EditorState | EditorKeyType) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey) useActions().setAction({ ...ACTION_CLOSE_EDITOR, editorKey });
}

export function setActionSetupViewer(
  stateOrKey: EditorState | EditorKeyType,
  setup: ViewerSetup,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey)
    useActions().setAction({
      ...ACTION_SETUP_VIEWER,
      editorKey,
      props: { setup },
    });
}

export function setActionTransformDocument(
  stateOrKey: EditorState | EditorKeyType,
  transform: PandocFilterTransform,
) {
  const editorKey = editorKeyFrom(stateOrKey);
  if (editorKey)
    useActions().setAction({
      ...ACTION_DOCUMENT_TRANSFORM,
      editorKey,
      props: { transform },
    });
}
