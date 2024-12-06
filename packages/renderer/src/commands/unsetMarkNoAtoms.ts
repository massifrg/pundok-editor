import { MarkType } from '@tiptap/pm/model';
import { Command, TextSelection } from '@tiptap/pm/state';
import { getMarkRange } from '@tiptap/core';
import {
  ChangeMarkOptions,
  markApplies,
  selectedRangesWithoutAtoms,
} from '../schema/helpers';

export function unsetMarkNoAtoms(
  markType: MarkType,
  options?: ChangeMarkOptions
): Command {
  return function (state, dispatch) {
    if (!markType) return false;
    let { empty, $cursor, ranges } = state.selection as TextSelection;
    if ((empty && !$cursor) || !markApplies(state.doc, ranges, markType))
      return false;
    if (dispatch) {
      if ($cursor) {
        if (options?.extendEmptyMarkRange) {
          let { $from, from, to } = state.selection;
          const attrs = $from
            .marks()
            .find((mark) => mark.type === markType)?.attrs;
          const range = getMarkRange($from, markType, attrs);
          if (range) {
            from = range.from;
            to = range.to;
          }
          dispatch(state.tr.removeMark(from, to, markType));
        } else {
          dispatch(state.tr.removeStoredMark(markType));
        }
      } else {
        let tr = state.tr;
        const excludeNonLeafAtoms = options?.excludeNonLeafAtoms;
        const sranges = excludeNonLeafAtoms
          ? selectedRangesWithoutAtoms(state)
          : ranges;
        const excludeAtomsContent = excludeNonLeafAtoms === 'only-content';
        for (let i = 0; i < sranges.length; i++) {
          let { $from, $to } = sranges[i];
          tr.removeMark($from.pos, $to.pos, markType);
          if (excludeAtomsContent) {
            const toNode =
              i < sranges.length - 1 ? state.doc.nodeAt($to.pos) : null;
            const toNodeIsNonLeafAtom =
              toNode && toNode.isAtom && !toNode.isLeaf;
            if (toNodeIsNonLeafAtom) tr.removeNodeMark($to.pos, markType);
          }
        }
        dispatch(tr.scrollIntoView());
      }
    }
    return true;
  };
}
