import { Attrs, MarkType } from '@tiptap/pm/model';
import { Command, TextSelection } from '@tiptap/pm/state';
import {
  ChangeMarkOptions,
  selectedRangesWithoutAtoms,
} from '../schema/helpers';

export function setMarkNoAtoms(
  markType: MarkType,
  attrs: Attrs | null = null,
  options?: ChangeMarkOptions
): Command {
  return function (state, dispatch) {
    if (!markType) return false;
    let { ranges } = state.selection as TextSelection;
    if (dispatch) {
      let tr = state.tr;
      const excludeNonLeafAtoms = options?.excludeNonLeafAtoms;
      const sranges = excludeNonLeafAtoms
        ? selectedRangesWithoutAtoms(state)
        : ranges;
      const excludeAtomsContent = excludeNonLeafAtoms === 'only-content';
      for (let i = 0; i < sranges.length; i++) {
        let { $from, $to } = sranges[i];
        const mark = markType.create(attrs);
        let from = $from.pos,
          to = $to.pos;
        if (!options?.includeSpaces) {
          let start = $from.nodeAfter,
            end = $to.nodeBefore;
          let spaceStart =
            start && start.isText ? /^\s*/.exec(start.text!)![0].length : 0;
          let spaceEnd =
            end && end.isText ? /\s*$/.exec(end.text!)![0].length : 0;
          if (from + spaceStart < to) {
            from += spaceStart;
            to -= spaceEnd;
          }
        }
        tr.addMark(from, to, mark!);
        if (excludeAtomsContent) {
          const toNode =
            i < sranges.length - 1 ? state.doc.nodeAt($to.pos) : null;
          const toNodeIsNonLeafAtom = toNode && toNode.isAtom && !toNode.isLeaf;
          if (toNodeIsNonLeafAtom) tr.addNodeMark($to.pos, mark!);
        }
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}
