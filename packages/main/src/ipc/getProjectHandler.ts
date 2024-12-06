import { IpcMainInvokeEvent } from 'electron';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { IpcHub } from './ipcHub';
import { DEFAULT_PROJECT_FILENAME, PandocEditorProject } from '../common';
import { format as formatPath, parse as parsePath } from 'path';

export const getProjectHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    context: Record<string, any>
  ): Promise<PandocEditorProject> => {
    if (context.path) {
      const { dir } = parsePath(context.path);
      const projectFile = formatPath({ dir, name: DEFAULT_PROJECT_FILENAME });
      if (existsSync(projectFile)) {
        return loadProjectFromDocFile(projectFile);
      }
    }
    return Promise.reject(`can't load a project file`);
  };

export function projectFileName(path: string): string {
  const { dir } = parsePath(path);
  return formatPath({ dir, name: DEFAULT_PROJECT_FILENAME });
}

export async function loadProjectFromDocFile(
  path: string
): Promise<PandocEditorProject> {
  try {
    const data = await readFile(projectFileName(path));
    const project = JSON.parse(data.toString()) as PandocEditorProject;
    project.path = parsePath(path).dir;
    return project;
  } catch (err) {
    return Promise.reject(err);
  }
}
