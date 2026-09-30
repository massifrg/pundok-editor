import { extname, isAbsolute } from 'node:path';
import type {
  CxDocument,
  PandocFilterTransform,
} from '../../../common/src';
import { pandocOptionsToCliOptions } from '../../../common/src';
import {
  findResourceFile,
  isReadableFile,
  type BackendDirectories,
} from '../resourceManager';
import { runExternalProgram } from '../runExternal';
import { isEmpty } from 'lodash';

export async function transformJsonHandler(
  directories: BackendDirectories,
  jsonDocument: string,
  jsonTransform: string,
): Promise<string> {
  let document: Partial<CxDocument>;
  let transform: PandocFilterTransform;
  try {
    document = JSON.parse(jsonDocument) as Partial<CxDocument>;
    transform = JSON.parse(jsonTransform) as PandocFilterTransform;
  } catch (error) {
    throw new Error(`Transform input must be valid JSON: ${error}`);
  }
  return transformWithPandoc(directories, document, transform);
}

export async function transformWithPandoc(
  directories: BackendDirectories,
  document: Partial<CxDocument>,
  transform: PandocFilterTransform,
): Promise<string> {
  const { configurationName, project, content } = document;
  const { sources } = transform
  if (!content && isEmpty(sources)) throw new Error('transformWithPandoc: no content or sources provided');

  const fromFormat = transform.fromFormat || 'json';
  const toFormat = transform.toFormat || 'json';
  const args = [
    '-f',
    fromFormat,
    '-t',
    toFormat,
    ...pandocOptionsToCliOptions(transform.pandocOptions || []),
  ];
  console.log(args)
  if (!transform.filters?.length && fromFormat === toFormat)
    throw new Error(
      'You must provide Pandoc filters to transform a document without changing its format',
    );

  const context = { configurationName, project };
  if (project?.path) args.push(`--data-dir=${project.path}`);

  for (const [name, value] of Object.entries(transform.variables || {})) {
    args.push('-V');
    const quote = Array.isArray(value) || typeof value === 'object' ? "'" : '';
    args.push(`${name}=${quote}${JSON.stringify(value)}${quote}`);
  }
  for (const [name, value] of Object.entries(transform.metadata || {})) {
    args.push('-M', `${name}=${JSON.stringify(value)}`);
  }

  for (const filter of transform.filters || []) {
    const extension = extname(filter).toLowerCase();
    const filename = extension ? filter : `${filter}.lua`;
    const filterFile = findResourceFile(directories, filename, {
      ...context,
      kind: 'filter',
    });
    if (!filterFile) throw new Error(`Transformation filter "${filter}" not found`);
    args.push(
      `${extension === '' || extension === '.lua' ? '--lua-filter' : '--filter'}=${filterFile}`,
    );
  }

  for (const source of transform.sources || ['-']) {
    if (source === '-') {
      args.push(source);
      continue;
    }
    const sourceFile =
      (isAbsolute(source) && isReadableFile(source) && source) ||
      findResourceFile(directories, source, { ...context, kind: 'document' });
    if (!sourceFile)
      throw new Error(
        `Source "${source}" not found (it is needed for the transformation)`,
      );
    args.push(sourceFile);
  }
  console.log(args)

  const { result } = runExternalProgram(
    'pandoc',
    args,
    { cwd: project?.path },
    undefined,
    content,
  );
  const output = await result;
  if (output.exitCode !== 0)
    throw new Error(
      `Transformation with command "pandoc ${args.join(' ')}" exited with code ${output.exitCode}: ${output.error}`,
    );
  return output.output;
}
