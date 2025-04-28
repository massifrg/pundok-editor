import {
  Attrs,
  Mark,
  MarkType,
  Node as ProsemirrorNode,
  Schema,
} from '@tiptap/pm/model';
import { EditorState, SelectionRange } from '@tiptap/pm/state';
import { difference } from 'lodash';
import {
  MARK_NAME_EMPH,
  MARK_NAME_LINK,
  MARK_NAME_SPAN,
  MARK_NAME_STRONG
} from '../../common';

/**
 * Options to add/remove Marks.
 */
export interface ChangeMarkOptions {
  /**
   * Controls whether, when part of the selected range has the mark
   * already and part doesn't, the mark is removed (`true`, the
   * default) or added (`false`).
   */
  removeWhenPresent?: boolean;
  /**
   * Ignore non-leaf atoms, or only their content.
   */
  excludeNonLeafAtoms?: 'whole' | 'only-content';
  /**
   * Include also the spaces at the start and at the end of the selected text.
   */
  includeSpaces?: boolean;
  /**
   * Remove the mark even across the current selection.
   */
  extendEmptyMarkRange?: boolean;
}

/**
 * Checks whether a MarkType can be applied to one or more ranges.
 * @param doc
 * @param ranges
 * @param type
 * @returns
 */
export function markApplies(
  doc: ProsemirrorNode,
  ranges: readonly SelectionRange[],
  type: MarkType,
) {
  for (let i = 0; i < ranges.length; i++) {
    let { $from, $to } = ranges[i];
    let can =
      $from.depth == 0
        ? doc.inlineContent && doc.type.allowsMarkType(type)
        : false;
    doc.nodesBetween($from.pos, $to.pos, (node) => {
      if (can) return false;
      can = node.inlineContent && node.type.allowsMarkType(type);
    });
    if (can) return true;
  }
  return false;
}

/**
 * From the current selection, "unselect" the ranges of non-leaf atoms (e.g. footnotes).
 * @param state the current editor state.
 * @param onlyAtomsContent "unselect" only the contents of non-leaf atoms nodes, not the nodes themselves.
 * @returns the ranges corresponding to the current selection without non-leaf atoms.
 */
export function selectedRangesWithoutAtoms(
  state: EditorState,
): readonly SelectionRange[] {
  const { doc, selection } = state;
  const { from, to, $from, ranges } = selection;
  let withoutAtoms: readonly SelectionRange[] = ranges;
  const depth = $from.sharedDepth(to);
  const shared = $from.node(depth);
  if (shared) {
    const start = $from.start(depth);
    const relFrom = from - start;
    const relTo = to - start;
    const excluded: number[][] = [];
    shared.descendants((node, pos) => {
      if (node.isAtom && !node.isLeaf) {
        const cFrom = start + Math.max(pos, relFrom);
        const cTo = start + Math.min(pos + node.nodeSize, relTo);
        excluded.push([cFrom, cTo]);
      }
    });
    withoutAtoms = excluded
      .reduce(
        (acc, [eFrom, eTo]) => {
          const newAcc: number[][] = [];
          acc.forEach(([aFrom, aTo]) => {
            if (eFrom >= aTo || aFrom >= eTo) newAcc.push([aFrom, aTo]);
            else if (eFrom > aFrom && eTo < aTo)
              newAcc.push([aFrom, eFrom], [eTo, aTo]);
            else if (eFrom < aFrom) newAcc.push([eTo, aTo]);
            else newAcc.push([aFrom, eFrom]);
          });
          return newAcc;
        },
        ranges.map(({ $from, $to }) => [$from.pos, $to.pos]),
      )
      .map(
        ([from, to]) => new SelectionRange(doc.resolve(from), doc.resolve(to)),
      );
  }
  return withoutAtoms;
}

export function getMark(
  m: string | MarkType | Mark,
  attrs?: Attrs | null | undefined,
  schema?: Schema,
): Mark | undefined {
  let mark: Mark | undefined
  if (m instanceof Mark) {
    mark = m;
  } else {
    const a: Attrs = { id: null, classes: [], kv: {}, ...(attrs || {}) }
    if (m instanceof MarkType)
      mark = m.create(a);
    else
      mark = schema?.marks[m]?.create(a);
  }
  return mark
}

export function markIcon(mark?: Mark) {
  switch (mark?.type.name) {
    case MARK_NAME_EMPH:
      return 'mdi-format-italic';
    case MARK_NAME_STRONG:
      return 'mdi-format-bold';
    //FIXME: add the remainder
    case MARK_NAME_LINK:
      return 'mdi-link-variant';
    case MARK_NAME_SPAN:
      if (mark.attrs.customStyle) return 'mdi-palette-swatch-variant';
      break;
    default:
  }
  return 'mdi-selection';
}

/**
 * The marks starting at a certain position.
 */
export function marksStarting(doc: ProsemirrorNode, pos: number): Mark[] {
  try {
    const left = doc.resolve(pos).marks();
    const right = doc.resolve(pos + 1).marks();
    return difference(right, left);
  } catch (e) {
    console.log(e);
  }
  return [];
}

/**
 * The marks ending at a certain position.
 */
export function marksEnding(doc: ProsemirrorNode, pos: number): Mark[] {
  try {
    const left = doc.resolve(pos).marks();
    const right = doc.resolve(pos + 1).marks();
    return difference(left, right);
  } catch (e) {
    console.log(e);
  }
  return [];
}
