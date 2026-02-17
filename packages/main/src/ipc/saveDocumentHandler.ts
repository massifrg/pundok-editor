import { IpcMainInvokeEvent, shell } from 'electron';
import {
  basename,
  isAbsolute,
  parse as parsePath,
  resolve,
} from 'path';
import { toOsPath, toUnixPath, writeFile } from '../filesystem';
import {
  commandLineFeedback,
  errorFeedback,
  messageFeedback,
  progressFeedback
} from './feedback';
import { IpcHub } from './ipcHub';
import { updateBookmarksFile } from '../bookmarks';
import {
  PundokBookmark,
  EditorKeyType,
  SaveResponse,
  CxDocument,
  documentFormatToOutputConverter,
  DocumentFormat,
  DEFAULT_DOCUMENT_FORMAT,
  ExternalProgramResult,
  ServerMessageForViewer,
} from '../common';
import { rememberDocumentHash } from './documentHash';
import { computeProjectFromDocFile } from './getProjectHandler';
import { exportWithPandoc, exportWithScript } from '../importExport';
import { expandCommandArgs } from './expandCommandArgs';
import { validResourcePaths } from '../resourcesManager';
import { ProgressCallback } from '../runExternal';
import { stringify } from '../utils';

/**
 * Return a handler function for the messages that the `renderer` sends on the `open-document` channel,
 * to ask to save to a file the contents of a {@link CxDocument}.
 * @param hub the manager of the communications between `main` and `renderer`
 */
export const saveDocumentHandler = (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent, storedDoc: string): Promise<SaveResponse> => {
    let response: SaveResponse;
    let editorKey: EditorKeyType | undefined = undefined
    try {
      const doc: CxDocument = JSON.parse(storedDoc);
      editorKey = doc.editorKey
      const { configurationName, content, documentFormat, id, path, project } = doc
      const outputConverter = documentFormatToOutputConverter(documentFormat as DocumentFormat)
      if (outputConverter) {
        response = await exportDocument(hub, doc);
        console.log(`EXPORT FINISHED`);
        // console.log(doc);
      } else if (content) {
        response = await savePandocJsonDocument(hub, doc);
        const bookmark: PundokBookmark = {
          type: 'document',
          id,
          url: 'file://' + toUnixPath(path!),
          configurationName: project ? undefined : configurationName,
        }
        await updateBookmarksFile([bookmark]);
      } else {
        response = {
          doc,
          error: "you provided no content to save",
          message: "you provided no content to save"
        }
      }
      if (response.error) {
        const errmsg = stringify(response.error);
        errorFeedback(hub, errmsg, editorKey);
        // console.log(errmsg);
      } else {
        // actionsHub.setSavePath(doc.path);
      }
      // console.log(response.doc.path);
      return response;
    } catch (error) {
      if (error !== 'save cancelled' && editorKey)
        errorFeedback(hub, stringify(error), editorKey);
      return Promise.reject(error);
    }
  };

/**
 * 
 * @param hub 
 * @param doc 
 * @returns 
 */
async function savePandocJsonDocument(hub: IpcHub, doc: CxDocument): Promise<SaveResponse> {
  const { configurationName, content, editorKey, path } = doc;
  let project = doc.project
  if (!path)
    return Promise.reject('You must provide a document (file) name to save!')
  try {
    await writeFile(path, content!)
  } catch (error) {
    return Promise.reject({
      error,
      message: JSON.stringify(error),
      doc: { content, path },
    });
  };

  const docDir = parsePath(path).dir
  const id = doc.id || basename(path, '.json');

  // load the project, if the document has been saved in a project directory
  // TODO: what to do when a file in a project is saved in the directory of another project?
  if (path && !project) {
    try {
      const dirProject = await computeProjectFromDocFile(path)
      console.log(`dirProject is ${dirProject.name}`)
      if (dirProject) {
        project = dirProject
        hub.fireEventSetProject(dirProject)
      }
    } catch (err) {
      console.log(`no project file in document folder (${parsePath(path).dir})`)
    }
  }

  return {
    message: 'document saved',
    doc: {
      editorKey,
      path,
      content,
      id,
      documentFormat: DEFAULT_DOCUMENT_FORMAT,
      configurationName,
      project,
    },
    resultFile: path,
    cwd: docDir,
  };
}

