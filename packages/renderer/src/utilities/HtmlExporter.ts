import { Mark, Node } from '@tiptap/pm/model';

export type NodeToChunks = (node: Node) => [before: string, after: string];
export type MarkToChunks = (mark: Mark) => [before: string, after: string];
export type MarkedTextToString = (node: Node) => string;

export function exportNode(
  node: Node,
  getChunks: NodeToChunks,
  markedTextToString: MarkedTextToString,
  before: string[] = [],
  after: string[] = []
): void {
  const [textBefore, textAfter] = getChunks(node);
  before.push(textBefore);
  if (!node.isLeaf) {
    node.content.forEach((child) => {
      if (child.isText) {
        before.push(markedTextToString(child));
      } else {
        exportNode(child, getChunks, markedTextToString, before, after);
      }
    });
  }
  before.push(textAfter);
}
