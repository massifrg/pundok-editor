import { Extension } from '@tiptap/core';
import { asTiptapCommand, SelectedNodeOrMark } from '../helpers';
import { Attrs, MarkType, Node as ProsemirrorNode } from '@tiptap/pm/model';
import { NodeSelection, TextSelection, type Command } from '@tiptap/pm/state';
import { isString } from 'lodash-es';
import { ChangeMarkOptions } from '../helpers';
import {
  setMarkNoAtoms,
  toggleMarkNoAtoms,
  unsetMarkNoAtoms,
} from '../../commands';
import {
  ActionNameWithProps,
  NODE_NAME_AUTO_DELIMITER,
  NODE_NAME_CAPTION,
  NODE_NAME_DEFINITION_TERM,
  NODE_NAME_META_MAP_ENTRY,
  NODE_NAME_METADATA,
  NODE_NAME_PANDOC,
  NODE_NAME_SHORT_CAPTION,
  SK,
  TABLE_ROLE_CELL,
  TABLE_ROLE_FOOT,
  TABLE_ROLE_HEAD,
  TABLE_ROLE_HEADER_CELL,
  AddRemoveRenameClassActionProps,
  AddRemoveCustomClassActionProps,
  AddRemoveCustomStyleActionProps,
  AddRemoveMarkActionProps,
  InsertRawInlineActionProps,
  MARK_NAME_SPAN,
  SetIndexRefActionProps,
  SetSpanActionProps,
  AddRemoveRenameAttributeActionProps,
  NODE_NAME_PARAGRAPH
} from '../../common';
import {
  ACTION_ADD_ATTRIBUTE,
  ACTION_ADD_CLASS,
  ACTION_ADD_CUSTOM_CLASS,
  ACTION_ADD_CUSTOM_STYLE,
  ACTION_ADD_MARK,
  ACTION_DELETE_CSS_SELECTED,
  ACTION_INSERT_RAW_INLINE,
  ACTION_LOWERCASE,
  ACTION_REMOVE_ATTRIBUTE,
  ACTION_REMOVE_CLASS,
  ACTION_REMOVE_CUSTOM_CLASS,
  ACTION_REMOVE_CUSTOM_STYLE,
  ACTION_REMOVE_MARK,
  ACTION_RENAME_ATTRIBUTE,
  ACTION_RENAME_CLASS,
  ACTION_SET_INDEX_REF,
  ACTION_SET_SPAN,
  ACTION_UNWRAP_CSS_SELECTED,
  ACTION_UPPERCASE,
  ACTION_UPPERCASE_FIRST,
} from '../../actions';
import { setIndexRefCommand } from './IndexingExtension';
import { insertRawInlineCommand } from '../nodes/RawInline';
import { deleteCssSelectedCommand, unwrapCssSelectedCommand } from './CssSelectionExtension';
import {
  addPandocAttrClassCommand,
  addPandocAttributeCommand,
  removePandocAttrClassCommand,
  removePandocAttributeCommand,
  renamePandocAttrClassCommand,
  renamePandocAttributeCommand
} from './HelperCommandsExtension';
import { applyTextTransformsCommand, CapitalizeTransform, MarkTransform } from './TextTransformExtension';


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    extraCommands: {
      /**
       * Add a Mark without entering atoms with inlineContent (e.g. footnotes).
       */
      setMarkNoAtoms: (
        markType: MarkType | string,
        attrs?: Attrs | null,
        options?: ChangeMarkOptions
      ) => ReturnType;
      /**
       * Remove a Mark without entering atoms with inlineContent (e.g. footnotes).
       */
      unsetMarkNoAtoms: (
        markType: MarkType | string,
        options?: ChangeMarkOptions
      ) => ReturnType;
      /**
       * Toggle a Mark without entering atoms with inlineContent (e.g. footnotes).
       */
      toggleMarkNoAtoms: (
        markType: MarkType | string,
        attrs?: Attrs | null,
        options?: ChangeMarkOptions
      ) => ReturnType;
      /**
       * Duplicate a node.
       */
      duplicateNode: (pos?: number) => ReturnType;
      /**
       * Apply actions to the current selected Node or Mark
       * @param actions
       * @param selectedNodeOrMark 
       */
      applyActions: (
        actions: ActionNameWithProps[],
        selectedNodeOrMark?: SelectedNodeOrMark
      ) => ReturnType;
    };
  }
}

