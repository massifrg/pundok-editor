import { writeFile } from 'node:fs/promises';
import { basename, isAbsolute, parse, resolve } from 'node:path';
import {
  DEFAULT_DOCUMENT_FORMAT,
  documentFormatToOutputConverter,
  type CxDocument,
  type DocumentBookmark,
  type ExternalProgramResult,
  type SaveResponse,
  type RenderingBookmark,
  type ServerMessageForViewer,
  type ServerMessageSetProject,
} from '../../../common/src';
import { updateBookmarks } from '../bookmarks';
import { type RenderingJobStore } from '../documentHash';
import {
  errorFeedback,
  progressFeedback,
  type FeedbackSink,
} from '../feedback';
import { expandCommandArgs } from '../expandCommandArgs';
import { localizePath } from '../filesystem';
import { exportWithPandoc, exportWithScript } from '../importExport';
import type { RendererHub } from '../rendererHub';
import { validResourcePaths, type BackendDirectories } from '../resourceManager';
import { renderingProcessKey } from '../renderingProcess';
import { computeProjectFromDocFile } from './project';

export async function saveDocument(
  directories: BackendDirectories,
  events: RendererHub,
  feedback: FeedbackSink,
  renderingJobs: RenderingJobStore,
  doc: CxDocument,
): Promise<SaveResponse> {
  try {
    const converter = documentFormatToOutputConverter(doc.documentFormat);
    if (converter)
      return exportDocument(
        directories,
        events,
        feedback,
        renderingJobs,
        doc,
      );
    if (!doc.content)
      return {
        doc,
        error: 'you provided no content to save',
        message: 'you provided no content to save',
      };
    const response = await savePandocJsonDocument(directories, events, doc);
    await updateBookmarks(directories, [
      {
        type: 'document',
        id: doc.id,
        url: toFileUrl(doc.path!),
        configurationName: doc.project ? undefined : doc.configurationName,
      },
    ]);
    return response;
  } catch (error) {
    if (error !== 'save cancelled')
      errorFeedback(feedback, errorMessage(error), doc.editorKey);
    throw error;
  }
}

