import { IpcMainInvokeEvent } from 'electron';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { IpcHub } from './ipcHub';
import { computeProjectConfiguration, DEFAULT_PROJECT_FILENAME, GetProjectOptions, PundokEditorConfig, PundokEditorProject } from '../common';
import { format as formatPath, parse as parsePath } from 'path';
import { isReadableDir } from '../resourcesManager';
import { getConfigurationInit } from './configurationHandlers';

export const getProjectHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      options: GetProjectOptions,
    ): Promise<PundokEditorProject | undefined> => {
      if (options.path) {
        // check if the path is the project directory or a document inside it
        const dir = isReadableDir(options.path)
          ? options.path
          : parsePath(options.path).dir;
        const projectFile = formatPath({ dir, name: DEFAULT_PROJECT_FILENAME });
        console.log(`getProjectHandler, dir=${dir}, project file="${projectFile}"`)
        if (existsSync(projectFile)) {
          return options.computeConfig
            ? computeProjectFromFile(projectFile)
            : loadProjectFromFile(projectFile);
        }
      }
      console.log(`can't load a project file`);
      return undefined
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

/**
 * Like {@link loadProjectFromFile}, it loads a project from a project file,
 * but it also computes the `computedConfig` field of the project.
 * @param filepath The project file.
 * @returns 
 */
export async function computeProjectFromFile(filepath: string): Promise<PundokEditorProject> {
  try {
    let project = await loadProjectFromFile(filepath);
    if (project) {
      console.log(`found project for file ${filepath}`);
      project = await computeProjectConfiguration(
        project,
        async (configName) => {
          const cfgInit = await getConfigurationInit(configName);
          return cfgInit && new PundokEditorConfig(cfgInit);
        },
      );
    }
    return project;
  } catch (err) {
    return Promise.reject(err)
  }
}

/**
 * Like {@link PundokEditorProject}, it loads a project from a the project file
 * of a document, but it also computes the `computedConfig` field of the project.
 * @param filepath The document file path.
 * @returns 
 */
export async function computeProjectFromDocFile(filepath: string): Promise<PundokEditorProject> {
  return computeProjectFromFile(projectFileNameOfDocument(filepath));
}