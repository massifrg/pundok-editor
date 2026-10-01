import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  findResourceFile,
  findResourceFiles,
  type BackendDirectories,
} from '../../packages/backend/src/resourceManager';

describe('resource file lookup', () => {
  let root: string;
  let project: string;
  let userData: string;
  let staticResources: string;
  let directories: BackendDirectories;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-resource-manager-'));
    project = join(root, 'project');
    userData = join(root, 'user');
    staticResources = join(root, 'static');
    await Promise.all([
      mkdir(project),
      mkdir(userData),
      mkdir(staticResources),
    ]);
    directories = {
      userDataDir: userData,
      configurationsDir: join(root, 'configs'),
      localConfigurationsDir: join(userData, 'localconfigs'),
      staticResourcesDir: staticResources,
    };
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('finds all matching files in resource-directory traversal order', async () => {
    const projectFile = join(project, 'project.lua');
    const userFile = join(userData, 'user.lua');
    const staticFile = join(staticResources, 'static.lua');
    await Promise.all([
      writeFile(projectFile, ''),
      writeFile(userFile, ''),
      writeFile(staticFile, ''),
    ]);

    expect(
      findResourceFiles(directories, /\.lua$/, { project: { path: project } }),
    ).toEqual([projectFile, userFile, staticFile]);
  });

  it('uses exact matching for the single-file lookup', async () => {
    const literalFilename = 'theme.css';
    const literalFile = join(userData, literalFilename);
    const similarFile = join(userData, 'themeXcss');
    await Promise.all([writeFile(literalFile, ''), writeFile(similarFile, '')]);

    expect(findResourceFile(directories, literalFilename)).toBe(literalFile);
  });
});
