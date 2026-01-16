import { Mark, Node as PmNode, Schema } from "@tiptap/pm/model";
import { difference, intersection, isString } from "lodash-es";
import {
  MARK_NAME_DOUBLE_QUOTED,
  MARK_NAME_SINGLE_QUOTED,
  NODE_NAME_AUTO_DELIMITER
} from "../../common";
import { EditorState, TextSelection, Transaction } from "@tiptap/pm/state";
import { NodeWithPos } from "@tiptap/vue-3";

export type DelimiterForMarkFunction = (
  mark: Mark | string,
  isOpen: boolean,
) => string;

export interface AutoDelimitedMarkDefinition {
  typeName: string;
  attrs?: Record<string, any>;
  openingDelimiter: string;
  closingDelimiter: string;
}

export const defaultDelimiterForMark: DelimiterForMarkFunction = (
  mark: Mark | string,
  isOpen: boolean,
) => {
  switch (isString(mark) ? mark : mark.type.name) {
    case MARK_NAME_DOUBLE_QUOTED:
      return isOpen ? '“' : '”';
    case MARK_NAME_SINGLE_QUOTED:
      return isOpen ? '‘' : '’';
    default:
      return '"';
  }
};

type DelimiterFixType = 'opening' | 'closing';
interface DelimiterFix {
  pos: number;
  type: DelimiterFixType;
  mark: Mark;
  markIndex?: number;
}

interface MarkIndexRange {
  markIndex: number;
  from: number;
  to: number;
}

export function fixAutoDelimitersTransaction(
  state: EditorState,
  paraLikes: NodeWithPos[],
  autoDelimMarks: Mark[],
): Transaction {
  paraLikes.sort((p1, p2) => p2.pos - p1.pos);
  const { schema, tr } = state
  // save the selection
  const bookmark = tr.selection.getBookmark();
  // consider all the paragraphs (inline content containers)
  // in reverse order (higher positions first)
  paraLikes.forEach(({ pos }) => {
    const adPositions = removeAllAutoDelimitersInParagraph(tr.doc, pos);
    // console.log(`Positions of auto delimiters: ${adPositions.join()}`)
    adPositions.forEach((adpos) => {
      tr.replace(adpos, adpos + 1);
      // console.log(tr.doc.nodeAt(pos)?.textContent)
    });
    const fixes = putAutoDelimitersInParagraph(tr.doc, pos, autoDelimMarks);
    fixes.forEach(({ pos: mpos, type, mark }) => {
      const isOpen = type === 'opening';
      const slice = isOpen
        ? tr.doc.slice(mpos - 1, mpos)
        : tr.doc.slice(mpos, mpos + 1);
      const curMarks = isOpen
        ? slice.content.lastChild?.marks
        : slice.content.firstChild?.marks;
      // const markType = mark.type.name;
      const marks = [...curMarks!];
      if (mark && !marks.find((m) => m.eq(mark))) marks.push(mark);
      const delim = schema.nodes[NODE_NAME_AUTO_DELIMITER].create(
        { isOpen, markType: mark?.type.name },
        undefined,
        marks,
      );
      tr.insert(mpos, delim);
    });
  });
  if (tr.docChanged) {
    try {
      // restore the selection, if possible
      const sel = bookmark.resolve(tr.doc);
      if (sel instanceof TextSelection) {
        const mapping = tr.mapping;
        const newFrom = mapping.map(sel.from)
        const newTo = mapping.map(sel.to)
        const size = tr.doc.content.size + 1
        if (newFrom <= size && newTo <= size) {
          const $from = tr.doc.resolve(newFrom);
          const $to = tr.doc.resolve(newTo);
          tr.setSelection(new TextSelection($from, $to));
        }
      }
    } catch (err: any) {
      console.log(err.toString());
    }
  }
  return tr;
}

function removeAllAutoDelimitersInParagraph(
  doc: PmNode,
  pos: number,
): number[] {
  const positions: number[] = [];
  const paragraph = doc.nodeAt(pos);
  if (paragraph && paragraph.inlineContent) {
    let offset = pos + 1;
    for (let i = 0; i < paragraph.childCount; i++) {
      const child = paragraph.child(i);
      if (child.type.name === NODE_NAME_AUTO_DELIMITER) positions.push(offset);
      offset += child.nodeSize;
    }
  }
  positions.reverse();
  return positions;
}

