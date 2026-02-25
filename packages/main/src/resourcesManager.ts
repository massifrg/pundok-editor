import { readdir, readFile, writeFile } from 'fs/promises';
import {
  delimiter,
  join as joinPath,
  parse as parsePath,
  resolve,
  sep as pathSeparator,
} from 'path';
import { isString } from 'lodash-es';
import {
  PundokEditorConfigInit,
  HARDCODED_CONFIG_NAME,
  PundokEditorProject,
  getPundokVersion,
  FindResourceOptions,
  ResourceType,
  RESOURCE_SUBPATHS,
} from './common';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from 'fs';
import { app, dialog } from 'electron';
import * as unzipStream from 'unzip-stream';
import * as zipLib from 'zip-lib';
import { STATIC_RESOURCES_DIR } from './staticResources';
import { stringify } from './utils';

const APP_DATA_DIR = 'pundok-editor';
const CONFIGS_DIR = 'configs';
const STARTUP_FILENAME = 'startup.json';

/**
 * The structure of `startup.json`, the first file that is read in the app directory.
 */
export interface StartupConfiguration {
  /** The version of pundok-editor. */
  version: string;
  /** The name of the configuration to start with. */
  configuration: string;
  /** A complement for the variables in the process environment. */
  env: Record<string, string>;
}

function checkAndAddFolder(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path);
  }
}

/**
 * The directory of the static resources of the program.
 */
export function staticResourcesDir(): string {
  let basePath = app.getAppPath();
  let prevPath = undefined;
  while (
    basePath !== prevPath &&
    !existsSync(resolve(basePath, STATIC_RESOURCES_DIR))
  ) {
    prevPath = basePath;
    basePath = parsePath(basePath).dir;
  }
  const staticPath = resolve(basePath, STATIC_RESOURCES_DIR);
  console.log(`static resources path: ${staticPath}`);
  return staticPath;
}

/**
 * The app data directory in the user's directories.
 * @returns
 */
export function userAppDataDir(): string {
  // return app.getPath('userData')
  const homedir = process.env.HOME;
  switch (process.platform) {
    case 'win32':
      return process.env.APPDATA
        ? joinPath(process.env.APPDATA, APP_DATA_DIR)
        : APP_DATA_DIR;
    case 'linux':
      return homedir
        ? joinPath(homedir, '.local', 'share', APP_DATA_DIR)
        : APP_DATA_DIR;
    case 'darwin':
      return homedir
        ? joinPath(homedir, 'Library', 'Application Support', APP_DATA_DIR)
        : APP_DATA_DIR;
    default:
      return homedir ? joinPath(homedir, APP_DATA_DIR) : APP_DATA_DIR;
  }
}

/**
 * The directory containing all the configurations.
 * @returns 
 */
export function configsDir(): string {
  return resolve(userAppDataDir(), CONFIGS_DIR);
}

/**
 * The path of the a configuration directory.
 * @param configurationName The name of the configuration.
 */
export function configDir(configurationName: string) {
  return resolve(configsDir(), configurationName);
}

/**
 * Creates user's and app directories.
 */
export function checkAndCreateAppDataDir() {
  checkAndAddFolder(userAppDataDir());
  checkAndAddFolder(configsDir());
}

/**
 * Read and parse all the configurations in the configuration's directory.
 * @returns
 */
export async function parseConfigurationFiles(): Promise<PundokEditorConfigInit[]> {
  const path = configsDir();
  const filenames = (await readdir(path)).filter((f) =>
    f.endsWith('.config.json'),
  );
  // console.log(filenames);
  const parsed = filenames
    .map((fn) => readFileSync(resolve(path, fn)).toString())
    .map((content) => {
      try {
        return JSON.parse(content);
      } catch (err) {
        return null;
      }
    });
  const valid = parsed.filter((p) => !!p) as PundokEditorConfigInit[];
  return valid;
}

/**
 * All the paths where a particular kind of resource may be found.
 * @param base The base directory (usually of a configuration).
 * @param kind The kind of resources you are looking for. 
 * @returns 
 */
function resourcePaths(base: string, kind?: ResourceType): string[] {
  let dd: string[] = [base];
  if (kind)
    dd = dd.concat((RESOURCE_SUBPATHS[kind] || []).map((subdir) => resolve(base, subdir)));
  return dd;
}

/**
 * Check whether a file (not a directory!) path exists and it's readable.
 * @param filename
 * @returns 
 */
