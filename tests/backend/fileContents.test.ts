import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFileContents } from '../../packages/backend/src/handlers/fileContents';
import type { BackendDirectories } from '../../packages/backend/src/resourceManager';

describe('getFileContents access boundaries', () => {
  let root: string;
  let userFiles: string;
  let sharedConfigurations: string;
  let localConfigurations: string;
  let outside: string;
  let directories: BackendDirectories;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-file-contents-'));
    userFiles = join(root, 'user');
    sharedConfigurations = join(root, 'configs');
    localConfigurations = join(userFiles, 'localconfigs');
    outside = join(root, 'outside');
    await Promise.all([
      mkdir(userFiles, { recursive: true }),
      mkdir(sharedConfigurations),
      mkdir(outside),
    ]);
    directories = {
      userDataDir: userFiles,
      configurationsDir: sharedConfigurations,
      localConfigurationsDir: localConfigurations,
    };
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reads files from an allowed directory', async () => {
    const filename = join(userFiles, 'document.md');
    await writeFile(filename, 'document contents');

    await expect(
      getFileContents(directories, filename, undefined, [userFiles]),
    ).resolves.toBe('document contents');
  });

  it('rejects absolute paths outside the allowed directories', async () => {
    const filename = join(outside, 'secret.txt');
    await writeFile(filename, 'secret');

    await expect(
      getFileContents(directories, filename, undefined, [userFiles]),
    ).rejects.toThrow('File access is not permitted');
  });

  it('allows unrestricted access when no boundary is provided', async () => {
    const filename = join(outside, 'secret.txt');
    await writeFile(filename, 'secret');

    await expect(getFileContents(directories, filename)).resolves.toBe(
      'secret',
    );
  });

  it('rejects resource paths whose project directory is outside the allowed directories', async () => {
    const filename = join(outside, 'private.css');
    await writeFile(filename, 'private stylesheet');

    await expect(
      getFileContents(
        directories,
        'private.css',
        {
          kind: 'css',
          project: JSON.stringify({ path: outside }),
        },
        [userFiles, sharedConfigurations, localConfigurations],
      ),
    ).rejects.toThrow('File access is not permitted');
  });

  it('rejects symlinks from an allowed directory to an outside file', async () => {
    const filename = join(outside, 'secret.txt');
    const link = join(userFiles, 'linked-secret.txt');
    await writeFile(filename, 'secret');
    await symlink(filename, link);

    await expect(
      getFileContents(directories, link, undefined, [userFiles]),
    ).rejects.toThrow('File access is not permitted');
  });

  it('allows files in an explicitly permitted configuration directory', async () => {
    const filename = join(sharedConfigurations, 'theme.css');
    await writeFile(filename, 'theme');

    await expect(
      getFileContents(directories, filename, undefined, [
        userFiles,
        sharedConfigurations,
        localConfigurations,
      ]),
    ).resolves.toBe('theme');
  });
});
