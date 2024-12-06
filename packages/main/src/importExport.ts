import {
  ProgressCallback,
  externalProgramError,
  runExternalProgram,
} from './runExternal';
import {
  ScriptOutputConverter,
  ExternalProgramResult,
  InputConverter,
  OutputConverter,
  PandocOutputConverter,
  PandocEditorProject,
  DEFAULT_IMPORT_PANDOC_OPTIONS,
  PandocFilterTransform,
  FindResourceOptions,
  PandocMetadata,
  PandocVariables,
} from './common';
import {
  FindResourceFileOptions,
  configDir,
  configsDir,
  findResourceFile,
  isReadableFile,
} from './resourcesManager';
import {
  delimiter as pathDelimiter,
  extname,
  format as formatPath,
  parse as parsePath,
  sep as pathSeparator,
  isAbsolute,
} from 'path';
import { encloseInDblQuotes } from './utils';
import { existsSync } from 'fs';
import { isArray, isObject, isString } from 'lodash';

const INCLUDE_DOC_FILTER = 'include-doc.lua';

export function importWithPandoc(
  path: string,
  pandocFormatOrFilter: string,
  pandocOpts?: string[],
): Promise<ExternalProgramResult> {
  let args = ['-f', pandocFormatOrFilter, '-t', 'json'];
  args = args.concat(pandocOpts || []);
  args = args.concat(['--', `"${path}"`]);
  const commandLine = `pandoc ${args.join(' ')}`;
  console.log(`importWithPandoc, RUNNING ${commandLine}`);
  try {
    return runExternalProgram('pandoc', args, { shell: true }).result;
  } catch (err) {
    return Promise.resolve(externalProgramError(err, commandLine));
  }
}

export function importJsonWithPandoc(
  filename: string,
  formatOrReader: string,
  configurationName?: string,
  inputConverter?: InputConverter,
): Promise<ExternalProgramResult> {
  console.log(
    `importJsonWithPandoc, configurationName=${JSON.stringify(
      configurationName,
    )}`,
  );
  let format = formatOrReader;
  let pandocOpts: string[] = DEFAULT_IMPORT_PANDOC_OPTIONS;
  if (inputConverter && inputConverter.type === 'pandoc')
    pandocOpts = pandocOpts.concat(inputConverter.pandocOptions || []);
  if (configurationName) {
    const dir = configDir(configurationName);
    if (dir) {
      pandocOpts.push(`--data-dir=${encloseInDblQuotes(dir)}`);
      if (formatOrReader.endsWith('.lua'))
        format = encloseInDblQuotes(`${dir}${pathSeparator}${formatOrReader}`);
    }
  }
  return importWithPandoc(filename, format, pandocOpts);
}

export function runPandocOnFile(
  path: string,
  pandocOpts: string[],
): Promise<ExternalProgramResult> {
  let args: string[] = [];
  args = args.concat(pandocOpts || []);
  args = args.concat(['--', `"${path}"`]);
  const commandLine = `pandoc ${args.join(' ')}`;
  console.log(`importFromPandoc, RUNNING ${commandLine}`);
  const cwd = parsePath(path).dir;
  console.log(cwd);
  try {
    return runExternalProgram('pandoc', args, { shell: true, cwd }).result;
  } catch (err) {
    return Promise.resolve(externalProgramError(err, commandLine));
  }
}

export interface ExportOptions {
  /** the output converter to be used */
  converter: OutputConverter;
  /** the current working directory of the spawn process (pandoc or a script) */
  cwd: string;
  /** the eventual project */
  project: PandocEditorProject | string;
  /** the name of the configuration */
  configurationName: string;
  /** the path(s) where to look for resources */
  resourcesPaths: string[];
  /** the file where the output is exported */
  resultFile: string;
  /** a callback to follow the stdout and stderr of an export operation */
  callback?: ProgressCallback;
}

async function exportWithExternalProgram(
  command: string,
  args: string[],
  json: string,
  exportOptions: Partial<ExportOptions>,
): Promise<ExternalProgramResult> {
  const { callback, cwd, resultFile } = exportOptions;
  const commandLine = `${command}${args ? ' ' + args.join(' ') : ''}`;
  console.log(
    `RUNNING ${commandLine}${cwd ? ' in directory "' + cwd + '"' : ''}`,
  );
  try {
    const { childProcess, result } = runExternalProgram(
      command,
      args,
      {
        shell: true,
        cwd,
      },
      callback,
    );
    childProcess.stdin.write(json);
    childProcess.stdin.end();
    const { output, exitCode, error } = await result;
    if (exitCode === 0) {
      // don't save output to file, because pandoc or the file already does
      // if (resultFile) await writeFile(resultFile, output);
      return result;
    } else {
      return Promise.reject(error);
    }
  } catch (err) {
    return Promise.resolve(externalProgramError(err, commandLine));
  }
}

