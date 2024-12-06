import type {
  BaseWindow,
  BrowserWindow,
  Input,
  OpenDialogOptions,
  SaveDialogOptions,
  WebContentsView,
} from 'electron';
import { ipcMain } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import {
  basename,
  format as formatPath,
  isAbsolute,
  parse as parsePath,
  sep as pathSeparator,
} from 'path';
import {
  CommandToRenderer,
  EditorKeyType,
  ExternalProgramResult,
  IPC_CHANNELS,
  PandocEditorProject,
  ReadDoc,
  SaveResponse,
  ServerMessage,
  ServerMessageCommand,
  StoredDoc,
  computeProjectConfiguration,
  PandocEditorConfig,
  DocumentContext,
  CUSTOM_PANDOC_READERS,
  CustomPandocReader,
  IpcMainToRendererChannel,
} from '../common';
import { isReadableFile, validResourcePaths } from '../resourcesManager';
import FileManager from '../fileManager';
import {
  exportWithPandoc,
  exportWithPandocLua,
  exportWithScript,
  importJsonWithPandoc,
} from '../importExport';
import {
  ProgressCallback,
  externalProgramError,
  runExternalProgram,
} from '../runExternal';
import {
  commandLineFeedback,
  errorFeedback,
  messageFeedback,
  progressFeedback,
} from './feedback';
import { queryHandler } from './queryHandler';
import { saveDocumentHandler } from './saveDocumentHandler';
import { setValueHandler } from './setValueHandler';
import { getProjectHandler, loadProjectFromDocFile } from './getProjectHandler';
import { openDocumentHandler } from './openDocumentHandler';
import { editorReadyHandler } from './editorReadyHandler';
import { debugInfoHandler } from './debugInfoHandler';
import { transformJsonHandler } from './transformJsonHandler';
import {
  availableConfigurationsHandler,
  getConfigurationInit,
  loadConfigurationHandler,
} from './configurationHandlers';
import {
  pandocInputFormatsHandler,
  pandocOutputFormatsHandler,
} from './pandocFormatsHandler';
import { fileContentsHandler } from './fileContentsHandler';
import { askForDocumentHandler, getInclusionTreeHandler } from '.';

/**
 * A class to handle the communication between `main` and `renderer` processes.
 */
export class IpcHub {
  readonly fileManager: FileManager = new FileManager();
  private mainEditorKey: EditorKeyType | undefined = undefined;

  constructor(
    readonly baseWindow: BaseWindow,
    readonly editorView: WebContentsView,
    readonly pdfView: WebContentsView,
  ) {
    this.handleIpcMainEvents();
  }

  send(channel: IpcMainToRendererChannel, message: ServerMessage) {
    const webContents =
      message.type === 'viewer'
        ? this.pdfView.webContents
        : this.editorView.webContents;
    webContents.send(channel, message);
  }

  setWindowTitle(title: string) {
    this.baseWindow.setTitle(title);
  }

  setMainEditorKey(editorKey: EditorKeyType) {
    this.mainEditorKey = editorKey;
  }

  handleIpcMainEvents() {
    ipcMain.handle('editor-ready', editorReadyHandler(this));
    ipcMain.handle('open-document', openDocumentHandler(this));
    ipcMain.handle('save-document', saveDocumentHandler(this));
    ipcMain.handle('debug-info', debugInfoHandler(this));
    ipcMain.handle('get-project', getProjectHandler(this));
    ipcMain.handle('get-inclusion-tree', getInclusionTreeHandler(this));
    ipcMain.handle('ask-for-document', askForDocumentHandler(this));
    ipcMain.handle(
      'available-configurations',
      availableConfigurationsHandler(this),
    );
    ipcMain.handle('load-configuration', loadConfigurationHandler(this));
    ipcMain.handle('file-contents', fileContentsHandler(this));
    ipcMain.handle('set-value', setValueHandler(this));
    // ipcMain.handle('new-project', newProjectHandler(this));
    ipcMain.handle('transform-json', transformJsonHandler(this));
    ipcMain.handle('pandoc-input-formats', pandocInputFormatsHandler(this));
    ipcMain.handle('pandoc-output-formats', pandocOutputFormatsHandler(this));
    ipcMain.handle('query', queryHandler(this));
  }

