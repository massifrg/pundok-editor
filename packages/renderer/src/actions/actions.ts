import { Mark, Node } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { Editor } from '@tiptap/core';
import { editableAttrsForNodeOrMark } from '../schema/helpers/attributes';
import {
  currentRepeatableCommandTooltip,
  editorKeyFromState,
  getEditorConfiguration,
} from '../schema';
import { nodeOrMarkToPandocName } from '../schema/helpers/PandocVsProsemirror';
import {
  nodeIcon,
  nodesWithTemplate,
  compatibleNodes,
  SelectedNodeOrMark,
  templateNode,
} from '../schema/helpers';
import {
  EditorKeyType,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_PANDOC_TABLE,
  NODE_NAME_TABLE_BODY,
  NODE_NAME_TABLE_CELL,
  NODE_NAME_TABLE_HEADER,
  PundokEditorConfig
} from '../common';
import { toRaw } from 'vue';

export type TooltipForAction =
  | string
  | ((
    editor?: Editor,
    action?: ActionForNodeOrMark | EditorAction,
  ) => string | undefined);

/** Core properties of actions */
interface ActionCore {
  name: string;
  label: string;
  tooltip?: TooltipForAction;
  icon?: string;
  iconRight?: string;
  order?: number;
}

/** Editor action that is not linked to an editor instance */
export interface BaseEditorAction extends ActionCore {
  // name: string;
  // label: string;
  // icon?: string;
  // iconRight?: string;
  // order?: number;
  props?: Record<string, any>;
}

/** Editor action that is relevant only to the editor having that editorKey */
export interface EditorAction extends BaseEditorAction {
  editorKey: EditorKeyType;
}

/** Useful to group actions in sub menus (non linked to an editor instance) */
interface BaseActionsGroup extends ActionCore {
  // name: string;
  // label: string;
  // icon?: string;
  // iconRight?: string;
  // order?: number;
}

/** Actions group that is relevant only to the editor with that editorKey */
export interface ActionsGroup extends BaseActionsGroup {
  editorKey: EditorKeyType;
}

const insertBeforeGroup: BaseActionsGroup = {
  name: 'insert-before',
  label: 'insert before...',
  icon: 'mdi-select-place',
  iconRight: 'mdi-square-rounded',
};

const insertAfterGroup: BaseActionsGroup = {
  name: 'insert-after',
  label: 'insert after...',
  icon: 'mdi-square-rounded',
  iconRight: 'mdi-select-place',
};

const convertBlockGroup: BaseActionsGroup = {
  name: 'convert-block',
  label: 'convert block...',
  icon: 'mdi-swap-horizontal',
};

const moveBlockGroup: BaseActionsGroup = {
  name: 'move-block',
  label: 'move block...',
  icon: 'mdi-select-place',
  iconRight: 'mdi-swap-vertical',
};

interface ActionForNodeOrMarkCore {
  canDo?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  do?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  nodeOrMark?: SelectedNodeOrMark;
  restoreSelection?: boolean;
  group?: ActionsGroup;
}

/** Action pertinent to a particular Node or Mark of the document (non linked version) */
export interface BaseActionForNodeOrMark
  extends BaseEditorAction,
  ActionForNodeOrMarkCore {
  // canDo?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  // do?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  // nodeOrMark?: SelectedNodeOrMark;
  // restoreSelection?: boolean;
  // group?: ActionsGroup;
}

