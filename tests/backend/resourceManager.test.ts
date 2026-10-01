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

  it('returns only Lua files that define a custom writer', async () => {
    const writers = join(userData, 'writers');
    const writer = join(writers, 'writer.lua');
    const byteStringWriter = join(writers, 'byte-string-writer.lua');
    const scaffoldingWriter = join(writers, 'scaffolding-writer.lua');
    const filter = join(writers, 'filter.lua');
    await mkdir(writers);
    await Promise.all([
      writeFile(writer, 'function Writer(doc) return {} end'),
      writeFile(
        byteStringWriter,
        'function ByteStringWriter(doc) return "" end',
      ),
      writeFile(
        scaffoldingWriter,
        'Writer = pandoc.scaffolding.Writer { Blocks = function() end }',
      ),
      writeFile(filter, 'function Pandoc(doc) return doc end'),
    ]);

    expect(
      findResourceFiles(directories, /[.]lua$/, {
        kind: 'writer',
        searchMode: 'strict',
      }),
    ).toEqual(
      expect.arrayContaining([writer, byteStringWriter, scaffoldingWriter]),
    );
    expect(
      findResourceFiles(directories, /[.]lua$/, {
        kind: 'writer',
        searchMode: 'strict',
      }),
    ).not.toContain(filter);
  });

  it('uses the strict Pandoc filter heuristic only in strict mode', async () => {
    const filters = join(userData, 'filters');
    const strictFilter = join(filters, 'strict-filter.lua');
    const italianFilter = join(filters, 'italian-filter.lua');
    const typedFilter = join(filters, 'typed-filter.lua');
    const looseFilter = join(filters, 'loose-filter.lua');
    const writer = join(filters, 'writer.lua');
    await mkdir(filters);
    await Promise.all([
      writeFile(
        strictFilter,
        '-- Pandoc filter\nreturn {\n  Pandoc = function(doc) return pandoc.Pandoc(doc.blocks) end,\n}',
      ),
      writeFile(
        italianFilter,
        '--[[\nFiltro per aggiungere mese e anno abbreviati alla fine delle voci\ndell’indice delle figure.\n]]\nreturn {\n  Pandoc = function(doc) return pandoc.Pandoc(doc.blocks) end,\n}',
      ),
      writeFile(
        typedFilter,
        'local filter = {}\n---@type Filter\nreturn {\n  Pandoc = function(doc) return pandoc.Pandoc(doc.blocks) end,\n}',
      ),
      writeFile(looseFilter, 'function Pandoc(doc) return doc end'),
      writeFile(
        writer,
        '-- Pandoc filter\nfunction Writer(doc) return {} end\nreturn {}',
      ),
    ]);

    expect(
      findResourceFiles(directories, /[.]lua$/, {
        kind: 'filter',
        searchMode: 'loose',
      }),
    ).toEqual(
      expect.arrayContaining([
        strictFilter,
        italianFilter,
        typedFilter,
        looseFilter,
        writer,
      ]),
    );
    expect(
      findResourceFiles(directories, /[.]lua$/, {
        kind: 'filter',
        searchMode: 'strict',
        filterSearchTerms: ['filter', 'filtro'],
      }),
    ).toEqual(
      expect.arrayContaining([strictFilter, italianFilter, typedFilter]),
    );
  });
});
