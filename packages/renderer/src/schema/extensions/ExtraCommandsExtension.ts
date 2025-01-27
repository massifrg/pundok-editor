import { Extension } from '@tiptap/core';
import { Attrs, MarkType, Node as ProsemirrorNode } from '@tiptap/pm/model';
import { isString } from 'lodash';
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
  SK_DUPLICATE_NODE,
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
      setMarkNoAtoms:
        (
          mark: MarkType | string,
          attrs: Attrs | null = null,
          options?: ChangeMarkOptions
        ) =>
          ({ state, dispatch }) => {
            const markType: MarkType = isString(mark)
              ? state.schema.marks[mark]
              : mark;
            if (!markType) return false;
            const opts = options || { excludeNonLeafAtoms: 'only-content' };
            return setMarkNoAtoms(markType, attrs, opts)(state, dispatch);
          },
      unsetMarkNoAtoms:
        (mark: MarkType | string, options?: ChangeMarkOptions) =>
          ({ state, dispatch }) => {
            const markType: MarkType = isString(mark)
              ? state.schema.marks[mark]
              : mark;
            if (!markType) return false;
            const opts = options || { excludeNonLeafAtoms: 'only-content' };
            return unsetMarkNoAtoms(markType, opts)(state, dispatch);
          },
      toggleMarkNoAtoms:
        (
          mark: MarkType | string,
          attrs: Attrs | null = null,
          options?: ChangeMarkOptions
        ) =>
          ({ state, dispatch }) => {
            const markType: MarkType = isString(mark)
              ? state.schema.marks[mark]
              : mark;
            if (!markType) return false;
            const opts = options || {
              removeWhenPresent: false,
              excludeNonLeafAtoms: 'only-content',
            };
            return toggleMarkNoAtoms(markType, attrs, opts)(state, dispatch);
          },
      duplicateNode: (pos?: number) => ({ dispatch, state, tr }) => {
        let node: ProsemirrorNode | null
        let insertPos: number
        const { doc, selection } = state
        if (pos) {
          node = doc.nodeAt(pos)
          if (!node || !isNodeDuplicable(node)) return false
          insertPos = pos + node.nodeSize
        } else {
          const $anchor = selection.$anchor
          let depth = $anchor.depth
          node = $anchor.node(depth)
          while (depth > 0 && !isNodeDuplicable(node)) depth--
          insertPos = $anchor.end(depth) + 1
        }
        if (!node) return false
        if (dispatch) {
          const duplicate = node.type.createAndFill(node.attrs, node.content)
          if (!duplicate) return false
          tr.insert(insertPos, duplicate)
        }
        return true
      }
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_DUPLICATE_NODE]: () => this.editor.commands.duplicateNode()
    }
  }
});

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