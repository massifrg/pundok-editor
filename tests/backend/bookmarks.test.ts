import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BOOKMARKS_FILENAME,
  updateBookmarks,
} from '../../packages/backend/src/bookmarks';
import type { BackendDirectories } from '../../packages/backend/src/resourceManager';

describe('updateBookmarks', () => {
  let root: string;
  let userDataDir: string;
  let directories: BackendDirectories;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-bookmarks-'));
    userDataDir = join(root, 'user');
    await mkdir(userDataDir);
    directories = {
      userDataDir,
      configurationsDir: join(userDataDir, 'configs'),
      localConfigurationsDir: join(userDataDir, 'localconfigs'),
    };
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('collapses aliases and preserves the file extension when updating bookmarks', async () => {
    const documentPath = join(userDataDir, 'recent.md');
    const bookmarksPath = join(userDataDir, BOOKMARKS_FILENAME);
    await writeFile(
      bookmarksPath,
      JSON.stringify([
        { type: 'document', url: documentPath },
        { type: 'document', url: pathToFileURL(documentPath).href },
        {
          type: 'document',
          url: relative(process.cwd(), documentPath),
        },
        {
          type: 'document',
          url: `file://${encodeURIComponent(documentPath)}`,
        },
      ]),
    );

    await expect(
      updateBookmarks(directories, [{ type: 'document', url: documentPath }]),
    ).resolves.toBe(true);

    const bookmarks = JSON.parse(await readFile(bookmarksPath, 'utf8'));
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].url).toBe(pathToFileURL(documentPath).href);
  });
});