  async openDocument(
    context: DocumentContext,
    options?: OpenDialogOptions,
  ): Promise<ReadDoc | undefined> {
    const { configurationName, inputConverter, path } = context;
    const editorKey = context.editorKey || this.mainEditorKey;
    const filename =
      path ||
      (await this.fileManager.openFile(
        {
          ...options,
          filters: [
            {
              name: 'pandoc json',
              extensions: ['json'],
            },
            {
              name: 'pandoc importable',
              extensions: [
                'docx',
                'odt',
                'html',
                'xhtml',
                'rtf',
                'epub',
                'native',
                'md',
                'csv',
              ],
            },
          ],
        },
        inputConverter,
      ));
    if (!filename) return;
    if (!isReadableFile(filename))
      return Promise.reject(`can't read "${filename}"`);

    let result: ExternalProgramResult | undefined = undefined;
    let cmdLineFeedback: ((msg: string) => void) | undefined = undefined;
    const { dir, name } = parsePath(filename);
    const resourcePath = [formatPath(parsePath(dir))];
    try {
      if (inputConverter) {
        if (inputConverter.feedback)
          cmdLineFeedback = (msg) => commandLineFeedback(this, msg, editorKey);
        // console.log(`FEEDBACK: ${JSON.stringify(inputConverter.feedback)}`);
        switch (inputConverter.type) {
          case 'pandoc':
            result = await importJsonWithPandoc(
              filename,
              inputConverter.format,
              configurationName,
              inputConverter,
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
      } else {
        const extension = filename.replace(/^.*?[.]([0-9a-z]+)$/i, '$1');
        switch (extension) {
          case 'docx':
          case 'odt':
          case 'html':
          case 'rtf':
          case 'epub':
          case 'native':
          case 'csv':
            result = await importJsonWithPandoc(filename, extension);
            break;
          case 'md':
            result = await importJsonWithPandoc(filename, 'markdown');
            break;
          default:
            result = {
              exitCode: 0,
              commandLine: '',
              output: await readFile(filename).then((buf) => buf.toString()),
              error: '',
            };
        }
      }
    } catch (err) {
      if (err) errorFeedback(this, `${err}`, editorKey);
    }

    if (!result) {
      errorFeedback(this, `no result reading ${filename}`, editorKey);
    } else {
      if (result.exitCode === 0) {
        const readDoc: ReadDoc = {
          editorKey,
          id: name,
          path: filename,
          content: result.output,
          configurationName,
          resourcePath,
        };
        if (cmdLineFeedback) cmdLineFeedback(result.commandLine);
        let project: PandocEditorProject | undefined = undefined;
        try {
          project = await loadProjectFromDocFile(filename);
          if (project) {
            console.log(`found project for file ${filename}`);
            project = await computeProjectConfiguration(
              project,
              async (configName) => {
                const cfgInit = await getConfigurationInit(configName);
                return cfgInit && new PandocEditorConfig(cfgInit);
              },
            );
          }
          readDoc.project = project;
        } catch (err) {
          console.log(`error loading project: ${err}`);
        }
        return readDoc;
      } else {
        const cl = result.commandLine;
        errorFeedback(this, (cl ? `${cl}\n\n` : '') + result.error, editorKey);
      }
    }
  }

  async saveDocument(
    doc: ReadDoc,
    project?: PandocEditorProject,
  ): Promise<SaveResponse> {
    const { path, content } = doc;
    const docPath =
      path ||
      (await this.fileManager.saveFile({
        defaultPath: path,
        filters: [
          {
            name: 'pandoc json',
            extensions: ['json'],
          },
        ],
      }));
    return writeFile(docPath, content)
      .then(() => {
        const id = doc.id || basename(docPath, '.json');
        return {
          message: 'document saved',
          doc: {
            path: docPath,
            content,
            id,
            configurationName: doc.configurationName,
          },
          resultFile: docPath,
        };
      })
      .catch((error) => {
        return Promise.reject({
          error,
          message: JSON.stringify(error),
          doc: { content, path: docPath },
        });
      });
  }

  async exportDocument(
    doc: StoredDoc,
    project?: PandocEditorProject,
    editorKey?: EditorKeyType,
  ): Promise<SaveResponse> {
    const { content, converter, exportedAsPath, configurationName } = doc;
    const saveOpts: Partial<SaveDialogOptions> = {};
    if (converter?.extension) {
      const { extension, format } = converter;
      const name =
        format === extension
          ? `*.${extension}`
          : `${format} files (*.${extension})`;
      saveOpts.filters = [{ name, extensions: [extension] }];
    }
    const cwd = project?.path;

    let resultFile = converter?.dontAskForResultFile
      ? converter.resultFile
      : exportedAsPath;
    if (!converter?.dontAskForResultFile) {
      if (!resultFile) resultFile = await this.fileManager.saveFile(saveOpts);
      if (!resultFile)
        return Promise.resolve({
          error: 'no output file given',
          message: 'export failed',
          doc: { content, configurationName },
          resultFile,
        });
    }
    if (resultFile && !isAbsolute(resultFile))
      resultFile = `${cwd}${pathSeparator}${resultFile}`;

    const resourcesPaths = validResourcePaths(
      undefined,
      project,
      configurationName,
    );

    try {
      let result: ExternalProgramResult;
      switch (converter?.type) {
        case 'custom':
          throw new Error('custom converter not implemented yet');
          break;
        case 'lua':
          result = await exportWithPandocLua(content, {
            converter,
            cwd,
            resourcesPaths,
          });
          break;
        case 'script':
          const callback: ProgressCallback = (source, chunk) => {
            progressFeedback(this, source, chunk.toString(), editorKey);
          };
          result = await exportWithScript(content, {
            converter,
            configurationName,
            project,
            cwd,
            resourcesPaths,
            resultFile,
            callback,
          });
          break;
        case 'pandoc':
        default:
          result = await exportWithPandoc(content, {
            converter,
            configurationName,
            project,
            cwd,
            resourcesPaths,
            resultFile,
          });
      }
      const ext = converter?.extension;
      const id = doc.id; // || basename(resultFile, ext && `.${ext}`);
      if (converter?.feedback) {
        switch (converter.feedback) {
          case 'command-line':
            commandLineFeedback(this, result.commandLine, editorKey);
            break;
          case 'success':
          default:
            messageFeedback(
              this,
              `successfully exported in "${resultFile}"`,
              editorKey,
            );
        }
      }
      if (result.exitCode === 0) {
        return Promise.resolve({
          message: 'document exported',
          doc: {
            id,
            converter,
            configurationName,
            path: doc.path,
            exportedAsPath: resultFile,
            content: result.output,
            // preview: converter?.openResult
            //   ? { inPandocEditor: ext === 'pdf' ? 'editor' : 'os' }
            //   : undefined,
          } as StoredDoc,
          resultFile,
        });
      } else {
        const message = `export failed with exitCode ${result.exitCode}`;
        const debugMessage = [
          message,
          result.error,
          'command line:',
          result.commandLine,
        ].join('\n');
        errorFeedback(this, debugMessage, editorKey);
        return Promise.resolve({
          error: result.error,
          message,
          doc: {
            id,
            path: resultFile,
            content: result.output,
            configurationName,
          } as StoredDoc,
          resultFile,
        });
      }
    } catch (error) {
      return Promise.resolve({
        error,
        message: 'export failed',
        doc: { content, configurationName },
        resultFile,
      });
    }
  }

  fireEventInRenderer(
    channelName: IpcMainToRendererChannel,
    command: CommandToRenderer,
    otherProps?: Record<string, any>,
  ) {
    const channel = IPC_CHANNELS[channelName];
    if (channel && (channel.dir === 'm2r' || channel.dir === 'both')) {
      const message: ServerMessageCommand = {
        type: 'command',
        command,
        editorKey: this.mainEditorKey,
        ...otherProps,
      };
      this.editorView.webContents.send(channelName, message);
    } else {
      console.error(
        `"${channelName}" is not a valid channel to communicate from main to renderer`,
      );
    }
  }

  fireEventOpenDocument(path?: string, configurationName?: string) {
    this.fireEventInRenderer('document', 'open', { path, configurationName });
  }

  fireEventSaveCurrentDocument() {
    this.fireEventInRenderer('document', 'save');
  }

  fireEventSaveCurrentDocumentAs() {
    this.fireEventInRenderer('document', 'save-as');
  }

  fireEventExportCurrentDocument() {
    this.fireEventInRenderer('document', 'export');
  }

  fireEventImportDocument() {
    this.fireEventInRenderer('document', 'import');
  }
}
