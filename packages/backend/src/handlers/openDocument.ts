import { readFile } from 'node:fs/promises';
import { format, isAbsolute, parse, resolve } from 'node:path';
import {
  CUSTOM_PANDOC_READERS,
  type CustomPandocReader,
  documentFormatToInputConverter,
  type CxDocument,
  type DocumentContext,
  type DocumentFormat,
  type ExternalProgramResult,
  type PundokBookmark,
  type PundokEditorProject,
} from '../../../common/src';
import { updateBookmarks } from '../bookmarks';
import { errorFeedback, commandLineFeedback, type FeedbackSink } from '../feedback';
import { importWithPandoc } from '../importExport';
import { pandocFeatures } from '../pandocFeatures';
import { computeProjectFromDocFile } from './project';
import { isReadableFile, getConfigurationInit, type BackendDirectories } from '../resourceManager';
import { externalProgramError, runExternalProgram } from '../runExternal';
import { localizePath } from '../filesystem';

export async function openDocument(
  directories: BackendDirectories,
  feedback: FeedbackSink,
  context: DocumentContext,
): Promise<CxDocument> {
  if (!context.path) throw new Error('You must provide a valid file path');
  const path = documentPath(context);
  const doc = await openWithGuessedFormat(directories, feedback, {
    ...context,
    path,
  });
  await updateBookmarks(directories, bookmarksForDocument(doc));
  return doc;
}

function documentPath(context: DocumentContext): string {
  const path = localizePath(context.path!);
  return !isAbsolute(path) && context.project?.path
    ? resolve(localizePath(context.project.path), path)
    : path;
}

async function openWithGuessedFormat(
  directories: BackendDirectories,
  feedback: FeedbackSink,
  context: DocumentContext,
  guessedFormats?: DocumentFormat[],
): Promise<CxDocument> {
  if (guessedFormats?.length) {
    let lastError: unknown;
    for (const documentFormat of guessedFormats) {
      try {
        return await openWithFormat(directories, feedback, {
          ...context,
          documentFormat,
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  if (!context.path) throw new Error('You must provide a file name');
  if (!isReadableFile(context.path)) throw new Error(`can't read "${context.path}"`);
  if (context.documentFormat)
    return openWithFormat(directories, feedback, context);

  const config = context.project
    ? context.project.computedConfig
    : await getConfigurationInit(directories, context.configurationName);
  const guessed = await pandocFeatures.documentFormatsFromFilename(
    context.path,
    'input',
    config,
  );
  if (!guessed.length) throw new Error("Can't guess the file format");
  return openWithGuessedFormat(directories, feedback, context, guessed);
}

async function openWithFormat(
  directories: BackendDirectories,
  feedback: FeedbackSink,
  context: DocumentContext,
): Promise<CxDocument> {
  const { configurationName, documentFormat, path } = context;
  if (!documentFormat || !path) throw new Error('Missing document format or path');
  const inputConverter =
    documentFormat.ftype === 'input-converter'
      ? documentFormatToInputConverter(documentFormat)
      : undefined;
  const editorKey = context.editorKey;
  const { dir, name } = parse(path);
  const resourcePath = [format(parse(dir))];
  let result: ExternalProgramResult;

  try {
    if (inputConverter) {
      switch (inputConverter.type) {
        case 'pandoc':
          result = await importWithPandoc(directories, { ...context, path });
          break;
        case 'custom': {
          const reader: CustomPandocReader | undefined =
            CUSTOM_PANDOC_READERS[inputConverter.name];
          result = reader
            ? await reader.readFile(path)
            : externalProgramError(
                `there's no "${inputConverter.name}" custom reader!`,
              );
          break;
        }
        case 'script':
          result = await runExternalProgram(
            inputConverter.command,
            inputConverter.commandArgs,
            {},
          ).result;
          break;
      }
    } else if (documentFormat.ftype === 'format') {
      result =
        documentFormat.name === 'json'
          ? {
              exitCode: 0,
              commandLine: '',
              cwd: dir,
              output: await readFile(path, 'utf8'),
              error: '',
            }
          : await importWithPandoc(directories, { ...context, path });
    } else {
      throw new Error("Can't guess the file format");
    }
  } catch (error) {
    errorFeedback(feedback, String(error), editorKey);
    throw error;
  }

  if (result.exitCode !== 0) {
    const message = `${result.commandLine ? `${result.commandLine}\n\n` : ''}${result.error}`;
    errorFeedback(feedback, message, editorKey);
    throw new Error(`Error trying to open "${path}"`);
  }
  if (inputConverter?.feedback)
    commandLineFeedback(feedback, result.commandLine, editorKey);

  const doc: CxDocument = {
    editorKey,
    id: name,
    path,
    content: result.output,
    documentFormat,
    configurationName,
    resourcePath,
  };
  try {
    doc.project = await computeProjectFromDocFile(directories, path);
  } catch {
    // A document need not belong to a project.
  }
  return doc;
}

function bookmarksForDocument(doc: CxDocument): PundokBookmark[] {
  const bookmarks: PundokBookmark[] = [];
  if (doc.path)
    bookmarks.push({
      type: 'document',
      url: toUnixPath(doc.path),
      configurationName: doc.project ? undefined : doc.configurationName,
    });
  if (doc.project?.rootDocument)
    bookmarks.push({
      type: 'project',
      name: doc.project.name,
      url: `file://${toUnixPath(
        resolve(doc.project.path, doc.project.rootDocument),
      )}`,
    });
  return bookmarks;
}

function toUnixPath(path: string): string {
  return path.replaceAll('\\', '/');
}
