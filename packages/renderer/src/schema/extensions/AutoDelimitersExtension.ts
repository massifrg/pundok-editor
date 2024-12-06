import { Extension, Node } from '@tiptap/core';
import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
} from '@tiptap/pm/state';
import { type Mark, type Node as PmNode } from '@tiptap/pm/model';
import { SingleQuoted } from '../marks/SingleQuoted';
import { DoubleQuoted } from '../marks/DoubleQuoted';
import { Editor, NodeWithPos, mergeAttributes } from '@tiptap/vue-3';
import { difference, intersection, isString } from 'lodash';
import { changedRanges } from '../helpers/whatChanged';

const AUTO_DELIMITER_CLASS = 'auto-delimiter';
const AUTO_DELIMITER_OPEN_CLASS = 'delimiter-open';
const AUTO_DELIMITER_CLOSE_CLASS = 'delimiter-close';

type DelimiterForMarkFunction = (
  mark: Mark | string,
  isOpen: boolean,
) => string;

interface AutoDelimitedMarkDefinition {
  typeName: string;
  attrs?: Record<string, any>;
  openingDelimiter: string;
  closingDelimiter: string;
}

const defaultDelimiterForMark: DelimiterForMarkFunction = (
  mark: Mark | string,
  isOpen: boolean,
) => {
  switch (isString(mark) ? mark : mark.type.name) {
    case DoubleQuoted.name:
      return isOpen ? '“' : '”';
    case SingleQuoted.name:
      return isOpen ? '‘' : '’';
    default:
      return '"';
  }
};

export function registerAutodelimitedMarks(
  editor: Editor,
  markDefs: AutoDelimitedMarkDefinition[],
) {
  const marks: Mark[] = [];
  const delimiters: string[][] = [];
  const schema = editor.schema;
  if (schema) {
    markDefs.forEach(
      ({ typeName, attrs, openingDelimiter, closingDelimiter }) => {
        if (typeName) {
          const mark = schema.marks[typeName].create(attrs);
          if (mark) {
            marks.push(mark);
            delimiters.push([openingDelimiter, closingDelimiter]);
          }
        }
      },
    );
  }
  editor.storage.autoDelimiters.autodelimitedMarks = marks;
  const delimiterForMark: DelimiterForMarkFunction = (mark, isOpen) => {
    const index = marks.findIndex((m) =>
      isString(mark) ? m.type.name === mark : mark.eq(m),
    );
    if (index >= 0) return delimiters[index][isOpen ? 0 : 1];
    return '"';
  };
  registerDelimiterForMark(editor, delimiterForMark);
}

export function registerDelimiterForMark(
  editor: Editor,
  delimiterForMark: DelimiterForMarkFunction,
) {
  editor.storage.autoDelimiter.delimiterForMark = delimiterForMark;
}

export function registerAutodelimiters(
  editor: Editor,
  autoDelimiters: Record<string, string[]>,
) {
  const markDefs: AutoDelimitedMarkDefinition[] = [];
  Object.keys(autoDelimiters).forEach((k) => {
    let typeName = k;
    const lk = k.toLowerCase();
    if (lk === 'singlequote' || lk === 'singlequoted')
      typeName = SingleQuoted.name;
    else if (lk === 'doublequote' || lk === 'doublequoted')
      typeName = DoubleQuoted.name;
    const delimiters = autoDelimiters[k];
    markDefs.push({
      typeName,
      openingDelimiter: delimiters[0] || '"',
      closingDelimiter: delimiters[1] || '"',
    });
  });
  registerAutodelimitedMarks(editor, markDefs);
}

export interface AutoDelimitersOptions {
  HTMLAttributes: Record<string, any>;
}

