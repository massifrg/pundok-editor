import { Editor } from '@tiptap/core';
import { currentRepeatableCommandTooltip } from '../schema';
import { SelectedNodeOrMark } from '../schema/helpers';
import { EditorKeyType } from '../common';
import { ActionsGroup } from './actionGroup';

export type TooltipForAction =
  | string
  | ((
    editor?: Editor,
    action?: ActionForNodeOrMark | EditorAction,
  ) => string | undefined);

/** Core properties of actions */
export interface ActionCore {
  name: string;
  label: string;
  tooltip?: TooltipForAction;
  icon?: string;
  iconRight?: string;
  order?: number;
}

/** Editor action that is not linked to an editor instance */
export interface BaseEditorAction extends ActionCore {
  props?: Record<string, any>;
}

/** Editor action that is relevant only to the editor having that editorKey */
export interface EditorAction extends BaseEditorAction {
  editorKey: EditorKeyType;
}

interface ActionForNodeOrMarkCore {
  canDo?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  do?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  nodeOrMark?: SelectedNodeOrMark;
  restoreSelection?: boolean;
  group?: ActionsGroup;
}

/** Action pertinent to a particular Node or Mark of the document (non linked version) */
export type BaseActionForNodeOrMark = BaseEditorAction & ActionForNodeOrMarkCore

/** Action pertinent to a particular Node or Mark of the document of the editor with that editorKey */
export type ActionForNodeOrMark = EditorAction & ActionForNodeOrMarkCore

export const ACTION_BACKEND_FEEDBACK: BaseEditorAction = {
  name: 'backend-feedback',
  label: 'feedback from the backend',
};

export const ACTION_BACKEND_SET_PROJECT: BaseEditorAction = {
  name: 'backend-set-project',
  label: 'set project',
};

export const ACTION_CLOSE_EDITOR: BaseEditorAction = {
  name: 'close-editor',
  label: 'close editor',
};

export const ACTION_SHOW_PROJECT_STRUCTURE_DIALOG: BaseEditorAction = {
  name: 'show-project-structure',
  label: 'show project structure',
};

export const ACTION_BACKEND_SET_CONFIG_NAME: BaseEditorAction = {
  name: 'backend-set-configuration-name',
  label: 'set the configuration name',
};

export const ACTION_SET_CONTENT: BaseEditorAction = {
  name: 'set-content',
  label: 'set the content of the editor',
  tooltip: 'set just the content of the editor (project, configuration, etc. stay the same)',
};

export const ACTION_BACKEND_SET_CONTENT: BaseEditorAction = {
  name: 'backend-set-content',
  label: 'set the content of the editor',
};

export const ACTION_BACKEND_SET_CONTENT_WITH_PROJECT: BaseEditorAction = {
  name: 'backend-set-content-with-project',
  label: 'set the content with a project (and a configuration)',
};

export const ACTION_DOCUMENT_OPEN: BaseEditorAction = {
  name: 'open-document',
  label: 'open document',
  icon: 'mdi-file-document-edit'
};

export const ACTION_DOCUMENT_SAVE: BaseEditorAction = {
  name: 'save-document',
  label: 'save document',
};

export const ACTION_DOCUMENT_SAVE_AS: BaseEditorAction = {
  name: 'save-document-sa',
  label: 'save document with a different name',
};

export const ACTION_DOCUMENT_IMPORT: BaseEditorAction = {
  name: 'import-document',
  label: 'import document',
};

export const ACTION_DOCUMENT_EXPORT: BaseEditorAction = {
  name: 'export-document',
  label: 'export document',
};

export const ACTION_DOCUMENT_TRANSFORM: BaseEditorAction = {
  name: 'transform-document',
  label: 'transform document',
  icon: 'mdi-file-replace-outline',
};

export const ACTION_DOCUMENT_GO_TO_LINE: BaseEditorAction = {
  name: 'document-go-to-line',
  label: 'move the cursor to line',
  icon: 'mdi-debug-step-into'
}

export const ACTION_SHOW_RESULT_MESSAGE: BaseEditorAction = {
  name: 'show-result-message',
  label: 'show message relative to the result of an operation',
  icon: 'mdi-message-reply-outline',
}

export interface ACTION_PROPS_RESULT_MESSAGE {
  success: boolean,
  message: string,
  caption: string,
  icon: string,
}

export const ACTION_SHOW_EXPORT_DIALOG: BaseEditorAction = {
  name: 'show-export-dialog',
  label: 'open export dialog',
  icon: 'mdi-file-export',
};

export const ACTION_SHOW_IMPORT_DIALOG: BaseEditorAction = {
  name: 'show-import-dialog',
  label: 'open import dialog',
  icon: 'mdi-file-import',
};

export const ACTION_SHOW_SEARCH_DIALOG: BaseEditorAction = {
  name: 'show-search-dialog',
  label: 'open search dialog',
  icon: 'mdi-magnify',
};

export const ACTION_SELECT_PREV: BaseEditorAction = {
  name: 'select-prev',
  label: 'select previous',
  icon: 'mdi-chevron-left',
};

export const ACTION_SELECT_NEXT: BaseEditorAction = {
  name: 'select-next',
  label: 'select next',
  icon: 'mdi-chevron-right',
};

export const ACTION_SET_ALTERNATIVE: BaseEditorAction = {
  name: 'set-alternative',
  label: 'set alternative',
  icon: 'mdi-numeric-1-box-outline'
}

