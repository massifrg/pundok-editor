import { take } from 'lodash';
import { MarkRange, NodeWithPos } from '@tiptap/vue-3';
import type { Mark, Node } from '@tiptap/pm/model';
import {
  nodeOrMarkToPandocName,
  nodeOrMarkToPandocType,
} from './PandocVsProsemirror';
import { CustomStyleDef } from '../../common';

export interface SelectedNodeOrMark {
  /** the type.name of the `node` or the `mark` */
  name: string;
  /** The selected Node.  */
  node?: Node;
  /** The selected Mark. */
  mark?: Mark;
  /** It is for Marks spans that are the merge of two or more adjacent spans with the same Mark */
  merged?: boolean;
  /** The `pos` of the node. It's equal to `from` for marks. */
  pos: number;
  /** The `from` position of the text span covered by the mark. */
  from: number;
  /** The `to` position of the text span covered by the mark. */
  to: number;
  /** The node's parent */
  parent?: Node;
  /** The node's index among its siblings (among its parent's children) */
  index?: number;
}

export interface LabeledNodeOrMark extends SelectedNodeOrMark {
  label: string;
  class: string;
  key: string;
}

export interface LabeledNodeAndMarksOptions {
  atPos?: number;
  limit?: number;
  nameToCustomStyle?: Record<string, CustomStyleDef>;
}

function labelNode(
  node: Node,
  pos: number,
  key: string,
  nameToCustomStyle?: Record<string, CustomStyleDef>
): LabeledNodeOrMark {
  return {
    node,
    pos,
    key,
    name: node.type.name,
    label: nodeOrMarkToPandocName(node, nameToCustomStyle),
    class: nodeOrMarkToPandocType(node),
    from: pos,
    to: pos,
  };
}

function labelMark(
  mark: Mark,
  from: number,
  to: number,
  key: string,
  nameToCustomStyle?: Record<string, CustomStyleDef>
): LabeledNodeOrMark {
  return {
    mark,
    from,
    to,
    key,
    name: mark.type.name,
    label: nodeOrMarkToPandocName(mark, nameToCustomStyle),
    class: nodeOrMarkToPandocType(mark),
    pos: from,
  };
}

export function labeledNodesAndMarks(
  nodesWithPos: NodeWithPos[],
  markRanges: MarkRange[],
  options?: LabeledNodeAndMarksOptions
): LabeledNodeOrMark[] {
  let labeled: LabeledNodeOrMark[] = nodesWithPos
    .filter(({ node }) => node.type.name !== 'text')
    .map(({ node, pos }, i) =>
      labelNode(node, pos, `node_${i}`, options?.nameToCustomStyle)
    );
  markRanges.forEach(({ mark, from, to }, i) => {
    labeled.push(
      labelMark(mark, from, to, `mark_${i}`, options?.nameToCustomStyle)
    );
  });
  const atPos = options && options.atPos;
  if (atPos) labeled = labeled.filter((l) => atPos >= l.from && atPos <= l.to);
  labeled.sort(({ pos: pos1 }, { pos: pos2 }) => pos1 - pos2);
  const limit = options && options.limit;
  if (limit) labeled = take(labeled, limit);
  return labeled;
}

export function getMarkRangesBetween(
  from: number,
  to: number,
  doc: Node,
  predicate?: (node: Node) => boolean
): MarkRange[] {
  const mranges: MarkRange[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    (node.marks || []).forEach((mark) => {
      if (!predicate || predicate(node))
        mranges.push({
          from: pos,
          to: pos + node.nodeSize,
          mark,
        });
    });
    return true;
  });
  return mranges;
}

export function getTextMarkRangesBetween(from: number, to: number, doc: Node) {
  return getMarkRangesBetween(from, to, doc, (node) => node.isText);
}

export function colorFor(labeled: LabeledNodeOrMark) {
  switch (labeled.class) {
    case 'Block':
      return 'primary';
    case 'Inline':
      return 'orange';
    default:
      return 'grey';
  }
}

export function labeledNodesAndMarksAtPos(
  doc: Node,
  atPos: number,
  nameToCustomStyle?: Record<string, CustomStyleDef>
): LabeledNodeOrMark[] {
  const labeled: LabeledNodeOrMark[] = [];
  let markCount = 0;
  doc.nodesBetween(atPos, atPos, (node, pos, _parent, index) => {
    const isText = node.type.name === 'text';
    node.marks.forEach((mark) => {
      markCount += 1;
      labeled.push(
        labelMark(
          mark,
          pos,
          pos + node.nodeSize,
          `mark_${markCount}`,
          nameToCustomStyle
        )
      );
    });
    if (!isText)
      labeled.push(labelNode(node, pos, `node_${index}`, nameToCustomStyle));
    return !isText;
  });
  return labeled;
}
