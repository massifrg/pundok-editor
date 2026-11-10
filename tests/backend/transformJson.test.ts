import { describe, expect, it } from 'vitest';
import { transformWithPandoc } from '../../packages/backend/src/handlers/transformJson';
import type { BackendDirectories } from '../../packages/backend/src/resourceManager';

const directories: BackendDirectories = {
  userDataDir: process.cwd(),
  configurationsDir: process.cwd(),
  localConfigurationsDir: process.cwd(),
};

describe('transformWithPandoc', () => {
  it('rejects a filterless same-format transform without sources', async () => {
    await expect(
      transformWithPandoc(
        directories,
        { content: '{"blocks":[]}' },
        {
          type: 'pandoc-filter',
          name: 'identity',
          filters: [],
          fromFormat: 'json',
          toFormat: 'json',
        },
      ),
    ).rejects.toThrow(
      'You must provide Pandoc filters to transform a document without changing its format',
    );
  });

  it('allows a filterless same-format transform with a source', async () => {
    const source = `${process.cwd()}/tests/fixtures/transform-source.json`;

    await expect(
      transformWithPandoc(
        directories,
        {},
        {
          type: 'pandoc-filter',
          name: 'insert-document',
          filters: [],
          fromFormat: 'json',
          toFormat: 'json',
          sources: [source],
        },
      ),
    ).resolves.toContain('"blocks"');
  });
});
