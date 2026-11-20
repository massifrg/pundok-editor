import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  populatePageRangesFromSynctexFile,
} from '../../packages/backend/src/pageRanges';
import type { ProjectComponent } from '../../packages/common/src';

describe('populatePageRangesFromSynctexFile', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-page-ranges-'));
    await mkdir(join(root, 'chapters'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('populates ordered inclusive ranges for each component', async () => {
    const synctexFile = join(root, 'book.synctex');
    await writeFile(
      synctexFile,
      [
        'begin page: 3',
        `[0 0 0 0]: 8: ${join(root, 'chapters/one.md')}`,
        'begin page: 1',
        `[0 0 0 0]: 4: ${join(root, 'book.md')}`,
        'begin page: 2',
        `[0 0 0 0]: 5: ${join(root, 'chapters/one.md')}`,
        'begin page: 4',
        `[0 0 0 0]: 9: ${join(root, 'chapters/two.md')}`,
      ].join('\n'),
    );
    const structure: ProjectComponent = {
      src: 'book.md',
      children: [{ src: 'chapters/one.md' }, { src: 'chapters/two.md' }],
    };

    await expect(
      populatePageRangesFromSynctexFile(structure, synctexFile, root),
    ).resolves.toEqual({
      src: 'book.md',
      children: [
        { src: 'chapters/one.md', pageRanges: [[2, 3]] },
        { src: 'chapters/two.md', pageRanges: [[4, 4]] },
      ],
      pageRanges: [[1, 1]],
    });
  });
});
