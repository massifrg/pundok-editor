import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PROJECT_FILENAME } from '../../packages/common/src';
import { updateConfiguration } from '../../packages/backend/src/handlers/configurationUpdate';

describe('updateConfiguration', () => {
  let projectDirectory: string;
  let projectFilename: string;

  beforeEach(async () => {
    projectDirectory = await mkdtemp(join(tmpdir(), 'pundok-project-'));
    projectFilename = join(projectDirectory, DEFAULT_PROJECT_FILENAME);
    await writeFile(
      projectFilename,
      JSON.stringify({
        name: 'Original project',
        description: 'Original description',
        rootDocument: 'index.md',
        configurations: ['base'],
        editorConfig: { workingFormat: 'markdown' },
      }),
    );
  });

  afterEach(async () => {
    await rm(projectDirectory, { recursive: true, force: true });
  });

  it('updates the whole project and creates a backup', async () => {
    await updateConfiguration({
      projectPath: projectDirectory,
      value: JSON.stringify({
        name: 'Updated project',
        description: 'Updated description',
        path: projectDirectory,
        rootDocument: 'book.md',
        configurations: ['base', 'paper'],
        editorConfig: {
          workingFormat: 'markdown+smart',
          remove: { automations: ['obsolete'] },
        },
        computedConfig: { name: 'must not be persisted' },
      }),
      operation: 'update',
    });

    const saved = JSON.parse(await readFile(projectFilename, 'utf8'));
    expect(saved).toMatchObject({
      name: 'Updated project',
      description: 'Updated description',
      rootDocument: 'book.md',
      configurations: ['base', 'paper'],
      editorConfig: {
        workingFormat: 'markdown+smart',
        remove: { automations: ['obsolete'] },
      },
    });
    expect(saved).not.toHaveProperty('computedConfig');

    const backup = JSON.parse(
      await readFile(join(projectDirectory, 'pundok-project.bak'), 'utf8'),
    );
    expect(backup.name).toBe('Original project');
  });

  it('rejects malformed project updates', async () => {
    await expect(
      updateConfiguration({
        projectPath: projectDirectory,
        value: JSON.stringify({ name: 'Missing required fields' }),
        operation: 'update',
      }),
    ).rejects.toThrow(
      'Project must include string "name" and "rootDocument" fields and an "editorConfig" object',
    );
  });

  it('rejects project updates with an unsupported operation', async () => {
    await expect(
      updateConfiguration({
        projectPath: projectDirectory,
        value: JSON.stringify({
          name: 'Updated project',
          rootDocument: 'index.md',
          editorConfig: {},
        }),
        operation: 'delete',
      }),
    ).rejects.toThrow(
      'Updating a whole project requires the "update" operation',
    );
  });
});
