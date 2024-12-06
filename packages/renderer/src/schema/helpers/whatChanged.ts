import { NodeWithPos } from '@tiptap/vue-3';
import { Fragment, Mark, Node as PmNode, Slice } from '@tiptap/pm/model';
import {
  Mapping,
  ReplaceStep,
  ReplaceAroundStep,
  RemoveMarkStep,
  AddMarkStep,
  AddNodeMarkStep,
  RemoveNodeMarkStep,
  AttrStep,
  DocAttrStep,
} from '@tiptap/pm/transform';
import { Transaction } from '@tiptap/pm/state';

// export interface NodeWithRange {
//   node: PmNode;
//   from: number;
//   to: number;
// }

export interface ChangedNodes {
  before: NodeWithPos[];
  after: NodeWithPos[];
  deleted: NodeWithPos[];
  added: NodeWithPos[];
}

// export interface ChangedNodesOfInlines {
//   before: NodeWithRange[];
//   after: NodeWithRange[];
// }

// export function nodesOfInlinesInRange(
//   doc: PmNode,
//   from_or_pos: number,
//   to?: number
// ): NodeWithRange[] {
//   const nodes_with_ranges: NodeWithRange[] = [];
//   try {
//     doc.nodesBetween(from_or_pos, to || from_or_pos, (node, pos) => {
//       const contentType = node.type.spec?.content;
//       if (contentType && contentType.indexOf('inline') >= 0) {
//         nodes_with_ranges.push({
//           node,
//           from: pos,
//           to: pos + node.nodeSize,
//         });
//         return false;
//       }
//       return true;
//     });
//   } catch (err) {
//     console.log(`nodesOfInlinesInRange: ${err}`);
//   }
//   return nodes_with_ranges;
// }

// export function changedNodesOfInlines(
//   mapping: Mapping,
//   oldDoc: PmNode,
//   newDoc: PmNode
// ): ChangedNodesOfInlines {
//   const newNodesWithRanges: NodeWithRange[] = [];
//   const oldNodesWithRanges: NodeWithRange[] = [];
//   mapping.maps.forEach((stepMap) => {
//     stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
//       const oldNwr = nodesOfInlinesInRange(oldDoc, oldStart, oldEnd);
//       oldNwr.forEach((l) => {
//         if (!oldNodesWithRanges.find((n) => n === l)) {
//           oldNodesWithRanges.push(l);
//         }
//       });
//       const newNwr = nodesOfInlinesInRange(newDoc, newStart, newEnd);
//       newNwr.forEach((l) => {
//         if (!newNodesWithRanges.find((n) => n === l)) {
//           newNodesWithRanges.push(l);
//         }
//       });
//     });
//   });
//   return {
//     before: oldNodesWithRanges,
//     after: newNodesWithRanges,
//   };
// }

// export function changedNodesOfInlinesToString(
//   changedNodes: ChangedNodesOfInlines
// ): string {
//   const { before, after } = changedNodes;
//   const beforeToString = before
//     .map((n) => `${n.node.type.name} from ${n.from} to ${n.to}`)
//     .join(', ');
//   const afterToString = after
//     .map((n) => `${n.node.type.name} from ${n.from} to ${n.to}`)
//     .join(', ');
//   return `old nodes: ${beforeToString}\nnew nodes: ${afterToString}`;
// }

export function changedNodes(
  oldDoc: PmNode,
  newDoc: PmNode,
  predicate: (node: PmNode) => boolean
): ChangedNodes {
  const nodesBefore: NodeWithPos[] = [];
  const nodesAfter: NodeWithPos[] = [];
  oldDoc.descendants((node, pos) => {
    if (predicate(node)) nodesBefore.push({ node, pos });
    return true;
  });
  newDoc.descendants((node, pos) => {
    if (predicate(node)) nodesAfter.push({ node, pos });
    return true;
  });
  return {
    before: nodesBefore,
    after: nodesAfter,
    added: nodesAfter.filter(
      (na) => !nodesBefore.find((nb) => nb.node === na.node)
    ),
    deleted: nodesBefore.filter(
      (nb) => !nodesAfter.find((na) => nb.node === na.node)
    ),
  };
}