export function isReadableFile(filename: string): boolean {
  return existsSync(filename) && statSync(filename).isFile();
}

/**
 * Check whether a directory (not a file!) path exists and it's readable.
 * @param dir 
 */
export function isReadableDir(dir: string): boolean {
  return existsSync(dir) && statSync(dir).isDirectory()
}

/**
 * Lists all the paths where a resource file of a particular kind may be found.
 * @param kind The type of resource you are looking for.
 * @param project The optional project.
 * @param configurationName The name of an optional configuration.
 * @returns 
 */
export function validResourcePaths(
  kind?: ResourceType,
  project?: PundokEditorProject,
  configurationName?: string,
): string[] {
  const findValidPaths = (base?: string) =>
    (base && resourcePaths(base, kind).filter((d) => isReadableDir(d)))
    || [];

  const configsdir = configsDir();
  let searchpaths: string[] = [];
  // 1. try the project path
  if (project?.path)
    searchpaths = searchpaths.concat(findValidPaths(project.path));
  // 2. try the configurationName when there's no project
  if (!project?.path && configurationName)
    searchpaths = searchpaths.concat(
      findValidPaths(resolve(configsdir, configurationName)),
    );
  // 3. try the configurations inherited by the project, in reverse order
  if (project?.configurations) {
    console.log(`inherited configurations: ${project.configurations.join()}`);
    const reversed = project.configurations.map((c) => c).reverse();
    reversed.forEach((configName) => {
      searchpaths = searchpaths.concat(findValidPaths(resolve(configsdir, configName)));
    });
  }
  // 4. try the application data dir
  searchpaths = searchpaths.concat(findValidPaths(userAppDataDir()));
  return searchpaths;
}

/**
 * Given a list of paths, makes a list of subpaths where a particular kind of resource may be found.
 * @param baseResourcePaths The list of base paths.
 * @param kind The kind of resource you are looking for.
 * @returns 
 */
export function validResourceSubpaths(
  baseResourcePaths: string[],
  kind?: ResourceType,
): string[] {
  let paths: string[] = [];
  baseResourcePaths.forEach((basepath) => {
    const subdirs = (kind && RESOURCE_SUBPATHS[kind]) || [];
    paths = paths.concat(subdirs.map((subdir) => resolve(basepath, subdir)));
  });
  return paths.filter((p) => isReadableDir(p));
}

export interface FindResourceFileOptions extends FindResourceOptions {
  baseResourcePaths: string[];
}

/**
 * Look for a resource file with a given filename (without directory path).
 * @param filename The name of the file to look for.
 * @param options Kind of file, base paths, project, configuration name.
 * @returns The first path found with that name, or `undefined` if not found.
 */
export function findResourceFile(
  filename: string,
  options?: Partial<FindResourceFileOptions>,
): string | undefined {
  const { kind, baseResourcePaths, project, configurationName } = options || {};

  const findFilename = (base?: string) =>
    base && isReadableFile(resolve(base, filename));

  let resourcePath: string | undefined = undefined;
  if (baseResourcePaths && kind) {
    resourcePath = validResourceSubpaths(baseResourcePaths, kind).find((d) =>
      isReadableFile(resolve(d, filename)),
    );
    resourcePath = resourcePath ||
      baseResourcePaths.find((d) => isReadableFile(resolve(d, filename)));
  }
  console.log('VALID RESOURCE PATHS');
  const projectInstance = (
    project && isString(project)
      ? (JSON.parse(project) as PundokEditorProject)
      : project
  ) as PundokEditorProject | undefined;
  console.log(validResourcePaths(kind, projectInstance, configurationName));
  resourcePath =
    resourcePath ||
    validResourcePaths(kind, projectInstance, configurationName).find((p) =>
      findFilename(p),
    );
  console.log(`resourcePath=${resourcePath}`);
  return resourcePath && resolve(resourcePath, filename);
}

function startupFilename(): string {
  return resolve(userAppDataDir(), STARTUP_FILENAME)
}

export function existsStartupFile(): boolean {
  return existsSync(startupFilename())
}

/**
 * Get the contents of the program's startup file.
 * @returns 
 */
export async function getStartup(): Promise<StartupConfiguration> {
  console.log(`app.getAppPath(): ${app.getAppPath()}`);
  try {
    const buf = await readFile(startupFilename());
    const startup = JSON.parse(buf.toString()) as StartupConfiguration;
    return startup;
  } catch (err) {
    return Promise.resolve({
      version: getPundokVersion(),
      configuration: HARDCODED_CONFIG_NAME,
      env: {}
    });
  }
}

