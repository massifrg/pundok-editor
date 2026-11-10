import type { PandocJson, PandocJsonDocument } from '../../pandoc';

export const INSERTION_POINT_ID = '__INSERTION_POINT__';

export interface InsertionPoint {
  /** the blocks where the insertion occurs */
  blocks: PandocJson[];
  /** the index of the block where the insertion occurs */
  blockIndex: number;
  /** the index of the Span representing the insertion point */
  spanIndex: number;
  /** whether the insertion point is the first inline element in its block */
  atStart: boolean;
  /** whether the insertion point is the last inline element in its block */
  atEnd: boolean;
}

export function findInsertionPoint(
  document: PandocJsonDocument,
): InsertionPoint | undefined {
  const findIn = (
    value: unknown,
    block?: PandocJson,
    blocks?: PandocJson[],
    blockIndex?: number,
  ): InsertionPoint | undefined => {
    if (Array.isArray(value)) {
      const contents = value.entries();
      for (const [index, item] of contents) {
        if (
          block &&
          item &&
          typeof item === 'object' &&
          (item as PandocJson).t === 'Span' &&
          Array.isArray((item as PandocJson).c) &&
          Array.isArray((item as PandocJson).c[0]) &&
          (item as PandocJson).c[0][0] === INSERTION_POINT_ID
        ) {
          return {
            blocks: blocks!,
            blockIndex: blockIndex!,
            spanIndex: index,
            atStart: index === 0,
            atEnd: index === value.length - 1,
          };
        }

        const childBlock =
          item &&
            typeof item === 'object' &&
            ((item as PandocJson).t === 'Para' ||
              (item as PandocJson).t === 'Plain')
            ? (item as PandocJson)
            : block;
        const found = findIn(
          item,
          childBlock,
          childBlock === item ? (value as PandocJson[]) : blocks,
          childBlock === item ? index : blockIndex,
        );
        if (found) return found;
      }
      return undefined;
    }

    if (!value || typeof value !== 'object') return undefined;

    const item = value as PandocJson;
    return findIn(item.c, block, blocks, blockIndex);
  };

  return findIn(document.blocks);
}