export async function exportDocument(
  directories: BackendDirectories,
  events: RendererHub,
  feedback: FeedbackSink,
  renderingJobs: RenderingJobStore,
  doc: CxDocument,
  isRendering = false,
): Promise<SaveResponse> {
  if (!doc.path) throw new Error('You must provide a document (file) name!');
  const converter = documentFormatToOutputConverter(doc.documentFormat);
  const sourceFile = localizePath(doc.path);
  const cwd = localizePath(doc.project?.path || parse(sourceFile).dir);
  let resultFile = converter?.resultFile
    ? expandCommandArgs([converter.resultFile], {
      path: sourceFile,
      project: doc.project,
    })[0]
    : undefined;
  if (resultFile && !isAbsolute(resultFile)) resultFile = resolve(cwd, resultFile);
  const resourcesPaths = validResourcePaths(
    directories,
    undefined,
    doc.project,
    doc.configurationName,
  );
  const documentHash = await renderingJobs.remember({
    path: sourceFile,
    converter: converter!,
    configurationName: doc.configurationName,
    project: doc.project,
  });
  const operationName = isRendering ? 'rendering' : 'storage';

  try {
    let result: ExternalProgramResult;
    switch (converter?.type) {
      case 'script':
        result = await exportWithScript(doc, {
          cwd,
          resourcesPaths,
          sourceFile,
          resultFile: resultFile || doc.path,
          processKey: isRendering
            ? renderingProcessKey(converter!.name, sourceFile)
            : undefined,
          callback: (source, chunk) =>
            progressFeedback(feedback, source, chunk.toString(), doc.editorKey),
        });
        break;
      case 'pandoc':
      default:
        result = await exportWithPandoc(directories, doc, {
          cwd,
          resourcesPaths,
          resultFile: resultFile || doc.path,
          processKey: isRendering
            ? renderingProcessKey(converter!.name, sourceFile)
            : undefined,
        });
    }

    // TODO: see if we can replace the old converter.feedback field
    // if (converter?.feedback === 'command-line')
    //   messageFeedback(feedback, 'err', result.commandLine, doc.editorKey);
    // else if (converter?.feedback === 'success')
    //   messageFeedback(feedback, 'err', `successfully exported in "${resultFile}"`, doc.editorKey,

    if (result.exitCode !== 0) {
      const message = `document ${operationName} failed with exitCode ${result.exitCode}`;
      errorFeedback(
        feedback,
        [message, errorMessage(result.error), 'command line:', result.commandLine].join('\n'),
        doc.editorKey,
      );
      return {
        error: result.error,
        message,
        doc: {
          id: doc.id,
          path: resultFile,
          content: result.output,
          configurationName: doc.configurationName,
        } as CxDocument,
        resultFile,
        commandLine: result.commandLine,
        cwd,
      };
    }

    let project = doc.project;
    const savedPath = resultFile || doc.path;
    if (!isRendering) {
      try {
        project = await computeProjectFromDocFile(directories, savedPath);
        events.send('set-project', {
          type: 'project',
          project,
          editorKey: doc.editorKey,
        });
      } catch {
        // Saving a document outside a project is valid.
      }
    }

    const response: SaveResponse = {
      message: `document ${operationName} successful`,
      doc: {
        id: doc.id,
        outputConverter: converter,
        configurationName: doc.configurationName,
        path: doc.path,
        content: result.output,
        project,
      } as CxDocument,
      resultFile,
      documentHash,
      commandLine: result.commandLine,
      cwd,
    };
    if (savedPath) {
      const bookmark: RenderingBookmark | DocumentBookmark =
        converter?.longRendering === true && converter.extension === 'pdf'
          ? {
            type: 'rendering',
            url: toFileUrl(savedPath),
            documentPath: sourceFile,
            converterName: converter.name,
            configurationName: doc.project ? undefined : doc.configurationName,
          }
          : {
            type: 'document',
            id: doc.id,
            url: toFileUrl(savedPath),
            configurationName: doc.project ? undefined : doc.configurationName,
          };
      await updateBookmarks(directories, [bookmark]);
    }
    if (resultFile && converter?.openResult === 'editor') {
      const viewer: ServerMessageForViewer = {
        type: 'viewer',
        editorKey: doc.editorKey,
        setup: {
          name: resultFile,
          content: result.output,
          projectAsJson: doc.project ? JSON.stringify(doc.project) : undefined,
          documentHash,
        },
      };
      events.send('show-in-viewer', viewer);
    }
    return response;
  } catch (error) {
    const response: SaveResponse = {
      error,
      message: `${operationName} failed`,
      doc: {
        content: doc.content,
        format: converter?.type === 'pandoc' ? converter.format : undefined,
        configurationName: doc.configurationName,
      } as CxDocument,
      resultFile,
      cwd,
    };
    errorFeedback(feedback, errorMessage(error), doc.editorKey);
    return response;
  }
}

async function savePandocJsonDocument(
  directories: BackendDirectories,
  events: RendererHub,
  doc: CxDocument,
): Promise<SaveResponse> {
  if (!doc.path) throw new Error('You must provide a document (file) name to save!');
  await writeFile(doc.path, doc.content);
  let project = doc.project;
  try {
    project = await computeProjectFromDocFile(directories, doc.path);
    const message: ServerMessageSetProject = {
      type: 'project',
      project,
      editorKey: doc.editorKey,
    };
    events.send('set-project', message);
  } catch {
    // Saving a standalone document is valid.
  }
  return {
    message: 'document saved',
    doc: {
      editorKey: doc.editorKey,
      path: doc.path,
      content: doc.content,
      id: doc.id || basename(doc.path, '.json'),
      documentFormat: DEFAULT_DOCUMENT_FORMAT,
      configurationName: doc.configurationName,
      project,
    },
    resultFile: doc.path,
    cwd: parse(doc.path).dir,
  };
}

function toFileUrl(path: string): string {
  return `file://${path.replaceAll('\\', '/')}`;
}

function errorMessage(error: unknown): string {
  return typeof error === 'string' ? error : `${error}`;
}
