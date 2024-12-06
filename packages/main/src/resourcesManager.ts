import { readdir, readFile } from 'fs/promises';
import {
  join as joinPath,
  parse as parsePath,
  sep as pathSeparator,
} from 'path';
import { isString } from 'lodash';
import {
  PandocEditorConfigInit,
  HARDCODED_CONFIG_NAME,
  PandocEditorProject,
  version,
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
import { Parse as ParseZipStream } from 'unzip-stream';
import { archiveFolder } from 'zip-lib';
import { STATIC_RESOURCES_DIR } from './staticResources';

//var FindFiles = require("node-find-files").default;

const APP_DATA_DIR = 'pundok-editor';
const CONFIGS_DIR = 'configs';
const STARTUP_FILENAME = 'startup.json';

function checkAndAddFolder(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path);
  }
}

// function checkContextPath() {
//   /*var finder = new FindFiles({
//       rootFolder : "c:",
//       //fileName : d
//   });

//   finder.on("match", function(strPath: any, stat: any) {
//       console.log(strPath + " - " + stat.mtime);
//   })
//   finder.on("complete", function() {
//       console.log("Finished")
//   })
//   finder.on("patherror", function(err: any, strPath: any) {
//       console.log("Error for Path " + strPath + " " + err)  // Note that an error in accessing a particular file does not stop the whole show
//   })
//   finder.on("error", function(err: any) {
//       console.log("Global Error " + err);
//   })
//   finder.startSearch();*/

//   const finder = require('findit').find(__dirname);
//   finder.on('file', function (file: any) {
//     // console.log('File: ' + file);
//   });
// }

// type DirName = "appData" | "userData" | "exe" | "temp" | "documents" | "desktop" | "downloads" | "home" | "sessionData" | "module" | "music" | "pictures" | "videos" | "recent" | "logs" | "crashDumps"
// const DIRS: DirName[] = ['appData', 'userData', 'exe', 'temp', 'documents', 'desktop', 'downloads']

export function staticResourcesDir() {
  // DIRS.forEach(name => {
  //   console.log(`getPath('${name}'): ${app.getPath(name)}`)
  // })
  let basePath = app.getAppPath();
  let prevPath = undefined;
  while (
    basePath !== prevPath &&
    !existsSync(basePath + pathSeparator + STATIC_RESOURCES_DIR)
  ) {
    prevPath = basePath;
    basePath = parsePath(basePath).dir;
  }
  const staticPath = (basePath += pathSeparator + STATIC_RESOURCES_DIR);
  console.log(`static resources path: ${staticPath}`);
  return staticPath;
}