export const ExtraCommandsExtension = Extension.create({
  name: 'extraCommands',

  addCommands() {
    return {
      setMarkNoAtoms: (mark, attrs, options) =>
        asTiptapCommand(setMarkNoAtomsCommand(mark, attrs, options)),
      unsetMarkNoAtoms: (mark, options) =>
        asTiptapCommand(unsetMarkNoAtomsCommand(mark, options)),
      toggleMarkNoAtoms:
        (
          mark: MarkType | string,
          attrs: Attrs | null = null,
          options?: ChangeMarkOptions
        ) =>
          asTiptapCommand(toggleMarkNoAtomsCommand(mark, attrs, options)),
      duplicateNode: (pos?: number) => asTiptapCommand(duplicateNodeCommand(pos)),
      applyActions:
        (actions: ActionNameWithProps[], selectedNodeOrMark) =>
          ({ state, dispatch, view }) => applyActions(actions, selectedNodeOrMark)(state, dispatch, view),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.DUPLICATE_NODE]: () => this.editor.commands.duplicateNode()
    }
  }
});

const setMarkNoAtomsCommand = (
  mark: MarkType | string,
  attrs: Attrs | null = null,
  options?: ChangeMarkOptions,
): Command => (state, dispatch) => {
  const markType: MarkType = isString(mark) ? state.schema.marks[mark] : mark;
  if (!markType) return false;
  return setMarkNoAtoms(markType, attrs, options || { excludeNonLeafAtoms: 'only-content' })(state, dispatch);
};

const unsetMarkNoAtomsCommand = (
  mark: MarkType | string,
  options?: ChangeMarkOptions,
): Command => (state, dispatch) => {
  const markType: MarkType = isString(mark) ? state.schema.marks[mark] : mark;
  if (!markType) return false;
  return unsetMarkNoAtoms(markType, options || { excludeNonLeafAtoms: 'only-content' })(state, dispatch);
};

const toggleMarkNoAtomsCommand = (
  mark: MarkType | string,
  attrs: Attrs | null = null,
  options?: ChangeMarkOptions,
): Command => (state, dispatch) => {
  const markType: MarkType = isString(mark) ? state.schema.marks[mark] : mark;
  if (!markType) return false;
  return toggleMarkNoAtoms(markType, attrs, options || {
    removeWhenPresent: false,
    excludeNonLeafAtoms: 'only-content',
  })(state, dispatch);
};

const duplicateNodeCommand = (pos?: number): Command => (state, dispatch) => {
  const tr = state.tr;
  let node: ProsemirrorNode | null;
  let insertPos: number;
  const { doc, selection } = state;
  if (pos) {
    node = doc.nodeAt(pos);
    if (!node || !isNodeDuplicable(node)) return false;
    insertPos = pos + node.nodeSize;
  } else {
    const $anchor = selection.$anchor;
    let depth = $anchor.depth;
    node = $anchor.node(depth);
    while (depth > 0 && !isNodeDuplicable(node)) depth--;
    insertPos = $anchor.end(depth) + 1;
  }
  if (!node) return false;
  if (dispatch) {
    const duplicate = node.type.createAndFill(node.attrs, node.content);
    if (!duplicate) return false;
    tr.insert(insertPos, duplicate);
    dispatch(tr);
  }
  return true;
};

function isNodeDuplicable(node: ProsemirrorNode): boolean {
  if (!node) return false
  if (node.isText) return false
  const nodeType = node.type
  const role = nodeType.spec.tableRole
  if (role === TABLE_ROLE_HEAD
    || role === TABLE_ROLE_FOOT
    || role === TABLE_ROLE_CELL
    || role === TABLE_ROLE_HEADER_CELL)
    return false
  const name = nodeType.name
  if (name === NODE_NAME_CAPTION
    || name === NODE_NAME_SHORT_CAPTION
    || name === NODE_NAME_AUTO_DELIMITER
    || name === NODE_NAME_DEFINITION_TERM
    || name === NODE_NAME_METADATA
    || name === NODE_NAME_META_MAP_ENTRY
    || name === NODE_NAME_PANDOC
  ) return false
  return true
}

