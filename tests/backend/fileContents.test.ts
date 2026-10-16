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
  let staticResources: string;
  let outside: string;
  let directories: BackendDirectories;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-file-contents-'));
    userFiles = join(root, 'user');
    sharedConfigurations = join(root, 'configs');
    localConfigurations = join(userFiles, 'localconfigs');
    staticResources = join(root, 'staticResources');
    outside = join(root, 'outside');
    await Promise.all([
      mkdir(userFiles, { recursive: true }),
      mkdir(sharedConfigurations),
      mkdir(staticResources),
      mkdir(outside),
    ]);
    directories = {
      userDataDir: userFiles,
      configurationsDir: sharedConfigurations,
      localConfigurationsDir: localConfigurations,
      staticResourcesDir: staticResources,
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

  it('reads CSS from a locally inherited configuration directory', async () => {
    const configurationName = 'local-theme';
    const stylesDirectory = join(
      localConfigurations,
      configurationName,
      'css',
    );
    await mkdir(stylesDirectory, { recursive: true });
    await writeFile(join(stylesDirectory, 'theme.css'), 'local theme');

    await expect(
      getFileContents(
        directories,
        'theme.css',
        {
          kind: 'css',
          project: JSON.stringify({
            path: userFiles,
            configurations: [configurationName],
          }),
        },
        [userFiles, sharedConfigurations, localConfigurations],
      ),
    ).resolves.toBe('local theme');
  });

  it('reads CSS from static resources after user resources', async () => {
    const userCssDirectory = join(userFiles, 'css');
    const staticCssDirectory = join(staticResources, 'css');
    await Promise.all([
      mkdir(userCssDirectory),
      mkdir(staticCssDirectory, { recursive: true }),
    ]);
    await writeFile(join(userCssDirectory, 'theme.css'), 'user theme');
    await writeFile(join(staticCssDirectory, 'theme.css'), 'static theme');

    await expect(
      getFileContents(
        directories,
        'theme.css',
        { kind: 'css' },
        [
          userFiles,
          sharedConfigurations,
          localConfigurations,
          staticResources,
        ],
      ),
    ).resolves.toBe('user theme');
  });

  it('reads CSS and Lua resources from static resources', async () => {
    const cssDirectory = join(staticResources, 'css');
    const luaDirectory = join(staticResources, 'lua');
    await mkdir(cssDirectory, { recursive: true });
    await mkdir(luaDirectory);
    await writeFile(join(cssDirectory, 'static.css'), 'static stylesheet');
    await writeFile(join(luaDirectory, 'filter.lua'), 'common filter');

    await expect(
      getFileContents(
        directories,
        'static.css',
        { kind: 'css' },
        [
          userFiles,
          sharedConfigurations,
          localConfigurations,
          staticResources,
        ],
      ),
    ).resolves.toBe('static stylesheet');

    await expect(
      getFileContents(
        directories,
        'filter.lua',
        { kind: 'filter' },
        [
          userFiles,
          sharedConfigurations,
          localConfigurations,
          staticResources,
        ],
      ),
    ).resolves.toBe('common filter');
  });

  it('reads CSS from a static configuration resource directory', async () => {
    const staticConfigDirectory = join(staticResources, 'configs', 'default');
    await mkdir(staticConfigDirectory, { recursive: true });
    await writeFile(join(staticConfigDirectory, 'default.css'), 'default CSS');

    await expect(
      getFileContents(
        directories,
        'default.css',
        { kind: 'css', configurationName: 'default' },
        [
          userFiles,
          sharedConfigurations,
          localConfigurations,
          staticResources,
        ],
      ),
    ).resolves.toBe('default CSS');
  });
});
