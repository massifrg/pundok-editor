import {
  delimiter as pathDelimiter,
  isAbsolute,
  parse as parsePath,
  resolve,
} from 'node:path';
import { isArray, isObject, isString } from 'lodash-es';
import {
  type CxDocument,
  DEFAULT_IMPORT_PANDOC_OPTIONS,
  documentFormatToInputConverter,
  documentFormatToOutputConverter,
  type DocumentContext,
  type ExternalProgramResult,
  type PandocInputConverter,
  type PandocOutputConverter,
  type PandocMetadata,
  type PandocVariables,
  type PundokEditorProject,
  type ScriptOutputConverter,
  isCustomInputFormat,
  isCustomOutputFormat,
  pandocFilterName,
  pandocFilterToCliOptions,
  pandocOptionsToCliOptions,
} from '../../common/src';
import { expandCommandArgs } from './expandCommandArgs';
import { localizePath } from './filesystem';
import {
  findResourceFile,
  isReadableFile,
  type BackendDirectories,
  type FindResourceFileOptions,
  pandocResourcePath,
  pandocResourceTypes,
  validResourcePaths,
} from './resourceManager';
import {
  externalProgramError,
  runExternalProgram,
  type ProgressCallback,
} from './runExternal';

const INCLUDE_DOC_FILTER = 'include-doc.lua';

export interface ExportOptions {
  cwd: string;
  resourcesPaths: string[];
  sourceFile?: string;
  resultFile: string;
  callback?: ProgressCallback;
  processKey?: string;
}

export async function importWithPandoc(
  directories: BackendDirectories,
  context: DocumentContext,
): Promise<ExternalProgramResult> {
  const { documentFormat, configurationName, path, project, resourcePath } =
    context;
  if (!path) throw new Error("You must provide the document's (file) name");
  const cwd = parsePath(path).dir;
  const filterResourcePaths: string[] = [];
  let customReader = false;

  let pandocOpts = [...DEFAULT_IMPORT_PANDOC_OPTIONS];
  const inputConverter = documentFormatToInputConverter(documentFormat);
  let format = (inputConverter as PandocInputConverter | undefined)?.format;
  if (!format) throw new Error('No Pandoc input format was provided');
  if (inputConverter?.type === 'pandoc')
    pandocOpts = pandocOpts.concat(
      pandocOptionsToCliOptions(inputConverter.pandocOptions || []),
    );

  if (configurationName) {
    pandocOpts = pandocOpts.map((option) =>
      option.replace(
        /^(-L|--lua-filter)\s+(.*?)\s*$/,
        (_match, flag: string, filename: string) => {
          const filter = findResourceFile(directories, filename, {
            kind: 'filter',
            configurationName,
            project,
          });
          if (!filter) return option;
          const directory = parsePath(filter).dir;
          if (!filterResourcePaths.includes(directory))
            filterResourcePaths.push(directory);
          return `${flag} "${filter}"`;
        },
      ),
    );
  }

  if (isCustomInputFormat(format)) {
    customReader = true;
    const reader = findResourceFile(directories, format, {
      kind: 'reader',
      configurationName,
      project,
      baseResourcePaths: [cwd, ...(resourcePath || [])],
    });
    if (!reader)
      throw new Error(
        `Can't find the "${format}" custom reader in document, project or configurations directories!`,
      );
    const readerDir = parsePath(reader).dir;
    const resources = pandocResourcePath(
      directories,
      cwd,
      path,
      project,
      configurationName,
      [...filterResourcePaths, ...(resourcePath || []), readerDir],
      true,
      pandocResourceTypes(pandocOpts, format),
    );
    pandocOpts.push(`--resource-path=${resources}`);
    pandocOpts.push(`--data-dir=${readerDir}`);
    format = encloseInDblQuotes(reader);
  }
  if (!customReader)
    pandocOpts.push(
      `--resource-path=${pandocResourcePath(
        directories,
        cwd,
        path,
        project,
        configurationName,
        [...filterResourcePaths, ...(resourcePath || [])],
        true,
        pandocResourceTypes(pandocOpts, format),
      )}`,
    );

  const args = ['-f', format, '-t', 'json', ...pandocOpts, '--', `"${path}"`];
  const commandLine = `pandoc ${args.join(' ')}`;
  try {
    return await runExternalProgram('pandoc', args, { shell: true, cwd })
      .result;
  } catch (error) {
    return externalProgramError(error, commandLine);
  }
}

