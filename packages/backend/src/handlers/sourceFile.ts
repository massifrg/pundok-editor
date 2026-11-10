import { readFile } from 'node:fs/promises';
import { delimiter, isAbsolute, relative, resolve } from 'node:path';
import { SYNCTEX_CONTEXT_REQUIRED } from '../../../common/src';
import type {
  EditorKeyType,
  PundokEditorProject,
  PdfLocation,
  PdfPageRectangle,
  RenderingBookmark,
  SynctexInfo,
} from '../../../common/src';
import type { FeedbackSink } from '../feedback';
import { isReadableFile, type BackendDirectories } from '../resourceManager';
import { runExternalProgram } from '../runExternal';
import { computeProjectFromDocFile } from './project';
import { localizePath } from '../filesystem';

export interface SourceLocation {
  path: string;
  line: number;
  project?: PundokEditorProject;
}

export async function getPdfLocation(
  directories: BackendDirectories,
  feedback: FeedbackSink,
  editorKey: EditorKeyType,
  sourceFile: string,
  line: number,
  bookmarks: RenderingBookmark[],
  project?: PundokEditorProject,
): Promise<PdfLocation | undefined> {
  const environment = await extendedEnvironment(directories);
  const synctexLine = line + 1;
  const synctexSourceFile = normalizeSynctexPath(
    project?.path && isAbsolute(sourceFile)
      ? relative(project.path, sourceFile)
      : sourceFile,
  );
  for (const bookmark of bookmarks) {
    const outputFile = localizePath(bookmark.url);
    const synctexFile = outputFile.replace(/[.]pdf$/, '.synctex');
    feedback.report(
      {
        type: 'progress',
        source: 'err',
        message: `Looking for PDF location of "${sourceFile}", line ${synctexLine}, in "${outputFile}"`,
        level: 1,
      },
      editorKey,
    );
    if (!isReadableFile(synctexFile)) continue;

    let findResult;
    try {
      findResult = await runExternalProgram(
        'mtxrun',
        [
          '--script',
          'synctex',
          '--find',
          `--file=${synctexSourceFile}`,
          `--line=${synctexLine}`,
          synctexFile,
        ],
        { env: environment },
      ).result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'error' in error
            ? String(error.error)
            : String(error);
      if (message.includes('ENOENT'))
        throw new Error(SYNCTEX_CONTEXT_REQUIRED);
      throw error;
    }
    if (findResult.exitCode !== 0) continue;

    const findMatch = /page\s*=\s*(\d+)/.exec(
      `${findResult.output}\n${findResult.error}`,
    );
    if (!findMatch) continue;
    const findPage = Number.parseInt(findMatch[1], 10);

    const pdfInfo = await runExternalProgram(
      'mtxrun',
      ['--script', 'pdf', '--info', '--detail', outputFile],
      { env: environment },
    ).result;
    const pageDimensionsByPage = (page: number) =>
      pdfInfo.exitCode === 0 ? pageDimensions(pdfInfo.output, page) : undefined;
    let listResult;
    try {
      listResult = await runExternalProgram(
        'mtxrun',
        [
          '--script',
          'synctex',
          '--list',
          synctexFile,
        ],
        { env: environment },
      ).result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'error' in error
            ? String(error.error)
            : String(error);
      if (message.includes('ENOENT'))
        throw new Error(SYNCTEX_CONTEXT_REQUIRED);
      throw error;
    }
    if (listResult.exitCode !== 0) return undefined;

    const rectangles: PdfPageRectangle[] = [];
    let pageNumber: number | undefined;
    for (const outputLine of `${listResult.output}\n${listResult.error}`.split(
      /[\r\n]+/,
    )) {
      const pageMatch = /begin page:\s*(\d+)/.exec(outputLine);
      if (pageMatch) {
        pageNumber = Number.parseInt(pageMatch[1], 10);
        continue;
      }
      if (pageNumber === undefined || pageNumber < findPage) continue;

      const boxMatch =
        /\[\s*(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s*\]\s*:\s*(\d+)\s*:\s*(.*?)\s*$/.exec(
          outputLine,
        );
      if (!boxMatch) continue;
      const [, llx, lly, urx, ury, lineNumber, listedSourceFile] = boxMatch;
      if (Number.parseInt(lineNumber, 10) !== synctexLine)
        continue;
      if (normalizeSynctexPath(listedSourceFile) !== synctexSourceFile)
        continue;

      const lowerY = Number.parseFloat(lly);
      const upperY = Number.parseFloat(ury);
      const yShift = (upperY - lowerY) / 2;
      rectangles.push({
        llx: Number.parseFloat(llx),
        lly: lowerY - yShift,
        urx: Number.parseFloat(urx),
        ury: upperY - yShift,
        page: pageNumber,
        pageHeight: pageDimensionsByPage(pageNumber)?.height,
      });
    }

    if (rectangles.length === 0) return undefined;
    const first = rectangles[0];
    return {
      ...first,
      bookmark,
      page: first.page,
      pageHeight: first.pageHeight,
      rectangles,
    };
  }
}

function normalizeSynctexPath(path: string): string {
  return path.trim().replaceAll('\\', '/').replace(/^\.\/+/, '');
}

export async function getSourceLocation(
  directories: BackendDirectories,
  feedback: FeedbackSink,
  editorKey: EditorKeyType,
  info: SynctexInfo,
): Promise<SourceLocation | undefined> {
  const { outputFile, page, rx, ry, projectAsJson, sourceDocumentPath } = info;
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
  let pdfInfo;
  try {
    pdfInfo = await runExternalProgram(
      'mtxrun',
      ['--script', 'pdf', '--info', '--detail', outputFile],
      { env: environment },
    ).result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'error' in error
          ? String(error.error)
          : String(error);
    if (message.includes('ENOENT'))
      throw new Error(SYNCTEX_CONTEXT_REQUIRED);
    throw error;
  }
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
  let project = projectAsJson
    ? (JSON.parse(projectAsJson) as PundokEditorProject)
    : undefined;
  if (!project && sourceDocumentPath) {
    try {
      project = await computeProjectFromDocFile(directories, sourceDocumentPath);
    } catch {
      project = undefined;
    }
  }
  return {
    path:
      !isAbsolute(filename) && project?.path
        ? resolve(project.path, filename)
        : filename,
    line: Number.parseInt(line, 10),
    project,
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
        width: Number.parseFloat(width),
        height: Number.parseFloat(height),
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
