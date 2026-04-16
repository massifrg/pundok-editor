import { Mark, Node } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { editableAttrsForNodeOrMark } from '../schema/helpers/attributes';
import {
  editorKeyFromState,
  getEditorConfiguration,
  INCLUDE_DOC_CLASS,
  INCLUDE_FORMAT_ATTR,
  INCLUDE_SRC_ATTR,
} from '../schema';
import { nodeOrMarkToPandocName } from '../schema/helpers/PandocVsProsemirror';
import { nodesWithTemplate, compatibleNodes, SelectedNodeOrMark } from '../schema/helpers';
import {
  DocumentContext,
  DocumentOpenActionProps,
  InputConverter,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_INDEX_TERM,
  NODE_NAME_PANDOC_TABLE,
  NODE_NAME_TABLE_BODY,
  NODE_NAME_TABLE_CELL,
  NODE_NAME_TABLE_HEADER,
  pandocFormatsFromExtension,
} from '../common';
import { toRaw } from 'vue';
import {
  ACTION_AUTO_SET_INDEX_TERM_ID,
  ACTION_DOCUMENT_OPEN,
  ACTION_EDIT_ATTRIBUTES,
  ACTION_REPEAT_CHANGE,
  ActionForNodeOrMark,
  ActionName,
  BaseEditorAction,
  EditorAction,
  TABLE_CELL_ALIGNMENT_ACTIONS,
  UNWRAP_BLOCKS_ACTION
} from './actions';
import {
  convertBlockAction,
  insertBlockAction,
  moveBlockActions
} from './actionGroup';
import { setActionCommand } from './actionCommands';

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
            `insert-${typename}-before` as ActionName,
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
            `insert-${typename}-after` as ActionName,
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
    } else if (nodeTypeName === NODE_NAME_INDEX_TERM) {
      actions.push({
        ...ACTION_AUTO_SET_INDEX_TERM_ID,
        editorKey,
        nodeOrMark,
      })
    }

    if (node?.attrs.classes?.includes(INCLUDE_DOC_CLASS)) {
      const id = node?.attrs.id
      const path = node?.attrs.kv[INCLUDE_SRC_ATTR]
      const format = node?.attrs.kv[INCLUDE_FORMAT_ATTR]
        || (path && pandocFormatsFromExtension(path, 'input')[0])
        || 'json'
      console.log(`id=${id}, path=${path}, format=${format}`)
      const props = {
        context: {
          id,
          path,
          inputConverter: {
            type: 'pandoc',
            format,
          } as InputConverter
        } as DocumentContext
      } as DocumentOpenActionProps
      if ((id || path) && format) {
        actions.push({
          ...ACTION_DOCUMENT_OPEN,
          canDo: (editor) => editorKeyFromState(editor?.state) == editorKey,
          do: (editor, a) => {
            setActionCommand(editorKey, a as BaseEditorAction, props)
            return true
          },
          props,
          editorKey
        })
      }
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
