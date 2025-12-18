import type {
  BaseWindow,
  OpenDialogOptions,
  SaveDialogOptions,
  WebContentsView,
} from 'electron';
import { ipcMain, shell } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import {
  basename,
  format as formatPath,
  isAbsolute,
  parse as parsePath,
  resolve,
} from 'path';
import {
  CommandToRenderer,
  EditorKeyType,
  ExternalProgramResult,
  IPC_CHANNELS,
  PundokEditorProject,
  ReadDoc,
  SaveResponse,
  ServerMessage,
  ServerMessageCommand,
  StoredDoc,
  computeProjectConfiguration,
  PundokEditorConfig,
  DocumentContext,
  CUSTOM_PANDOC_READERS,
  CustomPandocReader,
  IpcMainToRendererChannel,
  ServerMessageForViewer,
  ServerMessageSetProject,
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
import { stringify } from '../utils';
import { queryHandler } from './queryHandler';
import { saveDocumentHandler } from './saveDocumentHandler';
import { setValueHandler } from './setValueHandler';
import { computeProjectFromDocFile, getProjectHandler } from './getProjectHandler';
import { openDocumentHandler } from './openDocumentHandler';
import { editorReadyHandler } from './editorReadyHandler';
import { debugInfoHandler } from './debugInfoHandler';
import { transformJsonHandler } from './transformJsonHandler';
import { newProjectHandler } from './newProjectHandler';
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
import { askForDocumentHandler } from './askForDocumentHandler';
import { getInclusionTreeHandler } from './getInclusionTreeHandler';
import { getSourceFileHandler } from './getSourceFileHandler';
import { exportAgainHandler } from './exportAgainHandler';
import { rememberDocumentHash } from './documentHash';
import { expandCommandArgs } from './expandCommandArgs';
import { getExportJobHandler } from './getExportJobHandler';
import { showAgainHandler } from './showAgainHandler';
import { updateConfigHandler } from './updateConfigHandler';

/** An object describing a document's opening */
export interface DocumentOpening {
  /** The path of the document to be opened */
  path?: string,
  /** The configuration with which the document must be opened */
  configurationName?: string,
  /** After opening, go to line (paragraph)... */
  atLine?: number,
  /** If there's no mainEditorKey yet, open when it's set (otherwise cancel the open document operation) */
  whenEditorReady?: boolean
}

/**
 * A class to handle the communication between `main` and `renderer` processes.
 */
export class IpcHub {
  readonly fileManager: FileManager = new FileManager();
  private mainEditorKey: EditorKeyType | undefined = undefined;
  pendingDocumentOpen: DocumentOpening | undefined = undefined;

  constructor(
    readonly baseWindow: BaseWindow,
    readonly editorView: WebContentsView,
  ) {
    this.handleIpcMainEvents();
  }

  send(channel: IpcMainToRendererChannel, message: ServerMessage) {
    this.editorView.webContents.send(channel, message);
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
    ipcMain.handle('new-project', newProjectHandler(this));
    ipcMain.handle('transform-json', transformJsonHandler(this));
    ipcMain.handle('pandoc-input-formats', pandocInputFormatsHandler(this));
    ipcMain.handle('pandoc-output-formats', pandocOutputFormatsHandler(this));
    ipcMain.handle('query', queryHandler(this));
    ipcMain.handle('get-source-file', getSourceFileHandler(this));
    ipcMain.handle('show-again', showAgainHandler(this));
    ipcMain.handle('export-again', exportAgainHandler(this));
    ipcMain.handle('get-export-job', getExportJobHandler(this));
    ipcMain.handle('update-config', updateConfigHandler(this))
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
              cwd: parsePath(filename).dir,
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
      const { commandLine, error, exitCode, output } = result
      if (exitCode === 0) {
        const readDoc: ReadDoc = {
          editorKey,
          id: name,
          path: filename,
          content: output,
          configurationName,
          resourcePath,
        };
        if (cmdLineFeedback) cmdLineFeedback(commandLine);
        let project: PundokEditorProject | undefined = undefined;
        try {
          project = await computeProjectFromDocFile(filename)
          // project = await loadProjectFromDocFile(filename);
          // if (project) {
          //   console.log(`found project for file ${filename}`);
          //   project = await computeProjectConfiguration(
          //     project,
          //     async (configName) => {
          //       const cfgInit = await getConfigurationInit(configName);
          //       return cfgInit && new PundokEditorConfig(cfgInit);
          //     },
          //   );
          // }
          readDoc.project = project;
        } catch (err) {
          console.log(`error loading project: ${err}`);
        }
        return readDoc;
      } else {
        errorFeedback(this, (commandLine ? `${commandLine}\n\n` : '') + error, editorKey);
      }
    }
  }

  async saveDocument(
    doc: ReadDoc,
    project?: PundokEditorProject,
  ): Promise<SaveResponse> {
    const { path, content } = doc;
    const docPath =
      path ||
      (await this.fileManager.saveFileDialog({
        defaultPath: path,
        filters: [
          {
            name: 'pandoc json',
            extensions: ['json'],
          },
        ],
      }));
    try {
      await writeFile(docPath, content!)
      const p = parsePath(docPath)
      const id = doc.id || basename(docPath, '.json');

      // load the project, if the document has been saved in a project directory
      // TODO: what to do when a file in a project is saved in the directory of another project?
      if (docPath && !project) {
        try {
          const dirProject = await computeProjectFromDocFile(docPath)
          console.log(`dirProject is ${dirProject.name}`)
          if (dirProject) {
            doc.project = dirProject
            this.fireEventSetProject(dirProject)
          }
        } catch (err) {
          console.log(`no project file in document folder (${parsePath(docPath).dir})`)
        }
      }

      return {
        message: 'document saved',
        doc: {
          path: docPath,
          content,
          id,
          configurationName: doc.configurationName,
          project: doc.project,
        },
        resultFile: docPath,
        cwd: p.dir,
      };
    } catch (error) {
      return Promise.reject({
        error,
        message: JSON.stringify(error),
        doc: { content, path: docPath },
      });
    };
  }

  async exportDocument(
    doc: StoredDoc,
    project?: PundokEditorProject,
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
    const cwd = project?.path || process.cwd();

    const sourceFile = doc.path
    let resultFile = converter?.resultFile
      ? expandCommandArgs([converter.resultFile], sourceFile)[0]
      : undefined
    resultFile = converter?.dontAskForResultFile
      ? resultFile
      : exportedAsPath;
    if (!converter?.dontAskForResultFile) {
      if (!resultFile) resultFile = await this.fileManager.saveFileDialog(saveOpts);
      if (!resultFile)
        return Promise.resolve({
          error: 'no output file given',
          message: 'export failed',
          doc: { content, configurationName },
          resultFile,
        } as SaveResponse);
    }
    if (resultFile && !isAbsolute(resultFile))
      resultFile = resolve(cwd, resultFile)

    const resourcesPaths = validResourcePaths(
      undefined,
      project,
      configurationName,
    );

    // if content comes from a file (doc.path) and not from stdin, remember job
    let documentHash: string | undefined = undefined
    if (sourceFile) {
      documentHash = await rememberDocumentHash({
        path: sourceFile,
        converter: doc.converter!,
        configurationName: doc.configurationName,
        projectAsJsonString: project ? JSON.stringify(project) : undefined
      })
    }

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
            sourceFile,
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
      const { commandLine, error, exitCode, output } = result
      if (converter?.feedback) {
        switch (converter.feedback) {
          case 'command-line':
            commandLineFeedback(this, commandLine, editorKey);
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
      if (exitCode === 0) {
        const response: SaveResponse = {
          message: 'document exported',
          doc: {
            id,
            converter,
            configurationName,
            path: doc.path,
            exportedAsPath: resultFile,
            content: output,
          } as StoredDoc,
          resultFile,
          documentHash,
          commandLine,
          cwd,
        }
        if (resultFile) {
          const openResult = doc.converter?.openResult;
          console.log(`openResult = ${openResult}`);
          if (openResult === 'editor') {
            this.send('show-in-viewer', {
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
              errorFeedback(this, stringify(error), editorKey);
            });
          }
        }
        return Promise.resolve(response)
      } else {
        const message = `export failed with exitCode ${exitCode}`;
        const debugMessage = [
          message,
          stringify(error),
          'command line:',
          commandLine,
        ].join('\n');
        errorFeedback(this, debugMessage, editorKey);
        return Promise.resolve({
          error,
          message,
          doc: {
            id,
            path: resultFile,
            content: output,
            configurationName,
          } as StoredDoc,
          resultFile,
          commandLine,
          cwd,
        });
      }
    } catch (error) {
      return Promise.resolve({
        error,
        message: 'export failed',
        doc: { content, configurationName },
        resultFile,
        cwd,
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

  fireEventOpenDocument(docToOpen?: DocumentOpening) {
    if (this.mainEditorKey) {
      const { path, configurationName, atLine } = docToOpen || {}
      this.fireEventInRenderer('document', 'open', { path, configurationName, atLine });
      this.pendingDocumentOpen = undefined
    } else if (docToOpen?.whenEditorReady)
      this.pendingDocumentOpen = docToOpen
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

  fireEventCreateNewProject() {
    this.fireEventInRenderer('document', 'new-project');
  }

  fireEventSetProject(project: PundokEditorProject, editorKey?: EditorKeyType) {
    const message: ServerMessageSetProject = {
      type: 'project',
      project,
      editorKey: editorKey || this.mainEditorKey
    }
    this.editorView.webContents.send('set-project', message)
  }
}
