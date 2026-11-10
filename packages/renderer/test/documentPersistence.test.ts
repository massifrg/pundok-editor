import { describe, expect, it } from 'vitest';
import type { PandocJsonDocument } from '../src/pandoc';
import { findInsertionPoint } from '../src/components/editor/findInsertionPoint';

describe('findInsertionPoint', () => {
  it('finds a marked Span nested in document content', () => {
    const insertionPoint = {
      t: 'Span',
      c: [['__INSERTION_POINT__', [], []], []],
    };
    const document: PandocJsonDocument = {
      'pandoc-api-version': [1, 23, 1, 2],
      meta: {},
      blocks: [
        {
          t: 'Para',
          c: [
            { t: 'Str', c: 'before' },
            insertionPoint,
            { t: 'Str', c: 'after' },
          ],
        },
      ],
    };

    expect(findInsertionPoint(document)).toEqual({
      blocks: document.blocks,
      blockIndex: 0,
      spanIndex: 1,
      atStart: false,
      atEnd: false,
    });
  });

  it('returns undefined when no insertion-point Span exists', () => {
    const document: PandocJsonDocument = {
      'pandoc-api-version': [1, 23, 1, 2],
      meta: {},
      blocks: [{ t: 'Span', c: [['other-id', [], []], []] }],
    };

    expect(findInsertionPoint(document)).toBeUndefined();
  });
});