export interface ActionPropsSetAlternative {
  alternative: number,
  context?: 'indices' // | 'other-context' ... 
}

export const ACTION_REPLACE_AND_SELECT_NEXT: BaseEditorAction = {
  name: 'replace-and-select-next',
  label: 'replace and select next',
  icon: 'mdi-autorenew',
  iconRight: 'mdi-chevron-right',
};

export const ACTION_REPEAT_CHANGE: BaseActionForNodeOrMark = {
  name: 'repeat-change',
  label: 'repeat change',
  icon: 'mdi-repeat-variant',
  tooltip: (editor, action) =>
    editor && currentRepeatableCommandTooltip(editor.state),
  canDo: (editor, action) => {
    if (!action?.nodeOrMark) return false;
    const { node, pos } = action.nodeOrMark;
    return (
      (node && pos !== undefined && editor.can().repeatCommand(pos)) || false
    );
  },
  do: (editor, action) => {
    if (!action?.nodeOrMark) return false;
    const { node, pos } = action.nodeOrMark;
    return (
      (node && pos !== undefined && editor.commands.repeatCommand(pos)) || false
    );
  },
};

export const MODIFY_METAMAP_KEY: BaseActionForNodeOrMark = {
  name: 'modify-metamap-entry-key',
  label: 'modify MetaMap entry  key',
  icon: 'mdi-pencil',
  canDo: (editor, action) =>
    editor.can().setMetaMapEntryText(action?.props?.text, action?.nodeOrMark?.pos),
  do: (editor, action) =>
    editor.commands.setMetaMapEntryText(
      action?.props?.text,
      action?.nodeOrMark?.pos,
    ),
};

export const ACTION_ADD_CLASS: BaseActionForNodeOrMark = {
  name: 'add-class',
  label: 'add a class',
}

export const ACTION_NEW_EMPTY_DOCUMENT: BaseEditorAction = {
  name: 'new-empty-document',
  label: 'new empty document',
  icon: 'mdi-file-import',
};

export const ACTION_NEW_DOCUMENT: BaseEditorAction = {
  name: 'new-document',
  label: 'new document',
  icon: 'mdi-file-import',
};

export const ACTION_SETUP_VIEWER: BaseEditorAction = {
  name: 'setup-viewer',
  label: 'setup viewer',
};

export const ACTION_EDIT_ATTRIBUTES: BaseActionForNodeOrMark = {
  name: 'edit-node-or-mark-attributes',
  label: 'edit attributes...',
  icon: 'mdi-playlist-edit',
};

export const ACTION_EDIT_META_MAP_TEXT: BaseEditorAction = {
  name: 'edit-meta-map-text',
  label: 'edit MetaMap text',
  icon: 'mdi-pencil',
};
export const ACTION_SET_META_MAP_TEXT: BaseActionForNodeOrMark = {
  name: 'set-meta-map-text',
  label: 'set MetaMap text',
  canDo: (editor, action) =>
    editor.can().setMetaMapEntryText(action?.props?.text, action?.nodeOrMark?.pos),
  do: (editor, action) =>
    editor.commands.setMetaMapEntryText(
      action?.props?.text,
      action?.nodeOrMark?.pos,
    ),
};

export const UNWRAP_BLOCKS_ACTION: BaseActionForNodeOrMark = {
  name: 'unwrap-blocks',
  label: 'unwrap the contents',
  icon: 'mdi-wrap-disabled',
  canDo: (editor, action) =>
    !!action?.nodeOrMark?.pos &&
    editor.can().unwrapNodeAtPos(action.nodeOrMark.pos),
  do: (editor, action) =>
    !!action?.nodeOrMark?.pos &&
    editor.commands.unwrapNodeAtPos(action.nodeOrMark.pos),
};

export const TABLE_CELL_ALIGNMENT_ACTIONS: BaseActionForNodeOrMark[] = [];
(['left', 'center', 'right'] as string[]).forEach((where) => {
  TABLE_CELL_ALIGNMENT_ACTIONS.push({
    name: 'set-text-align',
    label: `horizontal ${where} align`,
    icon: `mdi-format-align-${where}`,
    canDo: (editor) => editor.can().setTextAlign(where),
    do: (editor) => editor.commands.setTextAlign(where),
  });
});
(['top', 'middle', 'bottom'] as string[]).forEach((where) => {
  TABLE_CELL_ALIGNMENT_ACTIONS.push({
    name: 'set-vertical-align',
    label: `vertical ${where} align`,
    icon: `mdi-format-align-${where}`,
    canDo: (editor) => editor.can().setVerticalAlign(where),
    do: (editor) => editor.commands.setVerticalAlign(where),
  });
});

export function canExecuteEditorAction(
  editor: Editor,
  action: ActionForNodeOrMark,
) {
  return !action.canDo || action.canDo(editor, action);
}

export function executeEditorAction(
  action: ActionForNodeOrMark,
  editor: Editor,
): void {
  const { canDo: canDoAction, do: doAction } = action;
  if (canDoAction && doAction) {
    if (canDoAction(editor, action)) {
      const bookmark =
        (action as ActionForNodeOrMark).restoreSelection &&
        editor.state.selection.getBookmark();
      doAction(editor, action);
      if (bookmark) editor.commands.setSelectionFromBookmark(bookmark);
    }
  }
}