// export function addedNodes(
//   oldDoc: PmNode,
//   newDoc: PmNode,
//   predicate: (node: PmNode) => boolean
// ): NodeWithPos[] {
//   return changedNodes(oldDoc, newDoc, predicate).added;
// }

// export function deletedNodes(
//   oldDoc: PmNode,
//   newDoc: PmNode,
//   predicate: (node: PmNode) => boolean
// ): NodeWithPos[] {
//   return changedNodes(oldDoc, newDoc, predicate).deleted;
// }

function countNodes(
  part: PmNode | Fragment | Slice,
  from: number,
  to: number,
  selectFunction?: (n: PmNode) => boolean
): number {
  let count = 0;
  const object = part instanceof Slice ? part.content : part;
  if (selectFunction) {
    object.nodesBetween(from, to, (node) => {
      if (selectFunction(node)) count++;
    });
  } else {
    object.nodesBetween(from, to, () => {
      count++;
    });
  }
  return count;
}

export function deltaNodes(
  tr: Transaction,
  oldDoc: PmNode,
  selectFunction?: (n: PmNode) => boolean
): number {
  if (!tr.docChanged) return 0;
  let doc = oldDoc;
  let count = 0;
  tr.steps.forEach((step) => {
    if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
      let { from, to } = step as ReplaceStep;
      const countDeleted = countNodes(
        doc,
        from > 0 ? from - 1 : from,
        to,
        selectFunction
      );
      // console.log(`before: from=${from}, to=${to}, deleted: ${countDeleted}`);
      count -= countDeleted;
      const result = step.apply(doc);
      if (!result.doc) return 0;
      doc = result.doc;
      const stepMap = step.getMap();
      from = stepMap.map(from - 1);
      to = stepMap.map(to);
      const countAdded = countNodes(doc, from, to, selectFunction);
      count += countAdded;
      // console.log(`after: from=${from}, to=${to}, added: ${countAdded}`);
    } else {
      const result = step.apply(doc);
      if (!result.doc) return 0;
      doc = result.doc;
    }
  });
  return count;
}

/**
 * A change occurred in a Prosemirror Step
 */
interface DocChange {
  from: number /** range start */;
  to: number /** range end */;
  isContent: boolean /** content changed */;
  isMark: boolean /** marks changed */;
  isAttr: boolean /** attrs changed */;
  deltaContent: number /** content added less than content replaced */;
  isInsertion?: boolean /** it's a pure insertion (no content replaced, only when isContent===true) */;
  mark?: Mark /** added/removed Mark (only when isMark===true) */;
  isMarkRemoval?: boolean /** mark removed (only when isMark===true) */;
}

/**
 * Detect the ranges where a document has been changed.
 * Tipically used in [appendTransaction](https://prosemirror.net/docs/ref/#state.PluginSpec.appendTransaction)
 * @param transactions
 * @returns the changes happened to the document during those transactions
 */
