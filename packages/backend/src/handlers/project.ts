import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { format, parse, resolve } from 'node:path';
import {
  computeProjectConfiguration,
  DEFAULT_PROJECT_FILENAME,
  type GetProjectOptions,
  PundokEditorConfig,
  type PundokEditorProject,
  serializeProject,
} from '../../../common/src';
import { localizePath } from '../filesystem';
import {
  getConfigurationInit,
  isReadableDir,
  type BackendDirectories,
} from '../resourceManager';

export async function createProject(
  directory: string,
  project: Partial<PundokEditorProject>,
): Promise<void> {
  const path = localizePath(directory);
  if (!isReadableDir(path)) {
    throw new Error(`Project directory is not readable: ${path}`);
  }
  await writeFile(
    resolve(path, DEFAULT_PROJECT_FILENAME),
    serializeProject(project as PundokEditorProject),
  );
}

export async function getProject(
  directories: BackendDirectories,
  options: GetProjectOptions,
): Promise<PundokEditorProject | undefined> {
  if (!options.path) return undefined;
  const directory = isReadableDir(options.path)
    ? options.path
    : parse(options.path).dir;
  const filename = projectFileNameInDirectory(directory);
  if (!existsSync(filename)) return undefined;
  return options.computeConfig
    ? computeProjectFromFile(directories, filename)
    : loadProjectFromFile(filename);
}

export function projectFileNameInDirectory(directory: string): string {
  return format({ dir: directory, name: DEFAULT_PROJECT_FILENAME });
}

export async function loadProjectFromFile(
  filename: string,
): Promise<PundokEditorProject> {
  const project = JSON.parse(
    await readFile(filename, 'utf8'),
  ) as PundokEditorProject;
  project.path = parse(filename).dir;
  return project;
}

export async function computeProjectFromFile(
  directories: BackendDirectories,
  filename: string,
): Promise<PundokEditorProject> {
  const project = await loadProjectFromFile(filename);
  return computeProjectConfiguration(project, async (configurationName) => {
    const configuration = await getConfigurationInit(
      directories,
      configurationName,
    );
    return configuration && new PundokEditorConfig(configuration);
  });
}

export function projectFileNameOfDocument(filename: string): string {
  return projectFileNameInDirectory(parse(filename).dir);
}

export function loadProjectFromDocFile(
  filename: string,
): Promise<PundokEditorProject> {
  return loadProjectFromFile(projectFileNameOfDocument(filename));
}

export function loadProjectInDirectory(
  directory: string,
): Promise<PundokEditorProject> {
  return loadProjectFromFile(projectFileNameInDirectory(directory));
}

export function computeProjectFromDocFile(
  directories: BackendDirectories,
  filename: string,
): Promise<PundokEditorProject> {
  return computeProjectFromFile(
    directories,
    projectFileNameOfDocument(filename),
  );
}