/**
 * Overwrites the program's startup file.
 * @param startup 
 * @returns 
 */
export async function updateStartup(startup: StartupConfiguration) {
  return await writeFile(
    resolve(userAppDataDir(), STARTUP_FILENAME),
    JSON.stringify(startup, undefined, 2)
  )
}

/**
 * @returns A modified process environment, for example to add paths to the PATH variable
 *          (reading from the startup file).
 */
export async function getExtendedEnvironment(): Promise<Record<string, string | undefined>> {
  try {
    const env = { ...process.env }
    const startup = await getStartup()
    if (startup.env) {
      Object.entries(startup.env).forEach(([varName, value]) => {
        if (varName === 'PATH' && env.PATH) {
          env.PATH = env.PATH + delimiter + value
        } else {
          env[varName] = value
        }
      })
    }
    return env
  } catch (err) {
    return Promise.reject(stringify(err))
  }
}

const REMOVED_PREFIXES_OLDER_CONFIGS = [
  'pandoc-editor/configs/',
  'pundok-editor/configs/',
];
const IGNORED_PATTERNS_OLDER_CONFIGS = [
  '^p[au]ndo[ck]-editor/$',
  '^p[au]ndo[ck]-editor/startup.json$',
  '^p[au]ndo[ck]-editor/configs/test.config.json$',
  '^p[au]ndo[ck]-editor/(css|lua|filters|readers|writers)/.*',
];
/**
 * Fixes paths in configurations before version 0.10.0.
 * @param filePath
 * @returns a corrected path or `undefined` if the file is to be filtered out.
 */
function fixOlderConfigsFilename(outPath: string): string | undefined {
  let p = outPath;
  if (IGNORED_PATTERNS_OLDER_CONFIGS.find((pattern) => p.match(pattern)))
    return undefined;
  REMOVED_PREFIXES_OLDER_CONFIGS.forEach((rp) => {
    if (p.startsWith(rp)) p = p.substring(rp.length);
  });
  while (p.startsWith(pathSeparator)) p = p.substring(1);
  return p;
}

/**
 * Unpack all the configurations from a zip file into the configurations' directory.
 * @param filename The name of the file with the configurations
 *                 (eventually saved with {@link saveConfigurationsToFile}).
 */
export async function loadConfigurationsFromFile(filename: string) {
  createReadStream(filename)
    .pipe(unzipStream.Parse())
    .on('entry', function (entry) {
      let fixedPath = fixOlderConfigsFilename(entry.path);
      if (fixedPath) {
        fixedPath = resolve(userAppDataDir(), CONFIGS_DIR, fixedPath)
        // console.log(`"${entry.path}" -> "${fixedPath}"`);
        switch (entry.type) {
          case 'File':
            {
              const dir = parsePath(fixedPath).dir;
              if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
            }
            entry.pipe(createWriteStream(fixedPath));
            break;
          case 'Directory':
            if (!existsSync(fixedPath))
              mkdirSync(fixedPath, { recursive: true });
            entry.autodrain();
            break;
          default:
            entry.autodrain();
        }
      }
    });
}

/**
 * Ask the name of a zip file containing a backup of the configurations.
 * When the file is valid, it unpacks its contents in the configurations' directory.
 */
export async function askAndLoadConfFromFile() {
  try {
    const res = await dialog.showOpenDialog({
      defaultPath: process.env.HOME,
      filters: [
        {
          name: 'zip files',
          extensions: ['zip'],
        },
      ],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      await loadConfigurationsFromFile(res.filePaths[0]);
    }
  } catch (err) {
    // console.log(err);
  }
}

/**
 * Save a backup of all the configurations' files into zip file.
 * See also {@link loadConfigurationsFromFile}.
 * @param filename 
 */
export async function saveConfigurationsToFile(filename: string) {
  const dir = configsDir();
  console.log(`dir=${dir}, zipfile=${filename}`);
  await zipLib.archiveFolder(dir, filename);
}

/**
 * Ask the name of a zip file where to store a backup of the configurations.
 */
export async function askAndSaveConfToFile() {
  try {
    const res = await dialog.showSaveDialog({
      defaultPath: process.env.HOME,
      filters: [
        {
          name: 'zip files',
          extensions: ['zip'],
        },
      ],
    });
    if (!res.canceled && res.filePath) {
      await saveConfigurationsToFile(res.filePath);
    }
  } catch (err) {
    // console.log(err);
  }
}
