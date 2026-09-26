import { readFile, writeFile } from 'fs/promises';
import {
  delimiter,
  join as joinPath,
  parse as parsePath,
  resolve,
  sep as pathSeparator,
} from 'path';
import { HARDCODED_CONFIG_NAME, getPundokVersion } from './common';
import {
  allConfigurations as listBackendConfigurations,
  createBackendDirectories,
  findResourceFile as findBackendResourceFile,
  getConfigurationInit as readBackendConfigurationInit,
  isReadableDir,
  isReadableFile,
  parseConfigurationFiles as parseBackendConfigurationFiles,
  type ConfigurationFile,
  type FindResourceFileOptions,
  validResourcePaths as getBackendResourcePaths,
  validResourceSubpaths,
} from '../../backend/src';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { app, dialog } from 'electron';
import * as unzipStream from 'unzip-stream';
import * as zipLib from 'zip-lib';
import { STATIC_RESOURCES_DIR } from './staticResources';
import { stringify } from './utils';

export { isReadableDir, isReadableFile, validResourceSubpaths };
export type { FindResourceFileOptions };

const APP_DATA_DIR = 'pundok-editor';
const CONFIGS_DIR = 'configs';
const LOCAL_CONFIGS_DIR = 'localconfigs';
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
 * The directory containing the global configurations.
 * @returns
 */
export function configsDir(): string {
  return resolve(userAppDataDir(), CONFIGS_DIR);
}

/**
 * The directory containing the local configurations.
 * @returns
 */
export function localConfigsDir(): string {
  return resolve(userAppDataDir(), LOCAL_CONFIGS_DIR);
}

/**
 * Creates user's and app directories.
 */
export function checkAndCreateAppDataDir() {
  checkAndAddFolder(userAppDataDir());
  checkAndAddFolder(configsDir());
  checkAndAddFolder(localConfigsDir());
}

function backendDirectories() {
  return createBackendDirectories(userAppDataDir(), configsDir());
}

/**
 * Parse the available configurations.
 * @param options Options to select only a subset of the configurations.
 * @returns
 */
export async function allConfigurations(
  options?: import('./common').ConfigQueryOptions,
): Promise<ConfigurationFile[]> {
  return listBackendConfigurations(backendDirectories(), options);
}

/**
 * Read and parse all the configurations in the configuration's directories.
 * @returns
 */
export async function parseConfigurationFiles(
  options?: import('./common').ConfigQueryOptions,
) {
  return parseBackendConfigurationFiles(backendDirectories(), options);
}

/**
 * Read the contents of the configuration file of a configuration passed by name.
 * @param configurationName The name of the configuration to read.
 * @returns
 */
export async function getConfigurationInit(
  configurationName?: string,
): Promise<import('./common').PundokEditorConfigInit | undefined> {
  return readBackendConfigurationInit(backendDirectories(), configurationName);
}

export function validResourcePaths(
  kind?: import('./common').ResourceType,
  project?: import('./common').PundokEditorProject,
  configurationName?: string,
): string[] {
  return getBackendResourcePaths(
    backendDirectories(),
    kind,
    project,
    configurationName,
  );
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
  return findBackendResourceFile(backendDirectories(), filename, options);
}

function startupFilename(): string {
  return resolve(userAppDataDir(), STARTUP_FILENAME);
}

export function existsStartupFile(): boolean {
  return existsSync(startupFilename());
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
      env: {},
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
    JSON.stringify(startup, undefined, 2),
  );
}

/**
 * @returns A modified process environment, for example to add paths to the PATH variable
 *          (reading from the startup file).
 */
export async function getExtendedEnvironment(): Promise<
  Record<string, string | undefined>
> {
  try {
    const env = { ...process.env };
    const startup = await getStartup();
    if (startup.env) {
      Object.entries(startup.env).forEach(([varName, value]) => {
        if (varName === 'PATH' && env.PATH) {
          env.PATH = env.PATH + delimiter + value;
        } else {
          env[varName] = value;
        }
      });
    }
    return env;
  } catch (err) {
    return Promise.reject(stringify(err));
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
        fixedPath = resolve(userAppDataDir(), CONFIGS_DIR, fixedPath);
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
 * Save a backup of all the gloabl configurations' files into a zip file.
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
