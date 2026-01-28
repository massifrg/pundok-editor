import { IpcMainInvokeEvent } from 'electron';
import { readFile } from 'fs/promises';
import {
  format as formatPath,
  isAbsolute,
  parse as parsePath,
  resolve,
} from 'path';
import {
  PundokBookmark,
  DocumentContext,
  CxDocument,
  documentFormatToInputConverter,
  ExternalProgramResult,
  CustomPandocReader,
  CUSTOM_PANDOC_READERS,
  PundokEditorProject,
} from '../common';
import { updateBookmarksFile } from '../bookmarks';
import { importJsonWithPandoc } from '../importExport';
import { refreshMainMenu } from '../mainWindow';
import { isReadableFile } from '../resourcesManager';
import { externalProgramError, runExternalProgram } from '../runExternal';
import { commandLineFeedback, errorFeedback } from './feedback';
import { computeProjectFromDocFile } from './getProjectHandler';
import { IpcHub } from './ipcHub';

/**
 * Return a handler function for the messages that the `renderer` sends on the `open-document` channel,
 * to ask to read and send back the contents of a file to the `renderer`.
 * @param hub the manager of the communications between `main` and `renderer`
 * @returns
 */
export const openDocumentHandler =
  (hub: IpcHub) =>
    async (e: IpcMainInvokeEvent, ctx: string) => {
      try {
        const context = JSON.parse(ctx) as DocumentContext
        const {
          configurationName,
          editorKey,
          documentFormat,
          path: maybePath,
          project,
        } = context;
        let path = maybePath;
        if (project && maybePath && !isAbsolute(maybePath)) {
          if (project.rootDocument && isAbsolute(project.rootDocument)) {
            path = resolve(parsePath(project.rootDocument).dir, maybePath);
          } else {
            path = resolve(project.path, maybePath);
          }
        }
        const readDoc = await openDocument(hub, {
          editorKey,
          configurationName,
          path,
          documentFormat,
          project,
        });
        const bookmarks: PundokBookmark[] = [];
        if (readDoc?.path)
          bookmarks.push({
            type: 'document',
            path: readDoc!.path,
            configurationName: readDoc?.project
              ? undefined
              : readDoc.configurationName,
          });
        if (readDoc?.project?.rootDocument)
          bookmarks.push({
            type: 'project',
            name: readDoc.project.name,
            path: resolve(readDoc.project.path, readDoc.project.rootDocument),
          });
        await updateBookmarksFile(bookmarks);
        refreshMainMenu(hub);
        return readDoc;
      } catch (err) {
        return Promise.reject(err);
      }
    };

async function openDocument(hub: IpcHub, context: DocumentContext): Promise<CxDocument> {
  const { configurationName, documentFormat, path: filename } = context;
  const inputConverter = documentFormat?.ftype === 'input-converter' && documentFormatToInputConverter(documentFormat)
  const editorKey = context.editorKey || hub.mainEditorKey;
  if (!filename)
    return Promise.reject('You must provide a file name');
  if (!isReadableFile(filename))
    return Promise.reject(`can't read "${filename}"`);

  let format: string | undefined
  let result: ExternalProgramResult | undefined = undefined;
  let cmdLineFeedback: ((msg: string) => void) | undefined = undefined;
  const { dir, name } = parsePath(filename);
  const resourcePath = [formatPath(parsePath(dir))];
  try {
    if (inputConverter) {
      if (inputConverter.feedback)
        cmdLineFeedback = (msg) => commandLineFeedback(hub, msg, editorKey);
      // console.log(`FEEDBACK: ${JSON.stringify(inputConverter.feedback)}`);
      switch (inputConverter.type) {
        case 'pandoc':
          result = await importJsonWithPandoc(
            filename,
            inputConverter.format,
            context
          );
          break;
        case 'custom':
          {
            const reader: CustomPandocReader | undefined =
              CUSTOM_PANDOC_READERS[inputConverter.name];
            if (reader) {
              result = await reader.readFile(filename);
            } else {
              result = externalProgramError(
                `there's no "${inputConverter.name}" custom reader!`,
              );
            }
          }
          break;
        case 'script':
          result = await runExternalProgram(
            inputConverter.command,
            inputConverter.commandArgs,
            {},
          ).result;
          break;
      }
    } else if (documentFormat?.ftype === 'format') {
      if (documentFormat?.name === 'json') {
        result = {
          exitCode: 0,
          commandLine: '',
          cwd: parsePath(filename).dir,
          output: await readFile(filename).then((buf) => buf.toString()),
          error: '',
        };
      } else if (documentFormat?.name) {
        format = documentFormat.name
        result = await importJsonWithPandoc(filename, format, {});
      }
    } else {
      // TODO: try to guess the format?
      return Promise.reject(`Can't determine the file format`)
    }
  } catch (err) {
    if (err) errorFeedback(hub, `${err}`, editorKey);
  }

  if (!result) {
    errorFeedback(hub, `no result reading ${filename}`, editorKey);
  } else {
    const { commandLine, error, exitCode, output } = result
    if (exitCode === 0) {
      const doc: CxDocument = {
        editorKey,
        id: name,
        path: filename,
        content: output,
        documentFormat,
        configurationName,
        resourcePath,
      };
      if (cmdLineFeedback) cmdLineFeedback(commandLine);
      let project: PundokEditorProject | undefined = undefined;
      try {
        project = await computeProjectFromDocFile(filename)
        doc.project = project;
      } catch (err) {
        console.log(`error loading project: ${err}`);
      }
      return doc;
    } else {
      errorFeedback(hub, (commandLine ? `${commandLine}\n\n` : '') + error, editorKey);
    }
  }
  return Promise.reject(`Error trying to open "${filename}"`)
}