export function changedRanges(
  transactions: readonly Transaction[]
): DocChange[] {
  let ranges: DocChange[] = [];
  transactions.forEach((tr) => {
    if (tr.docChanged) {
      tr.steps.forEach((step) => {
        const mapping = step.getMap();
        ranges = ranges.map((range) => ({
          ...range,
          from: mapping.map(range.from),
          to: mapping.map(range.to),
        }));
        if (step instanceof ReplaceStep) {
          const { from, to, slice } = step;
          ranges.push({
            from,
            to,
            isContent: true,
            isMark: false,
            isAttr: false,
            deltaContent: slice.content.size - (to - from),
            isInsertion: from === to,
          });
        } else if (
          step instanceof AddMarkStep ||
          step instanceof RemoveMarkStep
        ) {
          const { from, to, mark } = step;
          ranges.push({
            from,
            to,
            isContent: false,
            isMark: true,
            isAttr: false,
            deltaContent: 0,
            mark,
            isMarkRemoval: step instanceof RemoveMarkStep,
          });
        } else if (step instanceof ReplaceAroundStep) {
          const { from, gapFrom, gapTo, to, slice, insert } = step;
          ranges.push({
            from,
            to: gapFrom,
            isContent: true,
            isMark: false,
            isAttr: false,
            deltaContent: insert - (gapFrom - from),
            isInsertion: gapFrom === from,
          });
          ranges.push({
            from: gapTo,
            to,
            isContent: true,
            isMark: false,
            isAttr: false,
            deltaContent: slice.content.size - insert - (to - gapTo),
            isInsertion: to === gapTo,
          });
        } else if (
          step instanceof AddNodeMarkStep ||
          step instanceof RemoveNodeMarkStep
        ) {
          const { pos, mark } = step;
          const node = tr.doc.nodeAt(pos);
          if (node) {
            ranges.push({
              from: pos,
              to: pos + node.nodeSize,
              isContent: false,
              isMark: true,
              isAttr: false,
              deltaContent: 0,
              mark,
              isMarkRemoval: step instanceof RemoveNodeMarkStep,
            });
          }
        } else if (step instanceof AttrStep) {
          const { pos } = step;
          const node = tr.doc.nodeAt(pos);
          if (node) {
            ranges.push({
              from: pos,
              to: pos + node.nodeSize,
              isContent: false,
              isMark: false,
              isAttr: true,
              deltaContent: 0,
            });
          }
        } else if (step instanceof DocAttrStep) {
          ranges.push({
            from: 0,
            to: tr.doc.nodeSize,
            isContent: false,
            isMark: false,
            isAttr: true,
            deltaContent: 0,
          });
        } else {
          console.log(`UNKNOWN STEP: ${JSON.stringify(step)}`);
        }
      });
    }
  });
  return ranges;
}

/**
 * Utility to log the results of {@link changedRanges}.
 * @param changes
 */
export function logDocChanges(changes: DocChange[]) {
  const chunks: string[] = [];
  changes.forEach(
    ({
      from,
      to,
      isAttr,
      isContent,
      isMark,
      deltaContent,
      mark,
      isInsertion,
    }) => {
      if (isContent) {
        const sign = deltaContent > 0 ? '+' : '';
        chunks.push(
          `CONTENT [${from}, ${to}, ${sign}${deltaContent}${
            isInsertion ? ', pure insertion' : ''
          }]`
        );
      } else if (isAttr) {
        chunks.push(`ATTRS [${from}, ${to}]`);
      } else if (isMark) {
        chunks.push(`MARKS [${from}, ${to}, "${mark?.type?.name}"]`);
      }
    }
  );
  if (chunks.length > 0) console.log(chunks.join());
  else console.log('no changes');
}

/**
 * Finds the paragraph or node with
 * [inlineContent](https://prosemirror.net/docs/ref/#model.NodeType.inlineContent)
 * containing a position.
 * @param doc the document.
 * @param pos
 */
// export function inlineContainerAt(
//   doc: PmNode,
//   pos: number
// ): NodeWithPos | undefined {
//   try {
//     const $pos = doc.resolve(pos);
//     for (let d = $pos.depth; d > 0; d--) {
//       const node = $pos.node(d);
//       if (node?.inlineContent)
//         return {
//           node,
//           pos: $pos.start(d) - 1,
//         };
//     }
//   } catch {
//     return undefined;
//   }
//   return undefined;
// }

/**
 * Finds the boundary positions of a paragraph or a paragraph-like container of inlines
 * over that position.
 * @param doc the document.
 * @param pos
 * @returns a pair with the start and end of the paragraph
 *          or paragraph-like node containing that position;
 *          returns `[undefined, undefined]` if something is wrong.
 */
// export function inlineContainerRange(
//   doc: PmNode,
//   pos: number
// ): number[] | [undefined, undefined] {
//   try {
//     const $pos = doc.resolve(pos);
//     for (let d = $pos.depth; d > 0; d--) {
//       if ($pos.node(d)?.inlineContent) return [$pos.start(d), $pos.end(d)];
//     }
//   } catch {
//     return [undefined, undefined];
//   }
//   return pos >= 1 && pos <= 1 + doc.content.size
//     ? [pos, pos]
//     : [undefined, undefined];
// }
