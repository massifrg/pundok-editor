import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DOCUMENT_FORMAT,
  type PundokEditorProject,
} from '../../packages/common/src';
import { EditorEventHub } from '../../packages/server/src/editorEventHub';
import { PundokEditorServer } from '../../packages/server/src/pundokEditorServer';

describe('PundokEditorServer path round trips', () => {
  let root: string;
  let userDirectory: string;
  let projectDirectory: string;
  let server: PundokEditorServer;
  let project: PundokEditorProject;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-server-paths-'));
    userDirectory = join(root, 'user');
    projectDirectory = join(userDirectory, 'project');
    await mkdir(projectDirectory, { recursive: true });
    project = {
      name: 'Project',
      path: 'project',
      rootDocument: 'index.json',
      editorConfig: {},
    };
    await Promise.all([
      writeFile(join(projectDirectory, 'index.json'), '{"root":true}'),
      writeFile(join(projectDirectory, 'chapter.json'), '{"chapter":true}'),
      writeFile(join(projectDirectory, 'pundok-project.json'), JSON.stringify({
        name: project.name,
        rootDocument: project.rootDocument,
        editorConfig: {},
      })),
    ]);
    server = new PundokEditorServer(
      () => ({
        userDataDir: userDirectory,
        configurationsDir: join(root, 'configs'),
        localConfigurationsDir: join(userDirectory, 'localconfigs'),
      }),
      new EditorEventHub(),
      () => [],
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('opens and saves a path relative to the supplied project base', async () => {
    const opened = await server.open('alice', {
      path: 'chapter.json',
      project,
      documentFormat: DEFAULT_DOCUMENT_FORMAT,
    });

    expect(opened.path).toBe(join(projectDirectory, 'chapter.json'));
    expect(opened.project).toMatchObject({
      path: projectDirectory,
      rootDocument: 'index.json',
    });

    const saved = await server.save('alice', {
      ...opened,
      content: '{"chapter":"saved"}',
      documentFormat: undefined,
    });

    expect(saved.doc.path).toBe(join(projectDirectory, 'chapter.json'));
    expect(saved.doc.project).toMatchObject({
      path: projectDirectory,
      rootDocument: 'index.json',
    });
    await expect(readFile(join(projectDirectory, 'chapter.json'), 'utf8'))
      .resolves.toBe('{"chapter":"saved"}');
  });

  it('can send an opened path and project through a second round trip', async () => {
    const opened = await server.open('alice', {
      path: pathToFileURL(join(projectDirectory, 'chapter.json')).href,
      project: {
        ...project,
        path: pathToFileURL(projectDirectory).href,
      },
      documentFormat: DEFAULT_DOCUMENT_FORMAT,
    });

    const reopened = await server.open('alice', {
      path: opened.path,
      project: opened.project,
      documentFormat: opened.documentFormat,
    });

    expect(reopened.path).toBe(opened.path);
    expect(reopened.project?.path).toBe(projectDirectory);
    expect(reopened.project?.rootDocument).toBe('index.json');
  });

  it('lists a folder relative to the project base', async () => {
    const folder = join(projectDirectory, 'chapters');
    await mkdir(folder);
    await writeFile(join(folder, 'one.json'), '{}');

    const contents = await server.getFolderContents('alice', {
      path: 'chapters',
      project,
    });

    expect(contents.baseUrl).toBe(pathToFileURL(folder).href);
    expect(contents.documents).toContainEqual(
      expect.objectContaining({ name: 'one.json' }),
    );
  });
});