function actionNameWithPropsToCommand(
  action: ActionNameWithProps,
  selectedNodeOrMark?: SelectedNodeOrMark,
): Command {
  const { name, props } = action
  const typeName = (selectedNodeOrMark?.node || selectedNodeOrMark?.mark)?.type.name
  switch (name) {
    case ACTION_ADD_MARK.name:
    case ACTION_REMOVE_MARK.name:
      {
        const { markType, attrs } = (props || {}) as AddRemoveMarkActionProps
        return applyTextTransformsCommand([{
          type: ACTION_ADD_MARK.name === name ? 'add-mark' : 'remove-mark',
          mark: markType,
          attrs: attrs
        } as MarkTransform])
      }
      break
    case ACTION_ADD_CUSTOM_STYLE.name:
    case ACTION_REMOVE_CUSTOM_STYLE.name:
      return (state, dispatch, view) => {
        const selection = state.selection
        if (selection.empty) return false
        const { styleName } = (props || {}) as AddRemoveCustomStyleActionProps
        const attrs: Record<string, any> = {
          customStyle: styleName,
          kv: {
            'custom-style': styleName,
          }
        }
        if (selection instanceof NodeSelection && selectedNodeOrMark?.node) {
          if (dispatch) {
            const { from, node } = selection
            let newAttrs = { ...node.attrs }
            if (name === ACTION_REMOVE_CUSTOM_STYLE.name) {
              delete newAttrs.customStyle
              delete newAttrs.kv['custom-style']
            } else {
              newAttrs = { newAttrs, ...attrs }
              if (node.type.name === NODE_NAME_PARAGRAPH)
                delete newAttrs.kv
            }
            dispatch(state.tr.setNodeMarkup(from, null, newAttrs))
          }
          return true
        } else if (selection instanceof TextSelection) {
          return applyTextTransformsCommand([{
            type: ACTION_ADD_CUSTOM_STYLE.name === name ? 'add-mark' : 'remove-mark',
            mark: MARK_NAME_SPAN,
            attrs
          } as MarkTransform])(state, dispatch, view)
        }
        return false
      }
      break
    case ACTION_LOWERCASE.name:
      return applyTextTransformsCommand([{ type: 'lowercase' } as CapitalizeTransform])
    case ACTION_UPPERCASE.name:
      return applyTextTransformsCommand([{ type: 'uppercase' } as CapitalizeTransform])
    case ACTION_UPPERCASE_FIRST.name:
      return applyTextTransformsCommand([{ type: 'uppercase-first' } as CapitalizeTransform])
    case ACTION_SET_SPAN.name:
      {
        const { classes, attrs } = (props || {}) as SetSpanActionProps
        return applyTextTransformsCommand([{
          type: 'add-mark',
          mark: MARK_NAME_SPAN,
          attrs: { classes, kv: attrs }
        } as MarkTransform])
      }
      break
    case ACTION_SET_INDEX_REF.name:
      {
        const { indexName } = (props || {}) as SetIndexRefActionProps
        return setIndexRefCommand(indexName)
      }
      break
    case ACTION_INSERT_RAW_INLINE.name:
      {
        const { format, where, content } = (props || {}) as InsertRawInlineActionProps
        const isSingleAfter = where === 'after' && isString(content)
        return insertRawInlineCommand(format, isSingleAfter ? ['', content] : content)
      }
      break
    case ACTION_DELETE_CSS_SELECTED.name:
      return deleteCssSelectedCommand;
    case ACTION_UNWRAP_CSS_SELECTED.name:
      return unwrapCssSelectedCommand;
    case ACTION_ADD_CUSTOM_CLASS.name:
      return addPandocAttrClassCommand((props as AddRemoveCustomClassActionProps).className, typeName)
    case ACTION_REMOVE_CUSTOM_CLASS.name:
      return removePandocAttrClassCommand((props as AddRemoveCustomClassActionProps).className, typeName)
    case ACTION_ADD_CLASS.name:
      return addPandocAttrClassCommand((props as AddRemoveRenameClassActionProps).className, typeName)
    case ACTION_REMOVE_CLASS.name:
      return removePandocAttrClassCommand((props as AddRemoveRenameClassActionProps).className, typeName)
    case ACTION_RENAME_CLASS.name:
      return renamePandocAttrClassCommand(
        (props as AddRemoveRenameClassActionProps).className,
        (props as AddRemoveRenameClassActionProps).newName,
        typeName
      )
    case ACTION_ADD_ATTRIBUTE.name:
      return addPandocAttributeCommand(
        (props as AddRemoveRenameAttributeActionProps).attrName,
        (props as AddRemoveRenameAttributeActionProps).attrValue,
        typeName
      )
    case ACTION_REMOVE_ATTRIBUTE.name:
      return removePandocAttributeCommand((props as AddRemoveRenameAttributeActionProps).attrName, typeName)
    case ACTION_RENAME_ATTRIBUTE.name:
      return renamePandocAttributeCommand(
        (props as AddRemoveRenameAttributeActionProps).attrName,
        (props as AddRemoveRenameAttributeActionProps).newName,
        typeName
      )
    default:
      // pass-through command
      return () => true
  }
}

const applyActions: (
  actions: ActionNameWithProps[],
  selectedNodeOrMark?: SelectedNodeOrMark,
) => Command =
  (actions: ActionNameWithProps[], selectedNodeOrMark) => {
    const commands = actions.map(a => actionNameWithPropsToCommand(a, selectedNodeOrMark))
    return (state, dispatch, view) => {
      return commands.every(cmd => cmd(state, dispatch, view))
    }
  }
