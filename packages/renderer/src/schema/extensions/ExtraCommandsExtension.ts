import { Extension } from '@tiptap/core';
import { asTiptapCommand } from '../helpers/command';
import { Attrs, MarkType, Node as ProsemirrorNode } from '@tiptap/pm/model';
import type { Command } from '@tiptap/pm/state';
import { isString } from 'lodash-es';
import { ChangeMarkOptions } from '../helpers';
import {
  setMarkNoAtoms,
  toggleMarkNoAtoms,
  unsetMarkNoAtoms,
} from '../../commands';
import {
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
  TABLE_ROLE_HEADER_CELL
} from '../../common';

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