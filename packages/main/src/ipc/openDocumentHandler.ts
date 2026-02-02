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
  DocumentFormat,
} from '../common';
import { updateBookmarksFile } from '../bookmarks';
import { importWithPandoc } from '../importExport';
import { refreshMainMenu } from '../mainWindow';
import { pandocFeatures } from '../pandocFeatures';
import { isReadableFile } from '../resourcesManager';
import { externalProgramError, runExternalProgram } from '../runExternal';
import { commandLineFeedback, errorFeedback } from './feedback';
import { computeProjectFromDocFile } from './getProjectHandler';
import { IpcHub } from './ipcHub';
import { getConfigurationInit } from './configurationHandlers';
import { fileURLToPath } from 'url';
import { pathToUrl } from './pathToUrl';

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
          path: _path,
          project,
        } = context;
        if (!_path)
          return Promise.reject(`openDocumentHandler: please provide a valid file path!`)
        const url = pathToUrl(_path!, project)
        if (!url)
          return Promise.reject(`openDocumentHandler: please provide a valid file path!`)
        const path = fileURLToPath(url)
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

async function openDocument(hub: IpcHub, context: DocumentContext, tryFormats?: DocumentFormat[]): Promise<CxDocument> {
  if (tryFormats !== undefined && tryFormats.length > 0) {
    console.log(`openDocument: PASS 3, trying formats guessed from filename extension`)
    try {
      const documentFormat = tryFormats[0]
      console.log(`trying to open "${context.path}" as ${documentFormat.name}`)
      return openDocumentWithFormat(hub, { ...context, documentFormat })
    } catch (err) {
      if (tryFormats.length < 2) // last format
        return Promise.reject(err)
      else                       // try the next one
        return openDocument(hub, context, tryFormats.slice(1))
    }
  } else {
    console.log(`openDocument: PASS 1, see whether a format has been provided`)
    const { configurationName, documentFormat, path, project } = context;
    if (!path)
      return Promise.reject('You must provide a file name');
    if (!isReadableFile(path))
      return Promise.reject(`can't read "${path}"`);
    if (documentFormat)
      return openDocumentWithFormat(hub, context)
    console.log(`openDocument: PASS 2, no format provided, let's guess from extension`)
    const config = project ? project.computedConfig : await getConfigurationInit(configurationName)
    const guessed = await pandocFeatures.documentFormatsFromFilename(path, 'input', config)
    console.log(`suitable formats for ${path}: ${guessed.map(g => g.name).join()}`)
    if (guessed.length > 0)
      return openDocument(hub, context, guessed)
    else
      return Promise.reject(`Can't guess the file format`)
  }
}

async function openDocumentWithFormat(hub: IpcHub, context: DocumentContext): Promise<CxDocument> {
  const { configurationName, documentFormat, path } = context;
  // openDocument ensures that documentFormat is defined and path is a readable filename
  const { ftype, name: formatName } = documentFormat!
  const filename = path!
  const inputConverter = ftype === 'input-converter' && documentFormatToInputConverter(documentFormat)
  const editorKey = context.editorKey || hub.mainEditorKey;
  let result: ExternalProgramResult | undefined = undefined;
  let cmdLineFeedback: ((msg: string) => void) | undefined = undefined;
  const { dir, name } = parsePath(filename);
  const resourcePath = [formatPath(parsePath(dir))];
  console.log(`openDocumentWithFormat, format: ${JSON.stringify(documentFormat!)}`)
  try {
    if (inputConverter) {
      if (inputConverter.feedback)
        cmdLineFeedback = (msg) => commandLineFeedback(hub, msg, editorKey);
      // console.log(`FEEDBACK: ${JSON.stringify(inputConverter.feedback)}`);
      switch (inputConverter.type) {
        case 'pandoc':
          result = await importWithPandoc({ ...context, path: filename })
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
    } else if (ftype === 'format') {
      if (formatName === 'json') {
        result = {
          exitCode: 0,
          commandLine: '',
          cwd: parsePath(filename).dir,
          output: await readFile(filename).then((buf) => buf.toString()),
          error: '',
        };
      } else {
        result = await importWithPandoc({ ...context, path: filename });
      }
    } else {
      return Promise.reject(`Can't guess the file format`)
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
        path,
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
