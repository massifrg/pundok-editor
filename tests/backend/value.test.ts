import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BACKEND_VALUE_DOC_REPOSITORIES } from '../../packages/common/src';
import { getValue } from '../../packages/backend/src/handlers/value';
import type { BackendDirectories } from '../../packages/backend/src/resourceManager';

describe('getValue', () => {
  let root: string;
  let directories: BackendDirectories;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-value-'));
    directories = {
      userDataDir: root,
      configurationsDir: join(root, 'configs'),
      localConfigurationsDir: join(root, 'localconfigs'),
    };
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns an empty array when docrepos.json is missing', async () => {
    await expect(
      getValue(directories, BACKEND_VALUE_DOC_REPOSITORIES),
    ).resolves.toEqual([]);
  });

  it('reads repositories from docrepos.json', async () => {
    const repositories = [
      {
        url: 'https://example.org/documents.git',
        user: 'alice',
        type: 'git',
        typeOptions: { branch: 'alice' },
      },
    ];
    await writeFile(join(root, 'docrepos.json'), JSON.stringify(repositories));

    await expect(
      getValue(directories, BACKEND_VALUE_DOC_REPOSITORIES),
    ).resolves.toEqual(repositories);
  });

  it('rejects malformed repository data', async () => {
    await writeFile(
      join(root, 'docrepos.json'),
      JSON.stringify([{ type: 'svn' }]),
    );

    await expect(
      getValue(directories, BACKEND_VALUE_DOC_REPOSITORIES),
    ).rejects.toThrow(
      'docrepos.json must contain an array of document repositories',
    );
  });
});
