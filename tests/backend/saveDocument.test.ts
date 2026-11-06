import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DOCUMENT_FORMAT,
  DEFAULT_PROJECT_FILENAME,
} from '../../packages/common/src';
import { computeProjectFromDocFile } from '../../packages/backend/src/handlers/project';
import { RenderingJobStore } from '../../packages/backend/src/documentHash';
import { saveDocument } from '../../packages/backend/src/handlers/saveDocument';
import type { BackendDirectories } from '../../packages/backend/src/resourceManager';
import type { RendererHub } from '../../packages/backend/src/rendererHub';

describe('saveDocument', () => {
  let root: string;
  let directories: BackendDirectories;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-save-document-'));
    directories = {
      userDataDir: join(root, 'user'),
      configurationsDir: join(root, 'configs'),
      localConfigurationsDir: join(root, 'localconfigs'),
    };
    await mkdir(directories.userDataDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('applies the project configuration when saving into a project directory', async () => {
    const projectDirectory = join(root, 'project');
    const filename = join(projectDirectory, 'document.json');
    await mkdir(projectDirectory);
    await writeFile(
      join(projectDirectory, DEFAULT_PROJECT_FILENAME),
      JSON.stringify({
        name: 'Project',
        rootDocument: 'document.json',
        editorConfig: { workingFormat: 'markdown' },
      }),
    );
    await expect(
      computeProjectFromDocFile(directories, filename),
    ).resolves.toMatchObject({ name: 'Project' });

    const events: RendererHub = {
      send: () => undefined,
    };
    const response = await saveDocument(
      directories,
      events,
      { report: () => undefined },
      new RenderingJobStore(),
      {
        path: filename,
        content: '{}',
        documentFormat: { ...DEFAULT_DOCUMENT_FORMAT, ftype: 'guess' },
        project: {
          name: 'Previous project',
          path: root,
          rootDocument: 'old.json',
          editorConfig: {},
        },
      },
    );
    expect(response.doc.project?.name).toBe('Project');
    await expect(readFile(filename, 'utf8')).resolves.toBe('{}');
  });

  it('does not replace the source project when saving a copy', async () => {
    const projectDirectory = join(root, 'copy');
    const filename = join(projectDirectory, 'document.json');
    await mkdir(projectDirectory);
    await writeFile(
      join(projectDirectory, DEFAULT_PROJECT_FILENAME),
      JSON.stringify({
        name: 'Destination project',
        rootDocument: 'document.json',
        editorConfig: {},
      }),
    );

    const events: RendererHub = { send: () => undefined };
    const response = await saveDocument(
      directories,
      events,
      { report: () => undefined },
      new RenderingJobStore(),
      {
        path: filename,
        content: '{}',
        documentFormat: { ...DEFAULT_DOCUMENT_FORMAT, ftype: 'guess' },
        project: {
          name: 'Source project',
          path: root,
          rootDocument: 'source.json',
          editorConfig: {},
        },
      },
      { isCopy: true },
    );

    expect(response.doc.project?.name).toBe('Source project');
  });
});