async function exportWithExternalProgram(
  command: string,
  args: string[],
  jsonContent: string,
  exportOptions: Partial<ExportOptions>,
): Promise<ExternalProgramResult> {
  const { callback, cwd } = exportOptions;
  const commandLine = `${command}${args.length ? ` ${args.join(' ')}` : ''}`;
  try {
    const { result } = runExternalProgram(
      command,
      args,
      { shell: true, cwd },
      callback,
      jsonContent,
      { key: exportOptions.processKey },
    );
    const output = await result;
    if (output.exitCode === 0) return output;
    throw output.error;
  } catch (error) {
    return externalProgramError(error, commandLine, cwd);
  }
}

/**
 * Call pandoc to convert a JSON source to a file.
 * @param directories
 * @param doc
 * @param exportOptions
 * @returns
 */
export function exportWithPandoc(
  directories: BackendDirectories,
  doc: CxDocument,
  exportOptions: Partial<ExportOptions>,
): Promise<ExternalProgramResult> {
  const { configurationName, content, documentFormat, project } = doc;
  const { resourcesPaths, resultFile: unlocalizedResultFile } = exportOptions;
  const resultFile = unlocalizedResultFile
    ? localizePath(unlocalizedResultFile)
    : undefined;
  const converter = documentFormatToOutputConverter(documentFormat) as
    PandocOutputConverter | undefined;
  if (!converter) return Promise.reject('No Pandoc output converter specified');

  const { format } = converter;
  let pandocOptions = converter.pandocOptions;
  const standalone = pandocOptions?.some(
    ([name, value]) =>
      (name === 'standalone' || name === 's') &&
      (value === undefined || value === true),
  );
  const pandocTemplate = pandocOptions?.find(
    ([name]) => name === 'template',
  )?.[1];
  const referenceFile = pandocOptions?.find(
    ([name]) => name === 'reference-doc',
  )?.[1];
  const findOptions: Partial<FindResourceFileOptions> = {
    baseResourcePaths: [
      parsePath(doc.path || resultFile || '').dir,
      ...(resourcesPaths || []),
    ],
    kind: 'writer',
    project,
    configurationName,
  };
  let pandocOpts: string[] = [];
  const cwd =
    exportOptions.cwd ||
    parsePath(doc.path || resultFile || '').dir ||
    process.cwd();
  const requiredResourcePaths = pandocResourcePath(
    directories,
    cwd,
    doc.path,
    project,
    configurationName,
    [...(resourcesPaths || [])],
    true,
    pandocResourceTypes(
      [
        ...pandocOptionsToCliOptions(pandocOptions || []),
        ...(converter.filters?.length ? ['-L'] : []),
      ],
      undefined,
      format,
    ),
  );
  const dataDir =
    resourcesPaths?.[0] ||
    validResourcePaths(directories, undefined, project, configurationName)[0];
  if (dataDir) pandocOpts.push(`--data-dir=${encloseInDblQuotes(dataDir)}`);

  // if not defined, the output format is JSON
  let outputFormat = format || 'json';

  // when the output format ends with ".lua", it's a custom writer and not a format
  // so look for the custom writer lua file in resource files
  if (isCustomOutputFormat(outputFormat))
    outputFormat =
      findResourceFile(directories, outputFormat, {
        ...findOptions,
        kind: 'writer',
      }) || outputFormat;

  // enclose resultFile in quotes (to protect against spaces)
  if (resultFile) pandocOpts.push(`--output=${encloseInDblQuotes(resultFile)}`);

  // find filters in resource files
  for (const filter of converter.filters || []) {
    const filterName = pandocFilterName(filter);
    const filterFile = findResourceFile(directories, filterName, {
      ...findOptions,
      kind: 'filter',
    });
    pandocOpts = pandocOpts.concat(
      pandocFilterToCliOptions(filter, filterFile),
    );
  }

  pandocOpts.push(`--resource-path=${requiredResourcePaths}`);
  if (standalone) {
    if (typeof pandocTemplate === 'string') {
      const template =
        findResourceFile(directories, pandocTemplate, {
          ...findOptions,
          kind: 'template',
        }) || pandocTemplate;
      pandocOptions = pandocOptions?.map(([name, value]) =>
        name === 'template' ? [name, template] : [name, value],
      );
    }
  }
  if (typeof referenceFile === 'string') {
    const reference =
      findResourceFile(directories, referenceFile, {
        ...findOptions,
        kind: 'referenceDoc',
      }) || referenceFile;
    pandocOptions = pandocOptions?.map(([name, value]) =>
      name === 'reference-doc' ? [name, reference] : [name, value],
    );
  }
  if (isArray(pandocOptions))
    pandocOpts.push(...pandocOptionsToCliOptions(pandocOptions));

  return exportWithExternalProgram(
    'pandoc',
    ['-f', 'json', '-t', outputFormat, ...pandocOpts, '--', '-'],
    content,
    exportOptions,
  );
}

