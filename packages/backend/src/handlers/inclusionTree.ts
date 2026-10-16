import { isAbsolute, resolve } from 'node:path';
import type { PundokEditorProject } from '../../../common/src';
import { localizePath } from '../filesystem';
import {
  findResourceFile,
  isReadableFile,
  type BackendDirectories,
} from '../resourceManager';
import { runExternalProgram } from '../runExternal';

const INCLUDE_DOC_FILTER = 'include-doc.lua';
const INCLUSION_TREE_WRITER = 'inclusion-tree.lua';

export async function getInclusionTree(
  directories: BackendDirectories,
  project: PundokEditorProject,
): Promise<string | undefined> {
  if (!project.path || !project.rootDocument) return undefined;
  const path = localizePath(project.path);
  const source = resolve(path, localizePath(project.rootDocument));
  if (!isAbsolute(source) || !isReadableFile(source))
    throw new Error(`Project root document is not readable: ${source}`);
  const writer = findResourceFile(directories, INCLUSION_TREE_WRITER, {
    kind: 'writer',
    project,
  });
  const filter = findResourceFile(directories, INCLUDE_DOC_FILTER, {
    kind: 'filter',
    project,
  });
  if (!writer || !filter) return undefined;
  const { result } = runExternalProgram(
    'pandoc',
    [
      '-f',
      'json',
      '-t',
      writer,
      '-L',
      filter,
      `--data-dir=${path}`,
      '--',
      source,
    ],
    { cwd: path },
  );
  const output = await result;
  if (output.exitCode !== 0) throw new Error(output.error);
  return output.output;
}
