import { existsSync } from 'node:fs';
import { delimiter as pathDelimiter, format as formatPath, isAbsolute, parse as parsePath, resolve } from 'node:path';
import { isArray, isObject, isString } from 'lodash-es';
import {
  type CxDocument,
  DEFAULT_IMPORT_PANDOC_OPTIONS,
  documentFormatToInputConverter,
  documentFormatToOutputConverter,
  type DocumentContext,
  type ExternalProgramResult,
  type OutputConverter,
  type PandocInputConverter,
  type PandocOutputConverter,
  type PandocMetadata,
  type PandocVariables,
  type PundokEditorProject,
  type ScriptOutputConverter,
} from '../../common/src';
import { expandCommandArgs } from './expandCommandArgs';
import { localizePath } from './filesystem';
import {
  findResourceFile,
  isReadableFile,
  type BackendDirectories,
  type FindResourceFileOptions,
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
}

export async function importWithPandoc(
  directories: BackendDirectories,
  context: DocumentContext,
): Promise<ExternalProgramResult> {
  const { documentFormat, configurationName, path, project, resourcePath } =
    context;
  if (!path) throw new Error("You must provide the document's (file) name");

  let pandocOpts = [...DEFAULT_IMPORT_PANDOC_OPTIONS];
  const inputConverter = documentFormatToInputConverter(documentFormat);
  let format = (inputConverter as PandocInputConverter | undefined)?.format;
  if (!format) throw new Error('No Pandoc input format was provided');
  if (inputConverter?.type === 'pandoc')
    pandocOpts = pandocOpts.concat(inputConverter.pandocOptions || []);

  if (configurationName) {
    const resourceDirs: string[] = [];
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
          if (!resourceDirs.includes(directory))
            resourceDirs.push(`"${directory}"`);
          return `${flag} "${filter}"`;
        },
      ),
    );
    if (resourceDirs.length)
      pandocOpts.push(`--resource-path=${resourceDirs.join(pathDelimiter)}`);
  }

  if (format.toLowerCase().endsWith('.lua')) {
    const customReader = findResourceFile(directories, format, {
      kind: 'reader',
      configurationName,
      project,
      baseResourcePaths: resourcePath || [],
    });
    if (!customReader)
      throw new Error(
        `Can't find the "${format}" custom reader in document, project or configurations directories!`,
      );
    const readerDir = parsePath(customReader).dir;
    const resources = [...(resourcePath || []), readerDir]
      .map(encloseInDblQuotes)
      .join(pathDelimiter);
    pandocOpts.push(`--resource-path=${resources}`);
    pandocOpts.push(`--data-dir=${readerDir}`);
    format = encloseInDblQuotes(customReader);
  }

  const args = ['-f', format, '-t', 'json', ...pandocOpts, '--', `"${path}"`];
  const commandLine = `pandoc ${args.join(' ')}`;
  try {
    return await runExternalProgram('pandoc', args, { shell: true }).result;
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
    );
    const output = await result;
    if (output.exitCode === 0) return output;
    throw output.error;
  } catch (error) {
    return externalProgramError(error, commandLine, cwd);
  }
}

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
    | PandocOutputConverter
    | undefined;
  if (!converter) return Promise.reject('No Pandoc output converter specified');

  const { format, pandocOptions, pandocTemplate, referenceFile, standalone } =
    converter;
  const findOptions: Partial<FindResourceFileOptions> = {
    baseResourcePaths: resourcesPaths || [],
    kind: 'writer',
    project,
    configurationName,
  };
  const pandocOpts: string[] = [];
  const dataDir =
    resourcesPaths?.[0] ||
    validResourcePaths(directories, undefined, project, configurationName)[0];
  if (dataDir) pandocOpts.push(`--data-dir=${encloseInDblQuotes(dataDir)}`);

  let outputFormat = format || 'json';
  if (outputFormat.endsWith('.lua'))
    outputFormat =
      findResourceFile(directories, outputFormat, {
        ...findOptions,
        kind: 'writer',
      }) || outputFormat;
  if (resultFile) pandocOpts.push(`--output=${encloseInDblQuotes(resultFile)}`);

  for (const filter of converter.filters || []) {
    const filterFile =
      findResourceFile(directories, filter, {
        ...findOptions,
        kind: 'filter',
      }) || filter;
    pandocOpts.push(
      `${filter.endsWith('.lua') ? '--lua-filter' : '--filter'}=${encloseInDblQuotes(filterFile)}`,
    );
  }
  if (resourcesPaths?.length)
    pandocOpts.push(
      `--resource-path=${resourcesPaths
        .map((resource) => encloseInDblQuotes(formatPath(parsePath(resource))))
        .join(pathDelimiter)}`,
    );
  if (standalone) {
    pandocOpts.push('-s');
    if (pandocTemplate) {
      const template =
        findResourceFile(directories, pandocTemplate, {
          ...findOptions,
          kind: 'template',
        }) || pandocTemplate;
      pandocOpts.push(`--template=${encloseInDblQuotes(template)}`);
    }
  }
  if (referenceFile) {
    const reference =
      findResourceFile(directories, referenceFile, {
        ...findOptions,
        kind: 'referenceDoc',
      }) || referenceFile;
    pandocOpts.push(`--reference-doc=${encloseInDblQuotes(reference)}`);
  }
  if (isArray(pandocOptions)) pandocOpts.push(...pandocOptions);

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
    | ScriptOutputConverter
    | undefined;
  if (!converter) throw new Error('no output converter specified');
  let { command, commandArgs } = converter;
  if (!existsSync(command))
    command = formatPath({ dir: exportOptions.cwd, name: command });
  if (!command) throw new Error('this converter has no command to run');
  return exportWithExternalProgram(
    command,
    expandCommandArgs(commandArgs || [], exportOptions.sourceFile),
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
  const project =
    isString(editorProject)
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