export function exportWithPandoc(
  json: string,
  exportOptions: Partial<ExportOptions>,
): Promise<ExternalProgramResult> {
  const { configurationName, converter, resourcesPaths, resultFile, project } =
    exportOptions;
  const { format, pandocOptions, pandocTemplate, referenceFile, standalone } =
    converter as PandocOutputConverter;
  const pandocOpts: string[] = [];
  const baseFindOptions: Partial<FindResourceFileOptions> = {
    baseResourcePaths: resourcesPaths,
    kind: 'writer',
    project,
    configurationName,
  };

  let cfgdir = resourcesPaths && resourcesPaths[0];
  if (!cfgdir)
    cfgdir = configurationName
      ? `${configsDir()}${pathSeparator}${configurationName}`
      : undefined;
  if (cfgdir) {
    pandocOpts.push(`--data-dir=${encloseInDblQuotes(cfgdir)}`);
  }
  /* -t pandoc option */
  let outputFormat = format || 'json';
  if (outputFormat.endsWith('.lua')) {
    outputFormat =
      findResourceFile(outputFormat, { ...baseFindOptions, kind: 'writer' }) ||
      outputFormat;
  }
  /* --output pandoc option */
  if (resultFile) pandocOpts.push(`--output=${encloseInDblQuotes(resultFile)}`);
  /** --filter and --lua-filter pandoc options */
  const pandocFilters = (converter as PandocOutputConverter).filters || [];
  pandocFilters.forEach((pf) => {
    const isLuaFilter = pf.endsWith('.lua');
    const optionName = isLuaFilter ? '--lua-filter' : '--filter';
    const filterFile =
      findResourceFile(pf, { ...baseFindOptions, kind: 'filter' }) || pf;
    pandocOpts.push(`${optionName}=${encloseInDblQuotes(filterFile)}`);
  });
  /* --resource-path pandoc option */
  let resourcePath: string[] = (resourcesPaths || []).map((p) =>
    formatPath(parsePath(p)),
  );
  if (resourcePath)
    pandocOpts.push(
      '--resource-path=' +
        resourcePath.map((p) => encloseInDblQuotes(p)).join(pathDelimiter),
    );
  /* --standalone and --template pandoc options */
  if (standalone) {
    pandocOpts.push('-s');
    if (pandocTemplate) {
      const templateFile =
        findResourceFile(pandocTemplate, {
          ...baseFindOptions,
          kind: 'template',
        }) || pandocTemplate;
      pandocOpts.push(`--template=${encloseInDblQuotes(templateFile)}`);
    }
  }
  /* --reference-doc pandoc option */
  if (referenceFile) {
    const refFile =
      findResourceFile(referenceFile, {
        ...baseFindOptions,
        kind: 'referenceDoc',
      }) || referenceFile;
    pandocOpts.push(`--reference-doc=${encloseInDblQuotes(refFile)}`);
  }
  /* the remainder of pandoc options */
  if (isArray(pandocOptions)) {
    pandocOptions.forEach((o) => pandocOpts.push(o));
  }

  let args = ['-f', 'json', '-t', outputFormat];
  args = args.concat(pandocOpts || []);
  args = args.concat(['--', '-']);

  return exportWithExternalProgram('pandoc', args, json, exportOptions);
}

export async function exportWithPandocLua(
  json: string,
  exportOptions: Partial<ExportOptions>,
): Promise<ExternalProgramResult> {
  const args = ['lua', '--', '-'];
  return exportWithExternalProgram('pandoc', args, json, exportOptions);
}

export async function exportWithScript(
  json: string,
  exportOptions: Partial<ExportOptions>,
): Promise<ExternalProgramResult> {
  const { converter, cwd } = exportOptions;
  if (!converter) return Promise.reject(`no output converter specified`);
  let { command, commandArgs } = converter as ScriptOutputConverter;
  if (!existsSync(command)) {
    command = formatPath({ dir: cwd, name: command });
  }
  if (!command) return Promise.reject(`this converter has no command to run`);
  return exportWithExternalProgram(
    command,
    commandArgs || [],
    json,
    exportOptions,
  );
}

