import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  type ConfigQueryOptions,
  type FindResourceOptions,
  type PundokEditorConfigInit,
  type PundokEditorProject,
  type ResourceType,
  RESOURCE_SUBPATHS,
} from '../../common/src';

const CONFIG_FILE_EXT = '.config.json';

export interface BackendDirectories {
  userDataDir: string;
  configurationsDir: string;
  localConfigurationsDir: string;
}

export interface ConfigurationFile {
  name: string;
  path: string;
  file: string;
  isLocal: boolean;
}

export function createBackendDirectories(
  userDataDir: string,
  sharedConfigurationsDir = resolve(userDataDir, 'configs'),
): BackendDirectories {
  return {
    userDataDir,
    configurationsDir: sharedConfigurationsDir,
    localConfigurationsDir: resolve(userDataDir, 'localconfigs'),
  };
}

export function ensureBackendDirectories(
  directories: BackendDirectories,
): void {
  for (const dir of [
    directories.userDataDir,
    directories.configurationsDir,
    directories.localConfigurationsDir,
  ]) {
    mkdirSync(dir, { recursive: true });
  }
}

async function configurationFilesInDirectory(
  dir: string,
  isLocal: boolean,
): Promise<ConfigurationFile[]> {
  if (!existsSync(dir)) return [];
  return (await readdir(dir))
    .filter((file) => file.endsWith(CONFIG_FILE_EXT))
    .map((file) => ({
      name: file.slice(0, -CONFIG_FILE_EXT.length),
      path: resolve(dir, file),
      file,
      isLocal,
    }));
}

export async function allConfigurations(
  directories: BackendDirectories,
  options?: ConfigQueryOptions,
): Promise<ConfigurationFile[]> {
  const globalConfigs = !options?.onlyLocal
    ? await configurationFilesInDirectory(directories.configurationsDir, false)
    : [];
  const localConfigs = !options?.onlyGlobal
    ? await configurationFilesInDirectory(
        directories.localConfigurationsDir,
        true,
      )
    : [];
  return [...localConfigs, ...globalConfigs];
}

export async function parseConfigurationFiles(
  directories: BackendDirectories,
  options?: ConfigQueryOptions,
): Promise<PundokEditorConfigInit[]> {
  const parsed = (await allConfigurations(directories, options))
    .map(({ path, isLocal }) => ({
      content: readFileSync(path).toString(),
      isLocal,
    }))
    .map(({ content, isLocal }) => {
      try {
        const config = JSON.parse(content);
        config.isLocal = isLocal;
        return config;
      } catch {
        return null;
      }
    });
  return parsed.filter((config) => !!config) as PundokEditorConfigInit[];
}

export async function getConfigurationInit(
  directories: BackendDirectories,
  configurationName?: string,
): Promise<PundokEditorConfigInit | undefined> {
  if (!configurationName) return undefined;
  try {
    const coordinates = (await allConfigurations(directories)).find(
      (config) => config.name === configurationName,
    );
    if (coordinates) {
      const config = JSON.parse(readFileSync(coordinates.path).toString());
      config.isLocal = coordinates.isLocal;
      return config;
    }
  } catch (error) {
    console.log(error);
  }
  return undefined;
}

export function isReadableFile(filename: string): boolean {
  return existsSync(filename) && statSync(filename).isFile();
}

export function isReadableDir(dir: string): boolean {
  return existsSync(dir) && statSync(dir).isDirectory();
}

function resourcePaths(base: string, kind?: ResourceType): string[] {
  return [
    base,
    ...(kind
      ? (RESOURCE_SUBPATHS[kind] || []).map((subdir) => resolve(base, subdir))
      : []),
  ];
}

export function validResourcePaths(
  directories: BackendDirectories,
  kind?: ResourceType,
  project?: PundokEditorProject,
  configurationName?: string,
): string[] {
  const findValidPaths = (base?: string) =>
    (base && resourcePaths(base, kind).filter(isReadableDir)) || [];
  let paths: string[] = [];

  if (project?.path) paths = paths.concat(findValidPaths(project.path));
  if (!project?.path && configurationName) {
    paths = paths.concat(
      findValidPaths(
        resolve(directories.localConfigurationsDir, configurationName),
      ),
      findValidPaths(resolve(directories.configurationsDir, configurationName)),
    );
  }
  if (project?.configurations) {
    const inherited = [...project.configurations].reverse();
    for (const configName of inherited) {
      paths = paths.concat(
        findValidPaths(resolve(directories.configurationsDir, configName)),
      );
    }
  }
  return paths.concat(findValidPaths(directories.userDataDir));
}

export interface FindResourceFileOptions extends FindResourceOptions {
  baseResourcePaths: string[];
}

export function findResourceFile(
  directories: BackendDirectories,
  filename: string,
  options?: Partial<FindResourceFileOptions>,
): string | undefined {
  const { kind, baseResourcePaths, project, configurationName } = options || {};
  const findFilename = (base?: string) =>
    base && isReadableFile(resolve(base, filename));
  let resourcePath: string | undefined;

  if (baseResourcePaths && kind) {
    resourcePath = validResourceSubpaths(baseResourcePaths, kind).find((dir) =>
      isReadableFile(resolve(dir, filename)),
    );
    resourcePath ||= baseResourcePaths.find((dir) =>
      isReadableFile(resolve(dir, filename)),
    );
  }
  const projectInstance = (
    typeof project === 'string' ? JSON.parse(project) : project
  ) as PundokEditorProject | undefined;
  resourcePath ||= validResourcePaths(
    directories,
    kind,
    projectInstance,
    configurationName,
  ).find(findFilename);
  return resourcePath && resolve(resourcePath, filename);
}

export function validResourceSubpaths(
  baseResourcePaths: string[],
  kind?: ResourceType,
): string[] {
  const subdirs = (kind && RESOURCE_SUBPATHS[kind]) || [];
  return baseResourcePaths
    .flatMap((base) => subdirs.map((subdir) => resolve(base, subdir)))
    .filter(isReadableDir);
}