export async function exportWithScript(
  doc: CxDocument,
  exportOptions: Partial<ExportOptions>,
): Promise<ExternalProgramResult> {
  const converter = documentFormatToOutputConverter(doc.documentFormat) as
    ScriptOutputConverter | undefined;
  if (!converter) throw new Error('no output converter specified');
  let { command, commandArgs } = converter;
  if (!command) throw new Error('this converter has no command to run');
  const commandCwd =
    exportOptions.cwd || parsePath(exportOptions.sourceFile || '').dir;
  if (!isAbsolute(command)) command = resolve(commandCwd, command);
  return exportWithExternalProgram(
    command,
    expandCommandArgs(commandArgs || [], {
      path: exportOptions.sourceFile,
      project: doc.project,
    }),
    doc.content,
    exportOptions,
  );
}

export async function runWriterOnMasterFile(
  directories: BackendDirectories,
  editorProject: string | PundokEditorProject,
  writerFilename: string,
  options?: { metadata?: PandocMetadata; variables?: PandocVariables },
): Promise<string | undefined> {
  const project = isString(editorProject)
    ? (JSON.parse(editorProject) as PundokEditorProject)
    : editorProject;
  if (!project?.path || !project.rootDocument) return undefined;
  const path = localizePath(project.path);
  const source = resolve(path, localizePath(project.rootDocument));
  if (!isAbsolute(source) || !isReadableFile(source))
    throw new Error(`"${source}" is not a readable absolute path`);

  const writer = findResourceFile(directories, localizePath(writerFilename), {
    kind: 'writer',
  });
  const includeDocFilter = findResourceFile(directories, INCLUDE_DOC_FILTER, {
    kind: 'filter',
  });
  if (!writer || !includeDocFilter) return undefined;

  const args = ['-f', 'json', '-t', writer, '-L', includeDocFilter];
  args.push(`--data-dir=${encloseInDblQuotes(path)}`);
  for (const [name, value] of Object.entries(options?.variables || {})) {
    args.push('-V');
    const quote = isArray(value) || isObject(value) ? "'" : '';
    args.push(`${name}=${quote}${JSON.stringify(value)}${quote}`);
  }
  for (const [name, value] of Object.entries(options?.metadata || {})) {
    args.push('-M', `${name}=${JSON.stringify(value)}`);
  }
  args.push(
    `--resource-path=${pandocResourcePath(
      directories,
      path,
      source,
      project,
      undefined,
      [],
      true,
      pandocResourceTypes(['-L'], undefined, writerFilename),
    )}`,
  );
  const result = await runPandocOnFile(source, args);
  if (result.exitCode !== 0) throw new Error(result.error);
  return result.output;
}

async function runPandocOnFile(
  path: string,
  options: string[],
): Promise<ExternalProgramResult> {
  const args = [...options, '--', `"${path}"`];
  const commandLine = `pandoc ${args.join(' ')}`;
  try {
    return await runExternalProgram('pandoc', args, {
      shell: true,
      cwd: parsePath(path).dir,
    }).result;
  } catch (error) {
    return externalProgramError(error, commandLine, parsePath(path).dir);
  }
}

function encloseInDblQuotes(value: string): string {
  return `"${value}"`;
}
