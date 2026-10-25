import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DOCUMENT_FORMAT,
  DEFAULT_PROJECT_FILENAME,
  type ServerMessage,
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

    const messages: ServerMessage[] = [];
    const events: RendererHub = {
      send: (_channel, message) => messages.push(message),
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
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      type: 'project',
      project: { name: 'Project', path: projectDirectory },
    });
    await expect(readFile(filename, 'utf8')).resolves.toBe('{}');
  });
});
