import { lstat, mkdtemp, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFolderContents } from '../../packages/backend/src/handlers/folderContents';

describe('getFolderContents', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pundok-folder-contents-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('returns file size and last modification time for documents', async () => {
    const filename = join(directory, 'document.md');
    await writeFile(filename, 'document contents');
    const details = await stat(filename);

    const contents = await getFolderContents(directory);

    expect(contents.documents).toContainEqual({
      name: 'document.md',
      size: details.size,
      lastModified: details.mtimeMs,
    });
  });

  it('keeps broken symbolic links in the listing', async () => {
    const filename = join(directory, 'broken-link');
    await symlink('missing-target', filename);
    const details = await lstat(filename);

    const contents = await getFolderContents(directory);

    expect(contents.documents).toContainEqual({
      name: 'broken-link',
      size: details.size,
      lastModified: details.mtimeMs,
    });
  });
});