export const AutoDelimiter = Node.create<AutoDelimitersOptions>({
  name: 'autoDelimiter',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: false,
  // marks: '_',

  addOptions() {
    return {
      HTMLAttributes: {
        class: AUTO_DELIMITER_CLASS,
      },
    };
  },

  addStorage() {
    return {
      delimiterForMark: defaultDelimiterForMark,
    };
  },

  addAttributes() {
    return {
      isOpen: {
        default: true,
        parseHTML: (e: HTMLElement) =>
          e.classList.contains(AUTO_DELIMITER_CLOSE_CLASS) ? false : true,
        renderHTML: ({ isOpen }) =>
          isOpen
            ? { class: AUTO_DELIMITER_OPEN_CLASS }
            : { class: AUTO_DELIMITER_CLOSE_CLASS },
      },
      markType: {
        default: null,
        parseHTML: (e: HTMLElement) => e.getAttribute('mark-type'),
        renderHTML: ({ markType }) =>
          markType ? { 'mark-type': markType } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (n) => {
          const e = n as HTMLElement;
          const classList = e.classList;
          if (classList.contains(this.options.HTMLAttributes.class)) {
            let content = e.getAttribute('mark-type');
            if (!content || content.length === 0) content = e.textContent;
            if (!content || content.length === 0) content = '"';
            return {
              isOpen: !classList.contains('delimiter-close'),
              content,
            };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { isOpen, markType } = node.attrs;
    const delimiterForMark = this.storage.delimiterForMark;
    const content = delimiterForMark ? delimiterForMark(markType, isOpen) : '"';
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      content,
    ];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    autoDelimiters: {
      fixAutoDelimiters: () => ReturnType;
    };
  }
}

export const AutoDelimitersExtension = Extension.create<AutoDelimitersOptions>({
  name: 'autoDelimiters',

  addOptions() {
    return {
      HTMLAttributes: {
        class: AUTO_DELIMITER_CLASS,
      },
    };
  },

  addStorage() {
    return {
      autodelimitedMarks: [] as Mark[],
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: new PluginKey('autoDelimiters'),
        appendTransaction(transactions, oldState, newState) {
          // search for the widest range containing all the changes
          const adm: Mark[] = extension.storage.autodelimitedMarks || [];
          // consider only changes that modify content or add/remove autodelimited marks
          const changes = changedRanges(transactions);
          if (changes.length === 0) return undefined;
          const interestingChanges = changes.filter(
            (cr) =>
              (cr.isContent && !(cr.isInsertion && cr.deltaContent === 1)) ||
              (cr.isMark &&
                (cr.isMarkRemoval ||
                  adm.find((m) => cr.mark && cr.mark.eq(m)))),
          );
          // logDocChanges(changes);
          if (interestingChanges.length === 0) return undefined;
          if (interestingChanges.length > 0) {
            // logDocChanges(interestingChanges);
            let minFrom: number | undefined;
            let maxTo: number | undefined;
            changes.forEach(({ from, to, isContent, isMark }) => {
              if (isContent || isMark) {
                minFrom = !minFrom || from < minFrom ? from : minFrom;
                maxTo = !maxTo || to > maxTo ? to : maxTo;
              }
            });
            let { doc, schema, tr } = newState;

            const paras: NodeWithPos[] = [];
            try {
              doc.nodesBetween(minFrom!, maxTo!, (node, pos) => {
                if (node?.inlineContent) {
                  paras.push({ node, pos });
                  // return false;
                }
                return true;
              });
            } catch {
              // console.log(`minFrom=${minFrom}, maxTo=${maxTo}`);
            }
            paras.sort((p1, p2) => p2.pos - p1.pos);

            return fixAutoDelimitersTransaction(newState, paras, adm, tr);
          }
        },
      }),
    ];
  },

  addCommands() {
    return {
      fixAutoDelimiters:
        (fixFrom?: number, fixTo?: number) =>
        ({ dispatch, state, tr }) => {
          const { doc, selection } = state;
          let from, to;
          if (fixFrom && fixTo && fixTo >= fixFrom) {
            from = fixFrom;
            to = fixTo;
          } else {
            let { empty, $from } = selection;
            if (empty) {
              from = $from.start(0);
              to = $from.end(0);
            } else {
              (from = selection.from), (to = selection.to);
            }
          }
          const autodelimitedMarks: Mark[] =
            this.storage.autodelimitedMarks || [];
          if (autodelimitedMarks.length === 0) return false;
          if (dispatch) {
            const paraLikes: NodeWithPos[] = [];
            try {
              doc.nodesBetween(from, to, (node, pos) => {
                if (node.inlineContent) paraLikes.push({ node, pos });
                return true;
              });
            } catch {
              return false;
            }
            if (paraLikes.length === 0) return false;
            dispatch(
              fixAutoDelimitersTransaction(
                state,
                paraLikes,
                autodelimitedMarks,
              ),
            );
          }
          return true;
        },
    };
  },
});

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

function fixAutoDelimitersTransaction(
  state: EditorState,
  paraLikes: NodeWithPos[],
  autoDelimMarks: Mark[],
  _tr?: Transaction,
): Transaction {
  let tr = _tr || state.tr;
  paraLikes.sort((p1, p2) => p2.pos - p1.pos);
  // save the selection
  const bookmark = tr.selection.getBookmark();
  // consider all the paragraphs (inline content containers)
  // in reverse order (higher positions first)
  paraLikes.forEach(({ pos }) => {
    const adPositions = removeAllAutoDelimitersInParagraph(tr.doc, pos);
    // console.log(`Positions of auto delimiters: ${adPositions.join()}`)
    adPositions.forEach((adpos) => {
      tr = tr.replace(adpos, adpos + 1);
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
      const delim = state.schema.nodes.autoDelimiter.create(
        { isOpen, markType: mark?.type.name },
        undefined,
        marks,
      );
      tr = tr.insert(mpos, delim);
    });
  });
  if (tr.docChanged) {
    try {
      // restore the selection
      const sel = bookmark.resolve(tr.doc);
      if (sel instanceof TextSelection) {
        const mapping = tr.mapping;
        const $from = tr.doc.resolve(mapping.map(sel.from));
        const $to = tr.doc.resolve(mapping.map(sel.to));
        tr = tr.setSelection(new TextSelection($from, $to));
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
      if (child.type.name === AutoDelimiter.name) positions.push(offset);
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
