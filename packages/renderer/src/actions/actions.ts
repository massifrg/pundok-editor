import { Editor } from '@tiptap/core';
import { currentRepeatableCommandTooltip, SearchTextVariant } from '../schema';
import { DocState, SelectedNodeOrMark } from '../schema/helpers';
import {
  AddOrRemoveClassActionProps,
  EditorKeyType,
  MetaMapTextActionProps,
  TableCellVertAlignActionProps,
  TextAlignmentActionProps
} from '../common';
import { ActionsGroup } from './actionGroup';
import { TypeOrNode } from '../schema/extensions/HelperCommandsExtension';

export type ActionName =
  | 'update-doc-state'
  | 'backend-feedback'
  | 'backend-set-project'
  | 'close-editor'
  | 'show-project-structure'
  | 'backend-set-configuration-name'
  | 'set-content'
  | 'backend-set-content'
  | 'backend-set-content-with-project'
  | 'open-document'
  | 'save-document'
  | 'save-document-as'
  | 'save-document-copy'
  | 'render-document'
  | 'new-project'
  | 'get-project'
  | 'include-document'
  | 'import-document'
  | 'export-document'
  | 'transform-document'
  | 'set-document-format'
  | 'document-go-to-line'
  | 'show-result-message'
  | 'show-export-dialog'
  | 'show-import-dialog'
  | 'show-search-dialog'
  | 'select-prev'
  | 'select-next'
  | 'set-alternative'
  | 'replace-and-select-next'
  | 'repeat-change'
  | 'modify-metamap-entry-key'
  | 'add-class'
  | 'remove-class'
  | 'new-empty-document'
  | 'new-document'
  | 'setup-viewer'
  | 'edit-node-or-mark-attributes'
  | 'edit-meta-map-text'
  | 'set-meta-map-text'
  | 'unwrap-blocks'
  | 'set-text-align'
  | 'set-vertical-align'
  | 'select-node'
  | 'copy-node'
  | 'delete-node'
  | 'duplicate-node'
  | 'add-table-caption'
  | 'add-table-head'
  | 'add-table-foot'
  | 'prepend-table-body'
  | 'append-table-body'
  | 'decrease-table-body-header-rows'
  | 'increase-table-body-header-rows'
  | 'decrease-table-body-header-columns'
  | 'increase-table-body-header-columns'
  | 'propagate-index-name'
  | 'select-mark-range'
  | 'add-mark'
  | 'remove-mark'
  | 'delete-css-selected'
  | 'unwrap-css-selected'
  | 'set-span'
  | 'set-index-ref'
  | 'add-custom-style'
  | 'remove-custom-style'
  | 'add-custom-class'
  | 'remove-custom-class'
  | 'lowercase'
  | 'uppercase'
  | 'uppercase-first'
  | 'auto-set-index-term-id'
  | 'insert-raw-inline'
  | 'move-before-first-sibling'
  | 'move-before-previous-sibling'
  | 'move-before-next-sibling'
  | 'move-after-previous-sibling'
  | 'move-after-next-sibling'
  | 'move-after-last-sibling'
  | 'move-inside-prev-sibling'
  | 'move-inside-next-sibling'

export type TooltipForAction =
  | string
  | ((
    editor?: Editor,
    action?: ActionCore, // ActionForNodeOrMark | EditorAction,
  ) => string | undefined);

/** Core properties of actions */
export interface ActionCore {
  label: string;
  tooltip?: TooltipForAction;
  icon?: string;
  iconRight?: string;
  order?: number;
}

/** Editor action that is not linked to an editor instance */
export interface BaseEditorAction extends ActionCore {
  name: ActionName;
  props?: object;
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

export const ACTION_UPDATE_DOC_STATE: BaseEditorAction = {
  name: 'update-doc-state',
  label: 'update DocState',
}

export interface UpdateDocStateActionProps {
  docState: DocState
}

export const ACTION_BACKEND_FEEDBACK: BaseEditorAction = {
  name: 'backend-feedback',
  label: 'feedback from the backend',
};

export const ACTION_BACKEND_SET_PROJECT: BaseEditorAction = {
  name: 'backend-set-project',
  label: 'set project',
};

/** Used to force a reload of a project. */
export const ACTION_GET_PROJECT: BaseEditorAction = {
  name: 'get-project',
  label: 'get-project',
}

export const ACTION_CLOSE_EDITOR: BaseEditorAction = {
  name: 'close-editor',
  label: 'close editor',
};

export const ACTION_SHOW_PROJECT_STRUCTURE_DIALOG: BaseEditorAction = {
  name: 'show-project-structure',
  label: 'show project structure',
};

export const ACTION_PROJECT_NEW: BaseEditorAction = {
  name: 'new-project',
  label: 'create new project',
}

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
  name: 'save-document-as',
  label: 'save document with a different name',
};

export const ACTION_DOCUMENT_SAVE_COPY: BaseEditorAction = {
  name: 'save-document-copy',
  label: 'save a copy',
};

export const ACTION_DOCUMENT_RENDER: BaseEditorAction = {
  name: 'render-document',
  label: 'render this document or project',
  icon: 'mdi-book-play',
};

