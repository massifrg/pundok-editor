import { Extension } from '@tiptap/core';
import { Attrs, MarkType } from '@tiptap/pm/model';
import { isString } from 'lodash';
import { ChangeMarkOptions } from '../helpers';
import {
  setMarkNoAtoms,
  toggleMarkNoAtoms,
  unsetMarkNoAtoms,
} from '../../commands';

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
    };
  },
});