/**
 * Save a document in a format that is different from Pandoc JSON.
 * @param hub 
 * @param doc The document with context to be saved in a format different from Pandoc JSON.
 * @param isRendering When `true`, the export is a rendering that takes some time (e.g. PDF)
 * @returns 
 */
export async function exportDocument(
  hub: IpcHub,
  doc: CxDocument,
  isRendering?: boolean
): Promise<SaveResponse> {
  const { configurationName, content, documentFormat, editorKey, id, path, project } = doc;
  if (!path) return Promise.reject(`You must provide a document (file) name!`)
  const converter = documentFormatToOutputConverter(documentFormat)
  const { feedback, openResult } = converter || {}
  const cwd = toOsPath(project?.path || process.cwd());

  const sourceFile = toOsPath(path)
  let resultFile = converter?.resultFile
    ? expandCommandArgs([converter.resultFile], sourceFile)[0]
    : undefined
  if (resultFile && !isAbsolute(resultFile))
    resultFile = resolve(cwd, resultFile)

  const resourcesPaths = validResourcePaths(
    undefined,
    project,
    configurationName,
  );

  let documentHash: string | undefined = undefined
  if (sourceFile) {
    documentHash = await rememberDocumentHash({
      path: sourceFile,
      converter: documentFormatToOutputConverter(doc.documentFormat)!,
      configurationName: doc.configurationName,
      project,
    })
  }
  const operationName = isRendering ? 'rendering' : 'storage'
  try {
    let result: ExternalProgramResult;
    switch (converter?.type) {
      case 'custom':
        throw new Error('custom converter not implemented yet');
        break;
      case 'lua':
        throw new Error('lua converter not implemented yet');
        // result = await exportWithPandocLua(doc, {
        //   cwd,
        //   resourcesPaths,
        // });
        break;
      case 'script':
        const callback: ProgressCallback = (source, chunk) => {
          progressFeedback(hub, source, chunk.toString(), editorKey);
        };
        result = await exportWithScript(doc, {
          cwd,
          resourcesPaths,
          sourceFile,
          resultFile,
          callback,
        });
        break;
      case 'pandoc':
      default:
        result = await exportWithPandoc(doc, {
          cwd,
          resourcesPaths,
          resultFile: resultFile || doc.path,
        });
    }
    const { commandLine, error, exitCode, output } = result
    if (feedback) {
      switch (feedback) {
        case 'command-line':
          commandLineFeedback(hub, commandLine, editorKey);
          break;
        case 'success':
        default:
          messageFeedback(
            hub,
            `successfully exported in "${resultFile}"`,
            editorKey,
          );
      }
    }
    if (exitCode === 0) {
      const response: SaveResponse = {
        message: `document ${operationName} successful`,
        doc: {
          id,
          outputConverter: converter,
          configurationName,
          path: doc.path,
          // exportedAsPath: resultFile,
          content: output,
        } as CxDocument,
        resultFile,
        documentHash,
        commandLine,
        cwd,
      }
      if (resultFile) {
        // EXPORT SUCCESSFUL
        console.log(`openResult = ${openResult}`);
        if (openResult === 'editor') {
          hub.send('show-in-viewer', {
            type: 'viewer',
            editorKey,
            setup: {
              name: resultFile,
              projectAsJson: project ? JSON.stringify(project) : undefined,
              documentHash: response.documentHash
            },
          } as ServerMessageForViewer);
        } else if (openResult === 'os') {
          shell.openPath(resultFile).catch((error) => {
            errorFeedback(hub, stringify(error), editorKey);
          });
        }
      }
      return Promise.resolve(response)
    } else {
      // EXPORT FAILED
      const message = `document ${operationName} failed with exitCode ${exitCode}`;
      const debugMessage = [
        message,
        stringify(error),
        'command line:',
        commandLine,
      ].join('\n');
      errorFeedback(hub, debugMessage, editorKey);
      return Promise.resolve({
        error,
        message,
        doc: {
          id,
          path: resultFile,
          content: output,
          configurationName,
        } as CxDocument,
        resultFile,
        commandLine,
        cwd,
      });
    }
  } catch (error) {
    return Promise.resolve({
      error,
      message: `${operationName} failed`,
      doc: { content, format: converter?.format, configurationName } as CxDocument,
      resultFile,
      cwd,
    });
  }
}