export function userAppDataDir() {
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

export function configsDir() {
  return `${userAppDataDir()}${pathSeparator}${CONFIGS_DIR}`;
}

export function configDir(configurationName: string) {
  return `${configsDir()}${pathSeparator}${configurationName}`;
}

export function checkAndCreateAppDataDir() {
  checkAndAddFolder(userAppDataDir());
  checkAndAddFolder(configsDir());
}

export async function parseConfigurationFiles(): Promise<
  PandocEditorConfigInit[]
> {
  const path = configsDir();
  const filenames = (await readdir(path)).filter((f) =>
    f.endsWith('.config.json'),
  );
  // console.log(filenames);
  const parsed = filenames
    .map((fn) => readFileSync(`${path}${pathSeparator}${fn}`).toString())
    .map((content) => {
      try {
        return JSON.parse(content);
      } catch (err) {
        return null;
      }
    });
  const valid = parsed.filter((p) => !!p) as PandocEditorConfigInit[];
  return valid;
}

function resourcePaths(base: string, kind?: ResourceType): string[] {
  let dd: string[] = [base];
  if (kind)
    dd = dd.concat(
      (RESOURCE_SUBPATHS[kind] || []).map(
        (subdir) => `${base}${pathSeparator}${subdir}`,
      ),
    );
  return dd;
}

export function isReadableFile(filename: string) {
  return existsSync(filename) && statSync(filename).isFile();
}

export function validResourcePaths(
  kind?: ResourceType,
  project?: PandocEditorProject,
  configurationName?: string,
): string[] {
  const findValidPaths = (base?: string) =>
    (base &&
      resourcePaths(base, kind).filter(
        (d) => existsSync(d) && statSync(d).isDirectory(),
      )) ||
    [];

  const configsdir = configsDir();
  let searchpaths: string[] = [];
  // 1. try the project path
  if (project?.path)
    searchpaths = searchpaths.concat(findValidPaths(project.path));
  // 2. try the configurationName when there's no project
  if (!project?.path && configurationName)
    searchpaths = searchpaths.concat(
      findValidPaths(`${configsdir}${pathSeparator}${configurationName}`),
    );
  // 3. try the configurations inherited by the project, in reverse order
  if (project?.configurations) {
    console.log(`inherited configurations: ${project.configurations.join()}`);
    const reversed = project.configurations.map((c) => c).reverse();
    reversed.forEach((configName) => {
      searchpaths = searchpaths.concat(
        findValidPaths(`${configsdir}${pathSeparator}${configName}`),
      );
    });
  }
  // 4. try the application data dir
  searchpaths = searchpaths.concat(findValidPaths(userAppDataDir()));
  return searchpaths;
}

export function validResourceSubpaths(
  baseResourcePaths: string[],
  kind?: ResourceType,
): string[] {
  let paths: string[] = [];
  baseResourcePaths.forEach((basepath) => {
    const subdirs = (kind && RESOURCE_SUBPATHS[kind]) || [];
    paths = paths.concat(
      subdirs.map((subdir) => `${basepath}${pathSeparator}${subdir}`),
    );
  });
  return paths.filter((p) => existsSync(p) && statSync(p).isDirectory());
}

export interface FindResourceFileOptions extends FindResourceOptions {
  baseResourcePaths: string[];
}

export function findResourceFile(
  filename: string,
  options?: Partial<FindResourceFileOptions>,
): string | undefined {
  const { kind, baseResourcePaths, project, configurationName } = options || {};

  const findFilename = (base?: string) =>
    base && isReadableFile(`${base}${pathSeparator}${filename}`);

  let resourcePath: string | undefined = undefined;
  if (baseResourcePaths && kind) {
    resourcePath = validResourceSubpaths(baseResourcePaths, kind).find((d) =>
      isReadableFile(`${d}${pathSeparator}${filename}`),
    );
    resourcePath =
      resourcePath ||
      baseResourcePaths.find((d) =>
        isReadableFile(`${d}${pathSeparator}${filename}`),
      );
  }
  console.log('VALID RESOURCE PATHS');
  const projectInstance = (
    project && isString(project)
      ? (JSON.parse(project) as PandocEditorProject)
      : project
  ) as PandocEditorProject | undefined;
  console.log(validResourcePaths(kind, projectInstance, configurationName));
  resourcePath =
    resourcePath ||
    validResourcePaths(kind, projectInstance, configurationName).find((p) =>
      findFilename(p),
    );
  console.log(`resourcePath=${resourcePath}`);
  return resourcePath && `${resourcePath}${pathSeparator}${filename}`;
}

export interface StartupConfiguration {
  version: string;
  configuration: string;
}

export async function getStartup(): Promise<StartupConfiguration> {
  console.log(`app.getAppPath(): ${app.getAppPath()}`);

  try {
    const buf = await readFile(
      `${userAppDataDir()}${pathSeparator}${STARTUP_FILENAME}`,
    );
    const startup = JSON.parse(buf.toString()) as StartupConfiguration;
    return startup;
  } catch (err) {
    return Promise.resolve({
      version: version(),
      configuration: HARDCODED_CONFIG_NAME,
    });
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

export async function loadConfigurationsFromFile(filename: string) {
  createReadStream(filename)
    .pipe(ParseZipStream())
    .on('entry', function (entry) {
      let fixedPath = fixOlderConfigsFilename(entry.path);
      if (fixedPath) {
        fixedPath =
          userAppDataDir() +
          pathSeparator +
          CONFIGS_DIR +
          pathSeparator +
          fixedPath;
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

export async function saveConfigurationsToFile(filename: string) {
  const dir = configsDir();
  console.log(`dir=${dir}, zipfile=${filename}`);
  await archiveFolder(dir, filename);
}

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
