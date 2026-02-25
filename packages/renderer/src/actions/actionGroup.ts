import { getEditorConfiguration } from '../schema';
import { nodeOrMarkToPandocName } from '../schema/helpers/PandocVsProsemirror';
import { nodeIcon, templateNode } from '../schema/helpers';
import { EditorKeyType, PundokEditorConfig } from '../common';
import { ActionCore, ActionForNodeOrMark, ActionName, BaseEditorAction, TooltipForAction } from './actions';

/** Allowed names for Actions' groups */
type ActionGroupName =
  | 'insert-before'
  | 'insert-after'
  | 'convert-block'
  | 'move-block'

/** Useful to group actions in sub menus (not linked to an editor instance) */
type BaseActionsGroup = ActionCore & {
  name: ActionGroupName,
  tooltip?: TooltipForAction,
}

/** Actions group that is relevant only to the editor with that editorKey */
export interface ActionsGroup extends BaseActionsGroup {
  editorKey: EditorKeyType;
}

const ACTION_GROUP_INSERT_BEFORE: BaseActionsGroup = {
  name: 'insert-before',
  label: 'insert before...',
  icon: 'mdi-select-place',
  iconRight: 'mdi-square-rounded',
  tooltip: 'insert an element before this one'
};

const ACTION_GROUP_INSERT_AFTER: BaseActionsGroup = {
  name: 'insert-after',
  label: 'insert after...',
  icon: 'mdi-square-rounded',
  iconRight: 'mdi-select-place',
  tooltip: 'insert an element after this one'
};

const ACTION_GROUP_CONVERT_BLOCK: BaseActionsGroup = {
  name: 'convert-block',
  label: 'convert block...',
  icon: 'mdi-swap-horizontal',
  tooltip: 'convert this Block into a compatible one'
};

const ACTION_GROUP_MOVE_BLOCK: BaseActionsGroup = {
  name: 'move-block',
  label: 'move block...',
  icon: 'mdi-select-place',
  iconRight: 'mdi-swap-vertical',
  tooltip: 'move this Block up, down, up & inside or down & inside'
};

export function insertBlockAction(
  editorKey: EditorKeyType,
  name: ActionName,
  label: string,
  pos: number,
  nodetypename: string,
  where: 'before' | 'after',
): ActionForNodeOrMark {
  const isBefore = where === 'before';
  const icon = nodeIcon(nodetypename);
  const beforeGroup = { ...ACTION_GROUP_INSERT_BEFORE, editorKey } as ActionsGroup;
  const afterGroup = { ...ACTION_GROUP_INSERT_AFTER, editorKey } as ActionsGroup;
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

export function convertBlockAction(
  editorKey: EditorKeyType,
  fromTypeName: string,
  toTypeName: string,
  pos: number,
  config?: PundokEditorConfig,
): ActionForNodeOrMark {
  const convertGroup = { ...ACTION_GROUP_CONVERT_BLOCK, editorKey } as ActionsGroup;
  return {
    editorKey,
    name: `convert-${fromTypeName}-to-${toTypeName}` as ActionName,
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

export function moveBlockActions(
  editorKey: EditorKeyType,
  pos: number,
): ActionForNodeOrMark[] {
  const moveGroup = { ...ACTION_GROUP_MOVE_BLOCK, editorKey } as ActionsGroup;
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