export const ACTION_DOCUMENT_INCLUDE: BaseEditorAction = {
  name: 'include-document',
  label: 'include a document in the current one',
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

export const ACTION_SET_DOCUMENT_FORMAT: BaseEditorAction = {
  name: 'set-document-format',
  label: 'set the document format',
}

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

export const ACTION_LOWERCASE: BaseActionForNodeOrMark = {
  name: 'lowercase',
  label: "convert to lower case the selected text",
  icon: "mdi-format-letter-case-lower",
  canDo: (editor) => editor.can().toLowercase(),
  do: (editor) => editor.commands.toLowercase(),
}

export const ACTION_UPPERCASE: BaseActionForNodeOrMark = {
  name: 'uppercase',
  label: "convert to upper case the selected text",
  icon: "mdi-format-letter-case-upper",
  canDo: (editor) => editor.can().toUppercase(),
  do: (editor) => editor.commands.toUppercase(),
}

export const ACTION_UPPERCASE_FIRST: BaseActionForNodeOrMark = {
  name: 'uppercase-first',
  label: "convert to upper case the first letter of every word in selected text",
  icon: "mdi-format-letter-case",
  canDo: (editor) => editor.can().toUppercaseFirst(),
  do: (editor) => editor.commands.toUppercaseFirst(),
}

export const ACTION_ADD_CLASS: BaseActionForNodeOrMark = {
  name: 'add-class',
  label: 'add a class',
  icon: 'add_class',
  canDo: (editor, action) => {
    const { nodeOrMark, props } = action || {}
    const { className, typeName } = (props as AddOrRemoveClassActionProps) || {}
    const typ: TypeOrNode | undefined = typeName || nodeOrMark?.node?.type || nodeOrMark?.mark?.type
    return typ && className && editor.can().addPandocAttrClass(typ, className) || false
  },
  do: (editor, action) => {
    const { nodeOrMark, props } = action || {}
    const { className, typeName } = (props as AddOrRemoveClassActionProps) || {}
    const typ: TypeOrNode | undefined = typeName || nodeOrMark?.node?.type || nodeOrMark?.mark?.type
    return typ && className && editor.commands.addPandocAttrClass(typ, className) || false
  }
}

export const ACTION_REMOVE_CLASS: BaseActionForNodeOrMark = {
  name: 'remove-class',
  label: 'remove a class',
  icon: 'remove_class',
  canDo: (editor, action) => {
    const { nodeOrMark, props } = action || {}
    const { className, typeName } = (props as AddOrRemoveClassActionProps) || {}
    const typ: TypeOrNode | undefined = typeName || nodeOrMark?.node?.type || nodeOrMark?.mark?.type
    return typ && className && editor.can().removePandocAttrClass(typ, className) || false
  },
  do: (editor, action) => {
    const { nodeOrMark, props } = action || {}
    const { className, typeName } = (props as AddOrRemoveClassActionProps) || {}
    const typ: TypeOrNode | undefined = typeName || nodeOrMark?.node?.type || nodeOrMark?.mark?.type
    return typ && className && editor.commands.removePandocAttrClass(typ, className) || false
  }
}

export interface SearchIndexTermActionProps {
  searchTextVariant: SearchTextVariant
}

export const ACTION_AUTO_SET_INDEX_TERM_ID: BaseActionForNodeOrMark = {
  name: 'auto-set-index-term-id',
  label: 'search and set the id of the index term automatically',
  icon: 'mdi-database-search',
  canDo: (editor, action) => editor.can().setIndexTermAutoId(
    (action?.props as SearchIndexTermActionProps)?.searchTextVariant),
  do: (editor, action) => editor.commands.runRepeatableCommand(
    'setIndexTermAutoId',
    'search and set the id of the current index term automatically',
    (action?.props as SearchIndexTermActionProps)?.searchTextVariant
  )
}

export const ACTION_ADD_MARK: BaseActionForNodeOrMark = {
  name: 'add-mark',
  label: 'add Mark (Emph, Strong, etc.)',
  icon: 'mdi-tag-plus',
}

export const ACTION_REMOVE_MARK: BaseActionForNodeOrMark = {
  name: 'remove-mark',
  label: 'remove Mark (Emph, Strong, etc.)',
  icon: 'mdi-tag-minus',
}

export const ACTION_ADD_CUSTOM_STYLE: BaseActionForNodeOrMark = {
  name: 'add-custom-style',
  label: 'add custom style',
  icon: 'character_style',
}

export const ACTION_REMOVE_CUSTOM_STYLE: BaseActionForNodeOrMark = {
  name: 'remove-custom-style',
  label: 'remove custom style',
  icon: 'character_style',
}

export const ACTION_SET_SPAN: BaseActionForNodeOrMark = {
  name: 'set-span',
  label: 'add Span (with optional classes and attributes)',
  icon: 'mdi-text-box-plus',
}

export const ACTION_ADD_CUSTOM_CLASS: BaseActionForNodeOrMark = {
  name: 'add-custom-class',
  label: 'add a custom class (with its attributes)',
  icon: 'add_custom_class'
}

export const ACTION_REMOVE_CUSTOM_CLASS: BaseActionForNodeOrMark = {
  name: 'remove-custom-class',
  label: 'remove a custom class (with its attributes)',
  icon: 'remove_custom_class'
}

export const ACTION_SET_INDEX_REF: BaseActionForNodeOrMark = {
  name: 'set-index-ref',
  label: 'set an index reference at selection',
  icon: 'mdi-cursor-pointer',
}

export const ACTION_INSERT_RAW_INLINE: BaseActionForNodeOrMark = {
  name: 'insert-raw-inline',
  label: 'insert a RawInline before/after/around selection',
  icon: 'mdi-code-tags',
}

export const ACTION_DELETE_CSS_SELECTED: BaseActionForNodeOrMark = {
  name: 'delete-css-selected',
  label: 'delete the current CSS-selected Node or Mark',
  icon: 'mdi-delete'
}

export const ACTION_UNWRAP_CSS_SELECTED: BaseActionForNodeOrMark = {
  name: 'unwrap-css-selected',
  label: 'unwrap the contents of the current CSS-selected Node or remove Mark',
  icon: 'mdi-wrap-disabled'
}

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
  canDo: (editor, action) => {
    const { text } = action?.props as MetaMapTextActionProps
    return editor.can().setMetaMapEntryText(text, action?.nodeOrMark?.pos)
  },
  do: (editor, action) => {
    const { text } = action?.props as MetaMapTextActionProps
    return editor.commands.setMetaMapEntryText(text, action?.nodeOrMark?.pos)
  }
};

