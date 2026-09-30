import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateLegacyPandocOptions } from '../../packages/backend/src/legacyPandocOptions';
import {
  getConfigurationInit,
  type BackendDirectories,
} from '../../packages/backend/src/resourceManager';
import { loadProjectFromFile } from '../../packages/backend/src/handlers/project';

describe('migrateLegacyPandocOptions', () => {
  let root: string;
  let directories: BackendDirectories;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-legacy-pandoc-options-'));
    directories = {
      userDataDir: join(root, 'user'),
      configurationsDir: join(root, 'configs'),
      localConfigurationsDir: join(root, 'user', 'localconfigs'),
    };
    await mkdir(directories.configurationsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('converts legacy Pandoc command-line arguments to option tuples', () => {
    expect(
      migrateLegacyPandocOptions([
        '--wrap=none',
        '-V',
        'include_sub_meta',
        '--variable',
        'include_sub_meta=1',
        '--template templates/myhtml.html',
        '--variable=cssfile:mycss.css',
      ]),
    ).toEqual([
      ['wrap', 'none'],
      ['V', 'include_sub_meta'],
      ['variable', 'include_sub_meta=1'],
      ['template', 'templates/myhtml.html'],
      ['variable', 'cssfile:mycss.css'],
    ]);
  });

  it('preserves short and long option aliases during migration', () => {
    expect(
      migrateLegacyPandocOptions([
        '-V',
        'include_sub_meta',
        '--variable',
        'include_sub_meta',
      ]),
    ).toEqual([
      ['V', 'include_sub_meta'],
      ['variable', 'include_sub_meta'],
    ]);
  });

  it('rejects malformed legacy arguments', () => {
    expect(() => migrateLegacyPandocOptions(['--not-an-option'])).toThrow(
      'Unknown Pandoc option "not-an-option"',
    );
  });

  it('migrates legacy options of Pandoc filter automations while loading configurations', async () => {
    await writeFile(
      join(directories.configurationsDir, 'legacy.config.json'),
      JSON.stringify({
        name: 'legacy',
        version: [1],
        automations: [
          {
            name: 'Legacy filter',
            type: 'pandoc-filter',
            filters: ['filter.lua'],
            pandocOptions: ['--wrap=none', '-s'],
          },
        ],
      }),
    );

    const configuration = await getConfigurationInit(directories, 'legacy');

    expect(configuration?.automations).toEqual([
      {
        name: 'Legacy filter',
        type: 'pandoc-filter',
        filters: ['filter.lua'],
        pandocOptions: [
          ['wrap', 'none'],
          ['s'],
        ],
      },
    ]);
  });

  it('migrates legacy options of Pandoc filter automations in project editor configurations', async () => {
    const projectFilename = join(root, 'pundok-project.json');
    await writeFile(
      projectFilename,
      JSON.stringify({
        name: 'Legacy project',
        path: root,
        rootDocument: 'document.md',
        editorConfig: {
          automations: [
            {
              name: 'Legacy filter',
              type: 'pandoc-filter',
              filters: ['filter.lua'],
              pandocOptions: ['--wrap=none', '-s'],
            },
          ],
        },
      }),
    );

    const project = await loadProjectFromFile(projectFilename);

    expect(project.editorConfig.automations).toEqual([
      {
        name: 'Legacy filter',
        type: 'pandoc-filter',
        filters: ['filter.lua'],
        pandocOptions: [
          ['wrap', 'none'],
          ['s'],
        ],
      },
    ]);
  });
});
