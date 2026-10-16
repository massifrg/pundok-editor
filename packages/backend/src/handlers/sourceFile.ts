import { readFile } from 'node:fs/promises';
import { delimiter, isAbsolute, resolve } from 'node:path';
import type {
  EditorKeyType,
  PundokEditorProject,
  SynctexInfo,
} from '../../../common/src';
import type { FeedbackSink } from '../feedback';
import { isReadableFile, type BackendDirectories } from '../resourceManager';
import { runExternalProgram } from '../runExternal';

export interface SourceLocation {
  path: string;
  line: number;
}

export async function getSourceLocation(
  directories: BackendDirectories,
  feedback: FeedbackSink,
  editorKey: EditorKeyType,
  info: SynctexInfo,
): Promise<SourceLocation | undefined> {
  const { outputFile, page, rx, ry, projectAsJson } = info;
  feedback.report(
    {
      type: 'progress',
      source: 'err',
      message: `Looking for source file corresponding to "${outputFile}", page ${page}, xy@${rx.toFixed(2)},${ry.toFixed(2)}%`,
      level: 1,
    },
    editorKey,
  );
  const synctexFile = outputFile.replace(/[.]pdf$/, '.synctex');
  feedback.report(
    {
      type: 'progress',
      source: 'err',
      message: `Synctex file: ${synctexFile}`,
      level: 1,
    },
    editorKey,
  );
  if (!isReadableFile(synctexFile))
    throw new Error(`No synctex file found for "${outputFile}"`);

  const environment = await extendedEnvironment(directories);
  const pdfInfo = await runExternalProgram(
    'mtxrun',
    ['--script', 'pdf', '--info', '--detail', outputFile],
    { env: environment },
  ).result;
  if (pdfInfo.exitCode !== 0) {
    const message = `Error getting information about "${outputFile}": ${pdfInfo.error}`;
    feedback.report({ type: 'progress', source: 'err', message, level: 1 }, editorKey);
    throw new Error(message);
  }

  const dimensions = pageDimensions(pdfInfo.output, page);
  if (!dimensions)
    throw new Error(`Error getting MediaBox of page ${page}`);

  const sourceInfo = await runExternalProgram(
    'mtxrun',
    [
      '--script',
      'synctex',
      '--goto',
      `--page=${page}`,
      `--x=${(dimensions.width * rx).toFixed()}`,
      `--y=${(dimensions.height * ry).toFixed()}`,
      synctexFile,
    ],
    { env: environment },
  ).result;
  if (sourceInfo.exitCode !== 0) {
    const message = `Error getting the source file for "${outputFile}", page ${page}: ${sourceInfo.error}`;
    feedback.report({ type: 'progress', source: 'err', message, level: 1 }, editorKey);
    throw new Error(message);
  }

  const match = /filename='(.*?)'.*?linenumber='(\d+)'/.exec(sourceInfo.output);
  if (!match) return undefined;
  const [, filename, line] = match;
  const project = projectAsJson
    ? (JSON.parse(projectAsJson) as PundokEditorProject)
    : undefined;
  return {
    path:
      !isAbsolute(filename) && project?.path
        ? resolve(project.path, filename)
        : filename,
    line: Number.parseInt(line, 10),
  };
}

function pageDimensions(
  output: string,
  page: number,
): { width: number; height: number } | undefined {
  for (const line of output.split(/[\r\n]+/)) {
    const match =
      /mtx-pdf.*?mediabox.*?pages:\s*(\d+)-(\d+),\s*width:\s*([0-9.]+),\s*height:\s*([0-9.]+)/.exec(
        line,
      );
    if (!match) continue;
    const [, first, last, width, height] = match;
    if (page >= Number.parseInt(first, 10) && page <= Number.parseInt(last, 10))
      return {
        width: Number.parseFloat(height),
        height: Number.parseFloat(width),
      };
  }
}

async function extendedEnvironment(
  directories: BackendDirectories,
): Promise<Record<string, string | undefined>> {
  let startup: { env?: Record<string, string> } = {};
  try {
    startup = JSON.parse(
      await readFile(resolve(directories.userDataDir, 'startup.json'), 'utf8'),
    ) as { env?: Record<string, string> };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const environment = { ...process.env };
  for (const [name, value] of Object.entries(startup.env || {})) {
    environment[name] =
      name === 'PATH' && environment.PATH
        ? `${environment.PATH}${delimiter}${value}`
        : value;
  }
  return environment;
}