/** Action pertinent to a particular Node or Mark of the document of the editor with that editorKey */
export interface ActionForNodeOrMark
  extends EditorAction,
  ActionForNodeOrMarkCore {
  // canDo?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  // do?: (editor: Editor, action?: ActionForNodeOrMark) => boolean;
  // nodeOrMark?: SelectedNodeOrMark;
  // restoreSelection?: boolean;
  // group?: ActionsGroup;
}

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
export function actionNewDocument(
  editorKey: EditorKeyType,
  content: string,
  configurationName?: string,
): EditorAction {
  const action = { ...ACTION_NEW_DOCUMENT, editorKey } as EditorAction;
  action.props = { content, configurationName };
  return action;
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
  canDo: (editor, action) =>
    editor.can().setMetaMapEntryText(action?.props?.text, action?.nodeOrMark?.pos),
  do: (editor, action) =>
    editor.commands.setMetaMapEntryText(
      action?.props?.text,
      action?.nodeOrMark?.pos,
    ),
};
export function actionSetMetaMapText(
  editorKey: EditorKeyType,
  nodeOrMark: SelectedNodeOrMark,
  text?: string,
  oldText?: string,
): ActionForNodeOrMark {
  const action = {
    ...ACTION_SET_META_MAP_TEXT,
    editorKey,
    nodeOrMark,
  } as ActionForNodeOrMark;
  action.props = { text, oldText };
  return action;
}

const TABLE_CELL_ALIGNMENT_ACTIONS: BaseActionForNodeOrMark[] = [];
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

