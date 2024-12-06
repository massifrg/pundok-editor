import { Node as ProsemirrorNode, ResolvedPos } from '@tiptap/pm/model';

/**
 * The depth of the inner node that satisfies a criterium,
 * at a given resolved position.
 * @param $pos
 * @param predicate
 * @returns
 */
export function innerNodeDepth(
  $pos: ResolvedPos,
  predicate: (node: ProsemirrorNode) => boolean
): number | undefined {
  const depth = $pos.depth;
  for (let d = depth; d > 0; d--) {
    if (predicate($pos.node(d))) return d;
  }
  return undefined;
}

/**
 * The depth of the inner node, at a given resolved position,
 * whose type is among the ones passed with the second argument.
 * @param $pos
 * @param typenames
 * @returns
 */
export function depthOfInnerNodeType(
  $pos: ResolvedPos,
  typenames: string[]
): number | undefined {
  for (let d = $pos.depth; d >= 0; d--) {
    const typename = $pos.node(d).type.name;
    if (typenames.find((tn) => tn === typename)) return d;
  }
  return;
}

/**
 * The depth of the inner block node at a given resolved position.
 * @param $pos
 * @returns
 */
export function innerBlockDepth($pos: ResolvedPos): number {
  const depth = $pos.depth;
  for (let d = depth; d > 0; d--) {
    if ($pos.node(d).isBlock) return d;
  }
  return -1;
}
