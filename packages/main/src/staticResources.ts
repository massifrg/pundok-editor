import { default as axios } from 'axios';
import { sep as pathSep } from 'path';
import { existsSync, statSync } from 'fs';
import { cp, mkdir, writeFile } from 'fs/promises';
import { staticResourcesDir, userAppDataDir } from './resourcesManager';

export const STATIC_RESOURCES_DIR = 'staticResources';

/** A static resource (e.g. a downloadable lua filter to be used by the editor). */
interface StaticResource {
  /** The base URL where to find the file (usually in a github repo). */
  baseURL: string;
  /** An optional description of the resources found at the baseURL. */
  description?: string;
  /** The files to be downloaded. */
  resources: {
    /** The remote file (relative to baseURL). */
    file: string;
    /** The destination path in the directory of static resources. */
    destPath?: string;
    /** An optional description of the file. */
    description?: string;
  }[];
}

const STATIC_RESOURCES: StaticResource[] = [
  {
    description: 'Lua filters and writers to include sub-documents in Pandoc',
    baseURL:
      'https://raw.githubusercontent.com/massifrg/pandoc-include-doc/main/src',
    resources: [
      {
        description: 'pandoc lua filter to include other documents',
        file: 'include-doc.lua',
      },
      {
        description:
          "pandoc lua writer to get a JSON representation of the inclusions' tree of a document",
        file: 'inclusion-tree.lua',
      },
    ],
  },
  {
    description: 'Lua filters and writers to create indices in Pandoc',
    baseURL:
      'https://raw.githubusercontent.com/massifrg/pandoc-export-index/main/src',
    resources: [
      {
        description: 'lua filter to export the index of a document in DOCX',
        file: 'docx_index.lua',
      },
      {
        description: 'lua writer to create an ICML file with an index',
        file: 'icml_with_index.lua',
      },
      {
        description:
          'lua writer to get a JSON representation of the indices of a document',
        file: 'indices2json.lua',
      },
      {
        description: 'lua filter to export the index of a document in ODT',
        file: 'odt_index.lua',
      },
      {
        description:
          'base lua functions for Pandoc filters and writers for indices',
        file: 'pandoc-indices.lua',
      },
      {
        description:
          'lua filter to create an index from a list of words (paragraphs)',
        file: 'paras_to_index_terms.lua',
      },
      {
        description:
          'lua filter to compile raw indices from index references in a document',
        file: 'compile_raw_indices.lua',
      },
      {
        description: 'lua filter to sort indices',
        file: 'sort_indices.lua',
      },
      {
        description: 'lua filter to assign identifiers on index terms',
        file: 'assign_ids_to_index_terms.lua',
      },
    ],
  },
  {
    description:
      'Lua type annotations for the development of Pandoc filters, writers, readers with Code/Codium and Lua Language Server',
    baseURL:
      'https://raw.githubusercontent.com/massifrg/pandoc-luals-annotations/main/src',
    resources: [
      {
        description:
          'type annotations to ease the development of Pandoc Lua filters and custom readers/writers with Lua Language Server',
        file: 'pandoc-types-annotations.lua',
      },
    ],
  },
  {
    description: 'Logging functions for Lua by William Lupton',
    baseURL: 'https://raw.githubusercontent.com/pandoc-ext/logging/main',
    resources: [
      {
        description: 'pandoc-aware logging functions © 2022 William Lupton',
        file: 'logging.lua',
      },
    ],
  },
  {
    description: 'Pandoc Quoted conversion in many languages',
    baseURL: 'https://raw.githubusercontent.com/odkr/pandoc-quotes.lua/main',
    resources: [
      {
        description:
          'Conversion of Quoted in many languages © 2018 Odin Kroeger',
        file: 'pandoc-quotes.lua',
      },
    ],
  },
];

function getResourceSubdir(filename: string, subPath?: string): string {
  let sp = subPath;
  while (sp?.startsWith(pathSep)) {
    sp = sp.substring(1);
  }
  if (!sp) {
    if (filename.endsWith('.lua')) sp = 'lua';
    else if (filename.endsWith('.css')) sp = 'css';
  }
  return sp || '';
}

const nullLogger: (msg: string) => void = () => {};

/**
 * Updates the static resources needed by the editor on the file system.
 * @param log a function that receives the log messages of this function.
 */
export function updateStaticResources(
  log: (msg: string) => void = nullLogger,
  resDir?: string,
) {
  const resPath = resDir || userAppDataDir();

  STATIC_RESOURCES.forEach((sr) => {
    const { baseURL, resources } = sr;
    log(sr.description || `resource from "${baseURL}"`);
    resources.forEach(async (r) => {
      log(`- ${r.description || r.file}`);
      try {
        const response = await axios.get(`${baseURL}/${r.file}`);
        const subdir = getResourceSubdir(r.file, r.destPath);
        const subdirPath = `${resPath}${pathSep}${subdir}`;
        if (!existsSync(subdirPath))
          await mkdir(subdirPath, { recursive: true });
        const filename = `${subdirPath}${pathSep}${r.file}`;
        await writeFile(filename, response.data);
      } catch (err: any) {
        log(err.toString());
      }
    });
  });
}

/**
 * Copy needed resources from the installation directory to the user directory.
 * It does not overwrite existing files, that may have been updated from the
 * software installation.
 */
export function copyMissingStaticResourcesInUserDir(
  log: (msg: string) => void = nullLogger,
) {
  const from = staticResourcesDir();
  const to = userAppDataDir();
  cp(from, to, {
    dereference: true,
    errorOnExist: false,
    preserveTimestamps: true,
    force: true,
    recursive: true,
    filter(source, destination) {
      const isMissing = !existsSync(destination);
      const isDirectory = !isMissing && statSync(destination).isDirectory();
      const isNewer =
        !isMissing && statSync(destination).mtime < statSync(source).mtime;
      const doCopy = isMissing || isDirectory || isNewer;
      if (doCopy && !isDirectory)
        log(
          `copying ${isNewer ? 'updated' : 'missing'} resource from "${source}" to "${destination}"`,
        );
      return doCopy;
    },
  });
}