export const UNWRAP_BLOCKS_ACTION: BaseActionForNodeOrMark = {
  name: 'unwrap-blocks',
  label: 'unwrap the contents',
  icon: 'mdi-wrap-disabled',
  canDo: (editor, action) =>
    !!action?.nodeOrMark?.pos &&
    editor.can().unwrapNode(action.nodeOrMark.pos),
  do: (editor, action) =>
    !!action?.nodeOrMark?.pos &&
    editor.commands.unwrapNode(action.nodeOrMark.pos),
};

export const TABLE_CELL_ALIGNMENT_ACTIONS: BaseActionForNodeOrMark[] = [];
(['left', 'center', 'right'] as string[]).forEach((alignment) => {
  TABLE_CELL_ALIGNMENT_ACTIONS.push({
    name: `set-text-align`,
    label: `horizontal ${alignment} align`,
    icon: `mdi-format-align-${alignment}`,
    canDo: (editor, action) => editor.can().setTextAlign((action?.props as TextAlignmentActionProps)?.alignment),
    do: (editor, action) => editor.commands.setTextAlign((action?.props as TextAlignmentActionProps)?.alignment),
    props: { alignment } as TextAlignmentActionProps
  });
});
(['top', 'middle', 'bottom'] as string[]).forEach((alignment) => {
  TABLE_CELL_ALIGNMENT_ACTIONS.push({
    name: 'set-vertical-align',
    label: `vertical ${alignment} align`,
    icon: `mdi-format-align-${alignment}`,
    canDo: (editor, action) => editor.can().setVerticalAlign((action?.props as TableCellVertAlignActionProps)?.alignment),
    do: (editor, action) => editor.commands.setVerticalAlign((action?.props as TableCellVertAlignActionProps)?.alignment),
    props: { alignment } as TableCellVertAlignActionProps
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

const AVAILABLE_ACTIONS: Record<string, BaseActionForNodeOrMark> = Object.fromEntries([
  ACTION_ADD_MARK,
  ACTION_REMOVE_MARK,
  ACTION_DELETE_CSS_SELECTED,
  ACTION_UNWRAP_CSS_SELECTED,
  ACTION_ADD_CUSTOM_STYLE,
  ACTION_REMOVE_CUSTOM_STYLE,
  ACTION_LOWERCASE,
  ACTION_UPPERCASE,
  ACTION_UPPERCASE_FIRST,
  ACTION_SET_SPAN,
  ACTION_ADD_CUSTOM_CLASS,
  ACTION_REMOVE_CUSTOM_CLASS,
  // ACTION_ADD_CLASS,
  // ACTION_REMOVE_CLASS,
  ACTION_SET_INDEX_REF,
  ACTION_INSERT_RAW_INLINE,
].map(action => [action.name, action]))

export function availableActionsNames(): string[] {
  return Object.keys(AVAILABLE_ACTIONS)
}

export function availableAction(actionName: string): BaseActionForNodeOrMark | undefined {
  return AVAILABLE_ACTIONS[actionName]
}

export function fillAvailableAction(
  actionName: string,
  fields: {
    props?: object,
    editorKey?: EditorKeyType,
    nodeOrMark?: SelectedNodeOrMark
  }
): ActionForNodeOrMark | undefined {
  const { props, editorKey, nodeOrMark } = fields
  const available = availableAction(actionName)
  if (available && editorKey)
    return { ...available, props, editorKey, nodeOrMark }
}