const UNWRAP_BLOCKS_ACTION: BaseActionForNodeOrMark = {
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

export function actionsForNodeOrMark(
  state: EditorState,
  nodeOrMark?: SelectedNodeOrMark,
): ActionForNodeOrMark[] {
  const editorKey = editorKeyFromState(state);
  if (!editorKey || !nodeOrMark) return [];
  let actions: ActionForNodeOrMark[] = [];
  const { pos, from, to } = nodeOrMark;
  let { mark, node } = nodeOrMark;
  mark = mark && (toRaw(mark) as Mark);
  node = node && (toRaw(node) as Node);
  const isNode = !!node;
  const nodeTypeName = node?.type.name;

  // edit attributes
  const attrs = editableAttrsForNodeOrMark(node || mark);
  if (attrs.length > 0)
    actions.push({
      ...ACTION_EDIT_ATTRIBUTES,
      editorKey,
      nodeOrMark,
    } as EditorAction);

  if (isNode) {
    // select node
    const repeatChangeAction: ActionForNodeOrMark = {
      ...ACTION_REPEAT_CHANGE,
      editorKey,
      nodeOrMark,
    };
    actions.push(repeatChangeAction);
    const selectNodeAction: ActionForNodeOrMark = {
      editorKey,
      name: 'select-node',
      label: `select`,
      icon: 'mdi-select',
      canDo: (editor) => editor.can().setNodeSelection(pos),
      do: (editor) => editor.chain().setNodeSelection(pos).focus().run(),
      nodeOrMark,
    };
    actions.push(selectNodeAction);

    // copy node
    const copyNodeAction: ActionForNodeOrMark = {
      editorKey,
      name: 'copy-node',
      label: `copy`,
      icon: 'mdi-content-copy',
      canDo: (editor) => editor.can().copyAsJson(nodeOrMark!.node),
      do: (editor) => editor.commands.copyAsJson(nodeOrMark!.node),
      nodeOrMark,
    };
    actions.push(copyNodeAction);

    // delete node
    const deleteAction: ActionForNodeOrMark = {
      editorKey,
      name: 'delete-node',
      label: `delete`,
      icon: 'mdi-delete',
      canDo: (editor) => editor.can().deleteNodeAtPos(pos, { ...node } as Node),
      do: (editor) => editor.commands.deleteNodeAtPos(pos, { ...node } as Node),
      nodeOrMark,
    };
    actions.push(deleteAction);

    // duplicate node
    const duplicateAction: ActionForNodeOrMark = {
      editorKey,
      name: 'duplicate-node',
      label: 'duplicate',
      icon: 'mdi-content-duplicate',
      canDo: (editor) => editor.can().duplicateNode(pos),
      do: (editor) => editor.commands.duplicateNode(pos),
      nodeOrMark,
    }
    actions.push(duplicateAction);

    // unwrap contents
    actions.push({ editorKey, ...UNWRAP_BLOCKS_ACTION, nodeOrMark });

    // add table head or foot
    if (nodeTypeName === NODE_NAME_PANDOC_TABLE) {
      const addPandocTableCaptionAction: ActionForNodeOrMark = {
        editorKey,
        name: 'add-table-caption',
        label: `add table caption`,
        icon: 'mdi-page-layout-header',
        canDo: (editor) => editor.can().addTableCaption(),
        do: (editor) => editor.commands.addTableCaption(),
        nodeOrMark,
      };
      const addPandocTableHeadAction: ActionForNodeOrMark = {
        editorKey,
        name: 'add-table-head',
        label: `add table head`,
        icon: 'mdi-table-row-plus-before',
        canDo: (editor) => editor.can().addTableHead(),
        do: (editor) => editor.commands.addTableHead(),
        nodeOrMark,
      };
      const addPandocTableFootAction: ActionForNodeOrMark = {
        editorKey,
        name: 'add-table-foot',
        label: `add table foot`,
        icon: 'mdi-table-row-plus-after',
        canDo: (editor) => editor.can().addTableFoot(),
        do: (editor) => editor.commands.addTableFoot(),
        nodeOrMark,
      };
      actions.push(
        addPandocTableCaptionAction,
        addPandocTableHeadAction,
        addPandocTableFootAction,
      );
    }

    // add table body
    if (nodeTypeName === NODE_NAME_TABLE_BODY) {
      const prependPandocTableBodyAction: ActionForNodeOrMark = {
        editorKey,
        name: 'prepend-table-body',
        label: 'new table body before this',
        icon: 'mdi-table-row-plus-before',
        canDo: (editor) => editor.can().addTableBodyBefore(),
        do: (editor) => editor.commands.addTableBodyBefore(),
        nodeOrMark,
      };
      const appendPandocTableBodyAction: ActionForNodeOrMark = {
        editorKey,
        name: 'append-table-body',
        label: 'new table body after this',
        icon: 'mdi-table-row-plus-after',
        canDo: (editor) => editor.can().addTableBodyAfter(),
        do: (editor) => editor.commands.addTableBodyAfter(),
        nodeOrMark,
      };
      const decreasePandocTableBodyHeadRowsAction: ActionForNodeOrMark = {
        editorKey,
        name: 'decrease-table-body-header-rows',
        label: "decrease body's header rows",
        icon: 'mdi-table-row',
        iconRight: 'mdi-arrow-up',
        canDo: (editor) => editor.can().decreaseTableBodyHeaderRows(),
        do: (editor) => editor.commands.decreaseTableBodyHeaderRows(),
        nodeOrMark,
      };
      const increasePandocTableBodyHeadRowsAction: ActionForNodeOrMark = {
        editorKey,
        name: 'increase-table-body-header-rows',
        label: "increase body's header rows",
        icon: 'mdi-table-row',
        iconRight: 'mdi-arrow-down',
        canDo: (editor) => editor.can().increaseTableBodyHeaderRows(),
        do: (editor) => editor.commands.increaseTableBodyHeaderRows(),
        nodeOrMark,
      };
      const decreasePandocTableBodyHeadColsAction: ActionForNodeOrMark = {
        editorKey,
        name: 'decrease-table-body-header-columns',
        label: "decrease body's header columns",
        icon: 'mdi-table-column',
        iconRight: 'mdi-arrow-left',
        canDo: (editor) => editor.can().decreaseTableBodyHeaderColumns(),
        do: (editor) => editor.commands.decreaseTableBodyHeaderColumns(),
        nodeOrMark,
      };
      const increasePandocTableBodyHeadColsAction: ActionForNodeOrMark = {
        editorKey,
        name: 'increase-table-body-header-columns',
        label: "increase body's header columns",
        icon: 'mdi-table-column',
        iconRight: 'mdi-arrow-right',
        canDo: (editor) => editor.can().increaseTableBodyHeaderColumns(),
        do: (editor) => editor.commands.increaseTableBodyHeaderColumns(),
        nodeOrMark,
      };
      actions.push(
        prependPandocTableBodyAction,
        appendPandocTableBodyAction,
        decreasePandocTableBodyHeadRowsAction,
        increasePandocTableBodyHeadRowsAction,
        decreasePandocTableBodyHeadColsAction,
        increasePandocTableBodyHeadColsAction,
      );
    }

    // table cell alignment
    if (nodeTypeName === NODE_NAME_TABLE_CELL || nodeTypeName === NODE_NAME_TABLE_HEADER) {
      actions = actions.concat(
        TABLE_CELL_ALIGNMENT_ACTIONS.map((tcaa) => {
          return { ...tcaa, editorKey } as EditorAction;
        }),
      );
    }

    if (node!.isBlock) {
      const config = getEditorConfiguration(state);
      nodesWithTemplate().forEach((typename) => {
        actions.push(
          insertBlockAction(
            editorKey,
            `insert-${typename}-before`,
            `insert a ${nodeOrMarkToPandocName(
              typename,
              undefined,
              config,
            )} before`,
            pos,
            typename,
            'before',
          ),
        );
        actions.push(
          insertBlockAction(
            editorKey,
            `insert-${typename}-after`,
            `insert a ${nodeOrMarkToPandocName(
              typename,
              undefined,
              config,
            )} after`,
            pos,
            typename,
            'after',
          ),
        );
      });
      actions = actions.concat(moveBlockActions(editorKey, pos));
      const typename = node!.type.name;
      const compatible = compatibleNodes(typename);
      compatible.forEach((cb) => {
        actions.push(convertBlockAction(editorKey, typename, cb, pos, config));
      });
    }

    if (nodeTypeName === NODE_NAME_INDEX_DIV) {
      actions.push({
        editorKey,
        name: 'propagate-index-name',
        label: 'propagate index name to index terms',
        icon: 'mdi-book-arrow-down',
        canDo: (editor) => editor.can().propagateIndexNameToTerms(),
        do: (editor) => editor.commands.propagateIndexNameToTerms(),
        nodeOrMark,
      });
    }

    // if (nodeTypeName === NODE_NAME_META_MAP) {
    //   actions.push({
    //     name: 'edit-meta-map-text',
    //     label: 'edit MetaMap text',
    //     canDo: (editor, action, props) => editor.can().setMetaMapText(props?.text),
    //     do: (editor, action, props) => editor.commands.setMetaMapText(props?.text),
    //     nodeOrMark,
    //   })
    // }
  } else if (mark) {
    // it's a Mark

    // select mark range
    const selectMarkRangeAction: ActionForNodeOrMark = {
      editorKey,
      name: 'select-mark-range',
      label: `select`,
      icon: 'mdi-select',
      canDo: (editor) => editor.can().setTextSelectionRange(from, to),
      do: (editor) =>
        editor.chain().setTextSelectionRange(from, to).focus().run(),
      nodeOrMark,
    };
    actions.push(selectMarkRangeAction);

    // remove mark
    const removeMarkAction: ActionForNodeOrMark = {
      editorKey,
      name: 'remove-mark',
      label: `remove ${mark?.type.name}`,
      icon: 'mdi-tag-remove',
      canDo: (editor) => editor.can().removeMark(from, to, mark),
      do: (editor) => editor.commands.removeMark(from, to, mark),
      nodeOrMark,
      restoreSelection: true,
    };
    actions.push(removeMarkAction);
  }

  return actions;
}

function insertBlockAction(
  editorKey: EditorKeyType,
  name: string,
  label: string,
  pos: number,
  nodetypename: string,
  where: 'before' | 'after',
): ActionForNodeOrMark {
  const isBefore = where === 'before';
  const icon = nodeIcon(nodetypename);
  const beforeGroup = { ...insertBeforeGroup, editorKey } as ActionsGroup;
  const afterGroup = { ...insertAfterGroup, editorKey } as ActionsGroup;
  return {
    editorKey,
    name,
    label,
    icon: isBefore ? icon : 'mdi-square-rounded',
    iconRight: isBefore ? 'mdi-square-rounded' : icon,
    group: isBefore ? beforeGroup : afterGroup,
    canDo: (editor) => {
      try {
        const state = editor.state;
        const $pos = state.doc.resolve(pos);
        let parentPos = $pos.start() - 1;
        const index = $pos.index() + (where === 'after' ? 1 : 0);
        const config = getEditorConfiguration(state);
        const template = templateNode(state.schema, nodetypename, config, {
          state,
          pos,
          $pos,
        });
        if (template) {
          const { node: block, attrs } = template;
          return editor
            .can()
            .insertChildToNodeAtPos(parentPos, block, index, attrs);
        }
      } catch (err) {
        console.log(err);
      }
      return false;
    },
    do: (editor, action) => {
      try {
        const state = editor.state;
        const $pos = state.doc.resolve(pos);
        const parentPos = $pos.start() - 1;
        const index = $pos.index() + (where === 'after' ? 1 : 0);
        const config = getEditorConfiguration(state);
        const template = templateNode(state.schema, nodetypename, config, {
          state,
          pos,
          $pos,
        });
        if (template) {
          const { node: block, attrs } = template;
          return editor.commands.insertChildToNodeAtPos(
            parentPos,
            block,
            index,
            attrs,
          );
        }
      } catch (err) {
        console.log(err);
      }
      return false;
    },
  };
}

function convertBlockAction(
  editorKey: EditorKeyType,
  fromTypeName: string,
  toTypeName: string,
  pos: number,
  config?: PundokEditorConfig,
): ActionForNodeOrMark {
  const convertGroup = { ...convertBlockGroup, editorKey } as ActionsGroup;
  return {
    editorKey,
    name: `convert-${fromTypeName}-to-${toTypeName}`,
    label: `convert ${nodeOrMarkToPandocName(
      fromTypeName,
      undefined,
      config,
    )} to ${nodeOrMarkToPandocName(toTypeName, undefined, config)}`,
    icon: 'mdi-swap-horizontal',
    iconRight: nodeIcon(toTypeName),
    group: convertGroup,
    canDo: (editor) => editor.can().convertNode(toTypeName, pos),
    do: (editor, action) => editor.commands.convertNode(toTypeName, pos),
  };
}

function moveBlockActions(
  editorKey: EditorKeyType,
  pos: number,
): ActionForNodeOrMark[] {
  const moveGroup = { ...moveBlockGroup, editorKey } as ActionsGroup;
  return [
    {
      editorKey,
      name: 'move-before-first-sibling',
      label: 'move before any sibling',
      icon: 'mdi-arrow-collapse-up',
      group: moveGroup,
      canDo: (editor) => editor.can().moveChild('start', pos),
      do: (editor, action) => editor.commands.moveChild('start', pos),
    },
    {
      editorKey,
      name: 'move-before-previous-sibling',
      label: 'move before previous sibling',
      icon: 'mdi-arrow-up',
      group: moveGroup,
      canDo: (editor) => editor.can().moveChild('up', pos),
      do: (editor, action) => editor.commands.moveChild('up', pos),
    },
    {
      editorKey,
      name: 'move-after-next-sibling',
      label: 'move after next sibling',
      icon: 'mdi-arrow-down',
      group: moveGroup,
      canDo: (editor) => editor.can().moveChild('down', pos),
      do: (editor, action) => editor.commands.moveChild('down', pos),
    },
    {
      editorKey,
      name: 'move-after-last-sibling',
      label: 'move after any sibling',
      icon: 'mdi-arrow-collapse-down',
      group: moveGroup,
      canDo: (editor) => editor.can().moveChild('end', pos),
      do: (editor, action) => editor.commands.moveChild('end', pos),
    },
    {
      editorKey,
      name: 'move-inside-prev-sibling',
      label: 'move inside previous sibling',
      icon: 'mdi-arrow-top-right',
      group: moveGroup,
      canDo: (editor) => editor.can().moveChild('up-inside', pos),
      do: (editor, action) => editor.commands.moveChild('up-inside', pos),
    },
    {
      editorKey,
      name: 'move-inside-next-sibling',
      label: 'move inside next sibling',
      icon: 'mdi-arrow-bottom-right',
      group: moveGroup,
      canDo: (editor) => editor.can().moveChild('down-inside', pos),
      do: (editor, action) => editor.commands.moveChild('down-inside', pos),
    },
  ];
}
