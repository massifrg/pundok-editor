import { IpcMainInvokeEvent } from 'electron';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { IpcHub } from './ipcHub';
import { DEFAULT_PROJECT_FILENAME, PundokEditorProject } from '../common';
import { format as formatPath, parse as parsePath } from 'path';

export const getProjectHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      context: Record<string, any>
    ): Promise<PundokEditorProject> => {
      if (context.path) {
        const { dir } = parsePath(context.path);
        const projectFile = formatPath({ dir, name: DEFAULT_PROJECT_FILENAME });
        if (existsSync(projectFile)) {
          return loadProjectFromDocFile(projectFile);
        }
      }
      return Promise.reject(`can't load a project file`);
    };

/**
 * Get the file path of the project file in a directory.
 * @param dir The directory of the project file.
 * @returns 
 */
export function projectFileNameInDirectory(dir: string): string {
  return formatPath({ dir, name: DEFAULT_PROJECT_FILENAME });
}

/**
 * Get the file path of the configuration file of a project.
 * It does not look for project in parent directories (for now).
 * @param docfilepath The file path of the document.
 * @returns 
 */
export function projectFileNameOfDocument(docfilepath: string): string {
  return projectFileNameInDirectory(parsePath(docfilepath).dir)
}

/**
 * Load a {@link PundokEditorProject} from a project file.
 * @param filepath The project file.
 * @returns 
 */
export async function loadProjectFromFile(filepath: string): Promise<PundokEditorProject> {
  try {
    const data = await readFile(filepath);
    const project = JSON.parse(data.toString()) as PundokEditorProject;
    project.path = parsePath(filepath).dir;
    return project;
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Load a {@link PundokEditorProject} from the project file of a document.
 * It does not look for project in parent directories (for now).
 * @param filepath The document file path.
 * @returns 
 */
export async function loadProjectFromDocFile(filepath: string): Promise<PundokEditorProject> {
  return loadProjectFromFile(projectFileNameOfDocument(filepath));
}

/**
 * Load a {@link PundokEditorProject} from the project file in a directory.
 * @param dir The directory where the project file is looked for.
 * @returns 
 */
export async function loadProjectInDirectory(dir: string): Promise<PundokEditorProject> {
  return loadProjectFromFile(projectFileNameInDirectory(dir))
}