import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorEventHub } from '../../packages/server/src/editorEventHub';
import { PundokEditorServer } from '../../packages/server/src/pundokEditorServer';

describe('PundokEditorServer resource file lookup', () => {
  let root: string;
  let userDirectory: string;
  let staticResources: string;
  let server: PundokEditorServer;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-server-resource-files-'));
    userDirectory = join(root, 'user');
    staticResources = join(root, 'static');
    await Promise.all([mkdir(userDirectory), mkdir(staticResources)]);
    server = new PundokEditorServer(
      () => ({
        userDataDir: userDirectory,
        configurationsDir: join(root, 'configs'),
        localConfigurationsDir: join(userDirectory, 'localconfigs'),
        staticResourcesDir: staticResources,
      }),
      new EditorEventHub(),
      () => [],
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('finds user Lua filters', async () => {
    const filterDirectory = join(userDirectory, 'filters');
    const filter = join(filterDirectory, 'example.lua');
    await mkdir(filterDirectory);
    await writeFile(filter, '');

    await expect(
      server.findResourceFiles('alice', '[.]lua$', undefined, {
        kind: 'filter',
      }),
    ).resolves.toEqual([
      {
        path: filter,
        sourcePath: filterDirectory,
        provenance: 'common',
      },
    ]);
  });

  it('reads a selected static Lua filter', async () => {
    const filterDirectory = join(staticResources, 'filters');
    const filter = join(filterDirectory, 'example.lua');
    await mkdir(filterDirectory);
    await writeFile(filter, 'return {}');

    await expect(
      server.getFileContents('alice', filter, { kind: 'filter' }),
    ).resolves.toBe('return {}');
  });

  it('preserves resource traversal order with provenance', async () => {
    const projectDirectory = join(userDirectory, 'project');
    const projectFilters = join(projectDirectory, 'filters');
    const configurationFilters = join(root, 'configs', 'inherited', 'filters');
    const projectFilter = join(projectFilters, 'project.lua');
    const configurationFilter = join(configurationFilters, 'configuration.lua');
    await Promise.all([
      mkdir(projectFilters, { recursive: true }),
      mkdir(configurationFilters, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(projectFilter, ''),
      writeFile(configurationFilter, ''),
    ]);

    await expect(
      server.findResourceFiles('alice', '[.]lua$', undefined, {
        kind: 'filter',
        project: {
          name: 'project',
          path: projectDirectory,
          rootDocument: '',
          editorConfig: {},
          configurations: ['inherited'],
        },
      }),
    ).resolves.toEqual([
      {
        path: projectFilter,
        sourcePath: projectFilters,
        provenance: 'project',
      },
      {
        path: configurationFilter,
        sourcePath: configurationFilters,
        provenance: 'configuration',
        configurationName: 'inherited',
      },
    ]);
  });

  it('rejects a project path outside the authenticated user directory', async () => {
    await expect(
      server.findResourceFiles('alice', '[.]lua$', undefined, {
        kind: 'filter',
        project: {
          name: 'outside',
          path: join(root, 'outside'),
          rootDocument: '',
          editorConfig: {},
        },
      }),
    ).rejects.toThrow('Path must be within the authenticated user directory');
  });
});