function putAutoDelimitersInParagraph(
  doc: PmNode,
  pos: number,
  adMarks: Mark[],
): DelimiterFix[] {
  const fixes: DelimiterFix[] = [];
  const paragraph = doc.nodeAt(pos);
  if (paragraph && paragraph.inlineContent) {
    let offset = pos + 1;
    const rangesForMark: number[][][] = [];
    for (let i = 0; i < adMarks.length; i++) rangesForMark.push([]);

    function addRangeForMark(index: number, from: number, to: number) {
      let ranges = rangesForMark[index];
      if (ranges.length === 0) {
        ranges.push([from, to]);
      } else {
        const prev = ranges[ranges.length - 1];
        if (prev[1] === from) prev[1] = to;
        else ranges.push([from, to]);
      }
    }

    // function extendAllRanges(from: number, amount: number = 1) {
    //   rangesForMark.forEach((ranges) => {
    //     if (ranges.length > 0) {
    //       const prev = ranges[ranges.length - 1];
    //       if (prev[1] === from) prev[1] += amount;
    //     }
    //   });
    // }

    function autoDelimMarksIndexesOfNode(node: PmNode): number[] {
      return node.marks
        .map((m) => adMarks.findIndex((a) => a.eq(m)))
        .filter((index) => index >= 0);
    }

    function isAtomForbiddingAutoDelimMarks(node: PmNode) {
      const allowedMarks = node.type.markSet;
      // console.log(`marks allowed in ${node.type.name}: ${allowedMarks ? allowedMarks.map((m) => m.name).join() : 'null'}`);
      const allows =
        allowedMarks === null ||
        adMarks.every((adm) => allowedMarks.indexOf(adm.type) >= 0);
      const ret = !node.isText && node.isAtom && !allows;
      // console.log(`node ${node.type.name}(${node.attrs?.text}) allows ${adMarks.map((m) => m.type.name).join()}: ${allows}`);
      return ret;
    }

    const count = paragraph.childCount;

    // the indexes of the autodelimiters' Marks found before
    let prevAdmIndexes: number[] = [];
    let backwardExtension = 0;
    for (let i = 0; i < count; i++) {
      const child = paragraph.child(i);
      const childSize = child.nodeSize;
      if (isAtomForbiddingAutoDelimMarks(child)) {
        if (prevAdmIndexes) backwardExtension += childSize;
        // extendAllRanges(offset, child.nodeSize);
      } else {
        const admIndexes = autoDelimMarksIndexesOfNode(child);
        const extendingIndexes = prevAdmIndexes
          ? []
          : intersection(admIndexes, prevAdmIndexes);
        const newIndexes = prevAdmIndexes
          ? admIndexes
          : difference(admIndexes, prevAdmIndexes);
        // console.log(`admIndexes: ${admIndexes.join()}, extendingIndexes: ${extendingIndexes.join()}, newIndexes: ${newIndexes.join()}`);
        if (admIndexes) {
          let rFrom = offset;
          const rTo = offset + childSize;
          newIndexes.forEach((index) => {
            addRangeForMark(index, rFrom, rTo);
          });
          rFrom = offset - backwardExtension;
          extendingIndexes.forEach((index) => {
            addRangeForMark(index, rFrom, rTo);
          });
        }
        prevAdmIndexes = admIndexes;
        backwardExtension = 0;
      }
      offset += child.nodeSize;
    }

    const markRanges: MarkIndexRange[] = [];
    rangesForMark.forEach((ranges, i) => {
      ranges.forEach((range) => {
        markRanges.push({
          markIndex: i,
          from: range[0],
          to: range[1],
        });
      });
    });
    markRanges
      .sort((mr1, mr2) => {
        let diff = mr1.from - mr2.from;
        if (diff === 0) diff = mr2.to - mr1.to;
        return diff;
      })
      .forEach(({ markIndex, from, to }) => {
        fixes.push({
          pos: from,
          type: 'opening',
          mark: adMarks[markIndex],
          markIndex,
        });
        fixes.push({
          pos: to,
          type: 'closing',
          mark: adMarks[markIndex],
          markIndex,
        });
      });
    fixes.sort((f1, f2) => {
      let diff = f2.pos - f1.pos;
      if (diff === 0) {
        if (f1.type !== f2.type) {
          return f1.type === 'opening' ? -1 : 1;
        } else {
          const indexDiff = f1.markIndex! - f2.markIndex!;
          diff = f1.type === 'opening' ? indexDiff : -indexDiff;
        }
      }
      return diff;
    });
    // console.log(fixes)
  }
  return fixes;
}