export async function transformWithPandoc(
  pandocJson: string | undefined,
  pandocTransform: PandocFilterTransform,
  context: Partial<FindResourceOptions>,
): Promise<string> {
  const command = 'pandoc';
  const args = ['-f', 'json', '-t', 'json'];
  const { filters, sources } = pandocTransform;
  if (!filters)
    return Promise.reject(
      'you must provide pandoc filters to make a transformation of the document',
    );
  try {
    // resources
    const project: PandocEditorProject | undefined =
      context.project && isString(context.project)
        ? JSON.parse(context.project)
        : context.project;
    if (project?.path)
      args.push(`--data-dir=${encloseInDblQuotes(project.path)}`);

    // variables
    Object.entries(pandocTransform.variables || {}).forEach(([name, value]) => {
      args.push('-V');
      const quote = isArray(value) || isObject(value) ? "'" : '';
      args.push(`${name}=${quote}${JSON.stringify(value)}${quote}`);
    });

    // metadata
    Object.entries(pandocTransform.metadata || {}).forEach(([name, value]) => {
      args.push('-M');
      args.push(`${name}=${JSON.stringify(value)}`);
    });

    // find filters
    filters.forEach((f) => {
      const ext = extname(f).toLowerCase();
      const filename = ext === '' ? f + '.lua' : f;
      const filterFile = findResourceFile(filename, {
        ...context,
        kind: 'filter',
      });
      if (filterFile) {
        const opt = ext === '' || ext === '.lua' ? '--lua-filter' : '--filter';
        args.push(`${opt}=${filterFile}`);
      }
    });

    // find input source
    if (sources) {
      sources.forEach((s) => {
        const sourceFile = findResourceFile(s, {
          ...context,
          kind: 'document',
        });
        if (sourceFile) args.push(sourceFile);
        else
          return Promise.reject(
            `source "${s}" not found (it's needed for transformation)`,
          );
      });
    } else {
      args.push('-');
    }

    const { result } = runExternalProgram(
      command,
      args,
      { cwd: project?.path },
      undefined,
      pandocJson,
    );
    const { error, exitCode, output } = await result;
    if (exitCode !== 0)
      return Promise.reject(
        `Transformation with command "${command} ${args.join(
          ' ',
        )}" exited with code ${exitCode}: ${error}`,
      );
    return output;
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function runWriterOnMasterFile(
  editorProject: string | PandocEditorProject,
  writerFilename: string,
  options?: {
    metadata?: PandocMetadata;
    variables?: PandocVariables;
  },
): Promise<string | undefined> {
  try {
    const project: PandocEditorProject =
      editorProject && isString(editorProject)
        ? JSON.parse(editorProject)
        : editorProject;
    let src = `${project.path}${pathSeparator}${project.rootDocument}`;
    if (!isAbsolute(src))
      return Promise.reject(`"${src}" is not an absolute path`);
    if (!isReadableFile(src))
      return Promise.reject(`"${src}" is not a readable file`);
    const writer = findResourceFile(writerFilename, { kind: 'writer' });
    const includeDocFilterFile = findResourceFile(INCLUDE_DOC_FILTER, {
      kind: 'filter',
    });
    if (writer && includeDocFilterFile) {
      console.log(writer);
      console.log(includeDocFilterFile);
      const args = ['-f', 'json', '-t', writer, '-L', includeDocFilterFile];

      if (project?.path)
        args.push(`--data-dir=${encloseInDblQuotes(project.path)}`);

      // variables
      Object.entries(options?.variables || {}).forEach(([name, value]) => {
        args.push('-V');
        const quote = isArray(value) || isObject(value) ? "'" : '';
        args.push(`${name}=${quote}${JSON.stringify(value)}${quote}`);
      });

      // metadata
      Object.entries(options?.metadata || {}).forEach(([name, value]) => {
        args.push('-M');
        args.push(`${name}=${JSON.stringify(value)}`);
      });

      const result = await runPandocOnFile(src, args);
      if (result.exitCode === 0) {
        return result.output;
      } else {
        console.log(result.error);
      }
    }
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
  return undefined;
}
