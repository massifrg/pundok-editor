import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  type ConfigQueryOptions,
  type FindResourceOptions,
  type PandocFilterTransform,
  type PandocOption,
  type PundokEditorConfigInit,
  type PundokEditorProject,
  type ResourceType,
  RESOURCE_SUBPATHS,
} from '../../common/src';
import { migrateLegacyPandocOptions } from './legacyPandocOptions';

const CONFIG_FILE_EXT = '.config.json';

export interface BackendDirectories {
  userDataDir: string;
  configurationsDir: string;
  localConfigurationsDir: string;
  staticResourcesDir?: string;
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
  staticResourcesDir?: string,
): BackendDirectories {
  return {
    userDataDir,
    configurationsDir: sharedConfigurationsDir,
    localConfigurationsDir: resolve(userDataDir, 'localconfigs'),
    ...(staticResourcesDir && { staticResourcesDir }),
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
        return migrateConfigurationPandocOptions({ ...config, isLocal });
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
      return migrateConfigurationPandocOptions({
        ...config,
        isLocal: coordinates.isLocal,
      });
    }
  } catch (error) {
    console.log(error);
  }
  return undefined;
}

function isPandocOptionValue(
  value: unknown,
): value is PandocOption[1] {
  return (
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isPandocOptionTuple(option: unknown): option is PandocOption {
  return (
    Array.isArray(option) &&
    option.length <= 2 &&
    typeof option[0] === 'string' &&
    isPandocOptionValue(option[1])
  );
}

interface ObjectPandocOption {
  name: string;
  value?: PandocOption[1];
}

function isObjectPandocOption(option: unknown): option is ObjectPandocOption {
  return (
    typeof option === 'object' &&
    option !== null &&
    typeof (option as { name?: unknown }).name === 'string' &&
    isPandocOptionValue((option as { value?: unknown }).value)
  );
}

function migratePandocOptions(options: unknown): PandocOption[] | undefined {
  if (options === undefined) return undefined;
  if (!Array.isArray(options))
    throw new Error('Pandoc options must be an array');
  if (options.every((option) => typeof option === 'string'))
    return migrateLegacyPandocOptions(options);
  if (options.every(isPandocOptionTuple))
    return options as PandocOption[];
  if (options.every(isObjectPandocOption))
    return options.map(({ name, value }) =>
      value === undefined
        ? [name]
        : [name, value],
    );
  throw new Error('Pandoc options must be option tuples or legacy strings');
}

export function migrateConfigurationPandocOptions<
  T extends Partial<PundokEditorConfigInit>,
>(config: T): T {
  return {
    ...config,
    outputConverters: config.outputConverters?.map((converter) =>
      converter.type === 'pandoc'
        ? {
            ...converter,
            pandocOptions: migratePandocOptions(converter.pandocOptions),
          }
        : converter,
    ),
    automations: config.automations?.map((automation) =>
      automation.type === 'pandoc-filter'
        ? {
            ...automation,
            pandocOptions: migratePandocOptions(
              (automation as PandocFilterTransform).pandocOptions,
            ),
          }
        : automation,
    ),
  } as T;
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
        findValidPaths(
          resolve(directories.localConfigurationsDir, configName),
        ),
        findValidPaths(resolve(directories.configurationsDir, configName)),
      );
    }
  }
  paths = paths.concat(findValidPaths(directories.userDataDir));
  if (directories.staticResourcesDir) {
    const staticConfigNames = [
      ...(configurationName ? [configurationName] : []),
      ...(project?.configurations || []).slice().reverse(),
    ];
    for (const configName of [...new Set(staticConfigNames)]) {
      paths = paths.concat(
        findValidPaths(
          resolve(directories.staticResourcesDir, 'configs', configName),
        ),
      );
    }
    paths = paths.concat(findValidPaths(directories.staticResourcesDir));
  }
  return paths;
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
