import { Attrs, MarkType } from '@tiptap/pm/model';
import { Command, TextSelection } from '@tiptap/pm/state';
import { getMarkRange } from '@tiptap/core';
import {
  ChangeMarkOptions,
  markApplies,
  selectedRangesWithoutAtoms,
} from '../schema/helpers';

export function toggleMarkNoAtoms(
  markType: MarkType,
  attrs: Attrs | null = null,
  options?: ChangeMarkOptions
): Command {
  let removeWhenPresent = (options && options.removeWhenPresent) !== false;
  return function (state, dispatch) {
    if (!markType) return false;
    let { empty, $cursor, ranges } = state.selection as TextSelection;
    if ((empty && !$cursor) || !markApplies(state.doc, ranges, markType))
      return false;
    if (dispatch) {
      if ($cursor) {
        if (markType.isInSet(state.storedMarks || $cursor.marks())) {
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
        } else dispatch(state.tr.addStoredMark(markType.create(attrs)));
      } else {
        let add,
          tr = state.tr;
        if (removeWhenPresent) {
          add = !ranges.some((r) =>
            state.doc.rangeHasMark(r.$from.pos, r.$to.pos, markType)
          );
        } else {
          add = !ranges.every((r) => {
            let missing = false;
            tr.doc.nodesBetween(r.$from.pos, r.$to.pos, (node, pos, parent) => {
              if (missing) return false;
              missing =
                !markType.isInSet(node.marks) &&
                !!parent &&
                parent.type.allowsMarkType(markType) &&
                !(
                  node.isText &&
                  /^\s*$/.test(
                    node.textBetween(
                      Math.max(0, r.$from.pos - pos),
                      Math.min(node.nodeSize, r.$to.pos - pos)
                    )
                  )
                );
            });
            return !missing;
          });
        }

        let sranges = ranges;
        const excludeNonLeafAtoms = options?.excludeNonLeafAtoms;
        if (excludeNonLeafAtoms) sranges = selectedRangesWithoutAtoms(state);
        const excludeAtomsContent = excludeNonLeafAtoms === 'only-content';
        for (let i = 0; i < sranges.length; i++) {
          let { $from, $to } = sranges[i];
          const mark = (add && markType.create(attrs)) || null;
          if (!add) {
            tr.removeMark($from.pos, $to.pos, markType);
          } else {
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
          }
          if (excludeAtomsContent) {
            const toNode =
              i < sranges.length - 1 ? state.doc.nodeAt($to.pos) : null;
            const toNodeIsNonLeafAtom =
              toNode && toNode.isAtom && !toNode.isLeaf;
            if (toNodeIsNonLeafAtom) {
              if (!add) tr.removeNodeMark($to.pos, markType);
              else tr.addNodeMark($to.pos, mark!);
            }
          }
        }
        dispatch(tr.scrollIntoView());
      }
    }
    return true;
  };
}
