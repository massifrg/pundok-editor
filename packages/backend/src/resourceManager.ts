import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import {
  type Automation,
  type ConfigQueryOptions,
  type FindResourceOptions,
  type PandocFilter,
  type PandocFilterTransform,
  type PandocOption,
  type PundokEditorConfigInit,
  type PundokEditorProject,
  type ResourceFile,
  type ResourceFileProvenance,
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

function isPandocOptionValue(value: unknown): value is PandocOption[1] {
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
  if (options.every(isPandocOptionTuple)) return options as PandocOption[];
  if (options.every(isObjectPandocOption))
    return options.map(({ name, value }) =>
      value === undefined ? [name] : [name, value],
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
            ...migratePandocFilterParameters(automation),
            pandocOptions: migratePandocOptions(
              (automation as PandocFilterTransform).pandocOptions,
            ),
          }
        : automation,
    ),
  } as T;
}

function migratePandocFilterParameters(
  automation: Automation,
): PandocFilterTransform {
  const transform = automation as PandocFilterTransform & {
    variables?: PandocFilter['variables'];
    metadata?: PandocFilter['metadata'];
  };
  const { variables, metadata, filters = [] } = transform;
  if ((!variables && !metadata) || filters.length === 0) return transform;

  const [firstFilter, ...remainingFilters] = filters;
  const firstFilterWithParameters =
    typeof firstFilter === 'string'
      ? {
          name: firstFilter,
          ...(variables && { variables }),
          ...(metadata && { metadata }),
        }
      : {
          ...firstFilter,
          ...(variables && {
            variables: { ...variables, ...firstFilter.variables },
          }),
          ...(metadata && {
            metadata: { ...metadata, ...firstFilter.metadata },
          }),
        };
  const {
    variables: _variables,
    metadata: _metadata,
    ...migratedTransform
  } = transform;
  return {
    ...migratedTransform,
    filters: [firstFilterWithParameters, ...remainingFilters],
  };
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
        findValidPaths(resolve(directories.localConfigurationsDir, configName)),
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

export function findResourceFiles(
  directories: BackendDirectories,
  filenameRegex: RegExp,
  options?: Partial<FindResourceFileOptions>,
): string[] {
  const { kind, baseResourcePaths, project, configurationName } = options || {};
  const projectInstance = (
    typeof project === 'string' ? JSON.parse(project) : project
  ) as PundokEditorProject | undefined;
  const resourceDirectories = [
    ...(baseResourcePaths && kind
      ? [
          ...validResourceSubpaths(baseResourcePaths, kind),
          ...baseResourcePaths,
        ]
      : []),
    ...validResourcePaths(
      directories,
      kind,
      projectInstance,
      configurationName,
    ),
  ];
  const uniqueResourceDirectories = [...new Set(resourceDirectories)];

  return uniqueResourceDirectories.flatMap((dir) =>
    readdirSync(dir)
      .filter((filename) => {
        filenameRegex.lastIndex = 0;
        return filenameRegex.test(filename);
      })
      .map((filename) => resolve(dir, filename))
      .filter(isReadableFile)
      .filter(
        (path) =>
          options?.searchMode !== 'strict' ||
          isStrictResourceFile(kind, path, options?.filterSearchTerms),
      ),
  );
}

function isStrictResourceFile(
  kind: ResourceType | undefined,
  path: string,
  filterSearchTerms?: string[],
) {
  if (kind === 'writer') return isCustomWriter(path);
  if (kind === 'filter') return isPandocFilter(path, filterSearchTerms);
  return true;
}

function isCustomWriter(path: string): boolean {
  return /function\s+(?:Writer|ByteStringWriter)\b|Writer\s*=\s*pandoc[.]scaffolding[.]Writer/.test(
    readFileSync(path, 'utf8'),
  );
}

function isPandocFilter(path: string, filterSearchTerms = ['filter']): boolean {
  const contents = readFileSync(path, 'utf8');
  const initialComments =
    contents.match(/^(?:[ \t\r\n]*(?:--\[\[[\s\S]*?\]\]|--[^\n]*))*/)?.[0] ||
    '';
  return (
    (filterSearchTerms.some((term) =>
      new RegExp(
        `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i',
      ).test(initialComments),
    ) ||
      /---@type\s+Filter\b/i.test(contents)) &&
    /\bpandoc\b/i.test(contents) &&
    /return\s*\{[\s\S]*\}\s*$/.test(contents) &&
    !isCustomWriter(path)
  );
}

export function findResourceFilesWithProvenance(
  directories: BackendDirectories,
  filenameRegex: RegExp,
  options?: Partial<FindResourceFileOptions>,
): ResourceFile[] {
  return findResourceFiles(directories, filenameRegex, options).map((path) => {
    const { provenance, configurationName } = resourceFileProvenance(
      directories,
      path,
      options,
    );
    return {
      path,
      sourcePath: dirname(path),
      provenance,
      ...(configurationName && { configurationName }),
    };
  });
}

function resourceFileProvenance(
  directories: BackendDirectories,
  path: string,
  options?: Partial<FindResourceFileOptions>,
): {
  provenance: ResourceFileProvenance;
  configurationName?: string;
} {
  const project = (
    typeof options?.project === 'string'
      ? JSON.parse(options.project)
      : options?.project
  ) as PundokEditorProject | undefined;
  if (project?.path && isWithinDirectory(project.path, path))
    return { provenance: 'project' };

  const configurationNames = [
    ...(options?.configurationName ? [options.configurationName] : []),
    ...(project?.configurations || []),
  ];
  const configurationName = configurationNames.find((name) =>
    [
      resolve(directories.localConfigurationsDir, name),
      resolve(directories.configurationsDir, name),
      ...(directories.staticResourcesDir
        ? [resolve(directories.staticResourcesDir, 'configs', name)]
        : []),
    ].some((directory) => isWithinDirectory(directory, path)),
  );
  return configurationName
    ? { provenance: 'configuration', configurationName }
    : { provenance: 'common' };
}

function isWithinDirectory(directory: string, path: string): boolean {
  const pathRelativeToDirectory = relative(resolve(directory), resolve(path));
  return (
    pathRelativeToDirectory === '' ||
    (pathRelativeToDirectory !== '..' &&
      !pathRelativeToDirectory.startsWith(
        `..${process.platform === 'win32' ? '\\' : '/'}`,
      ))
  );
}

export function findResourceFile(
  directories: BackendDirectories,
  filename: string,
  options?: Partial<FindResourceFileOptions>,
): string | undefined {
  const filenameRegex = new RegExp(
    `^${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
  );
  return findResourceFiles(directories, filenameRegex, options)[0];
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
