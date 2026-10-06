import type { BaseWindow, WebContentsView } from 'electron';
import { ipcMain, shell } from 'electron';
import {
  CommandToRenderer,
  type CxDocument,
  type DocumentContext,
  documentFormatToOutputConverter,
  EditorKeyType,
  IPC_CHANNELS,
  type PundokEditorProject,
  ServerMessage,
  ServerMessageCommand,
  IpcMainToRendererChannel,
  ServerMessageSetProject,
} from '../common';
import type { RendererHub } from '../backend';
// import FileManager from '../fileManager';
import {
  getAvailableConfigurationSummaries,
  getBackendDebugInfo,
  getBookmarks,
  getValue,
  getPandocFeature,
  getRenderingJobWithHash,
  getRenderingJobWithHashAsJsonString,
  loadConfiguration,
  createProject,
  createFolder,
  getFileContents,
  findResourceFilesWithProvenance,
  editorReady,
  getProject,
  getInclusionTree,
  queryHandler,
  updateConfiguration,
  transformJsonHandler,
  showAgain,
  feedbackSink,
  getSourceLocation,
  desktopRenderingJobStore,
  openDocument,
  saveDocument,
  errorFeedback,
  GitRepositoryManager,
} from '../backend';
import { backendDirectories } from '../resourcesManager';
import { renderAgainHandler } from './renderAgainHandler';
import { getFolderContentsHandler } from './getFolderContentsHandler';
import { refreshMainMenu } from '../mainWindow';
import { setValueHandler } from './setValueHandler';

/** An object describing a document's opening */
export interface DocumentOpening {
  /** The path of the document to be opened */
  path?: string;
  /** The configuration with which the document must be opened */
  configurationName?: string;
  /** After opening, go to line (paragraph)... */
  atLine?: number;
  /** If there's no mainEditorKey yet, open when it's set (otherwise cancel the open document operation) */
  whenEditorReady?: boolean;
}

/**
 * A class to handle the communication between `main` and `renderer` processes.
 */
export class IpcHub implements RendererHub {
  private readonly gitRepositories = new GitRepositoryManager(
    backendDirectories(),
  );
  private readonly inclusionTrees = new Map<
    string,
    Promise<string | undefined>
  >();

  // readonly fileManager: FileManager = new FileManager();
  mainEditorKey: EditorKeyType | undefined = undefined;
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

  private inclusionTree(
    project: PundokEditorProject,
    refresh?: boolean,
  ): Promise<string | undefined> {
    const key = JSON.stringify(project);
    if (!refresh) {
      const cached = this.inclusionTrees.get(key);
      if (cached) return cached;
    }

    const pending = getInclusionTree(backendDirectories(), project);
    this.inclusionTrees.set(key, pending);
    void pending.catch(() => {
      if (this.inclusionTrees.get(key) === pending)
        this.inclusionTrees.delete(key);
    });
    return pending;
  }

  handleIpcMainEvents() {
    ipcMain.handle('editor-ready', (_event, editorKey) =>
      editorReady(backendDirectories(), this, editorKey),
    );
    ipcMain.handle('get-folder-contents', getFolderContentsHandler(this));
    ipcMain.handle('create-folder', (_event, path) => createFolder(path));
    ipcMain.handle('open-document', async (_event, serializedContext) => {
      const context = JSON.parse(serializedContext) as DocumentContext;
      const document = await openDocument(
        backendDirectories(),
        feedbackSink(this),
        { ...context, editorKey: context.editorKey || this.mainEditorKey },
      );
      refreshMainMenu(this);
      return document;
    });
    ipcMain.handle('save-document', async (_event, serializedDocument) => {
      const document = JSON.parse(serializedDocument) as CxDocument;
      const response = await saveDocument(
        backendDirectories(),
        this,
        feedbackSink(this),
        desktopRenderingJobStore(),
        document,
      );
      const converter = documentFormatToOutputConverter(
        document.documentFormat,
      );
      if (
        !response.error &&
        response.resultFile &&
        converter?.openResult === 'os'
      ) {
        shell.openPath(response.resultFile).then((error) => {
          if (error)
            errorFeedback(feedbackSink(this), error, document.editorKey);
        });
      }
      return response;
    });
    ipcMain.handle('debug-info', () =>
      getBackendDebugInfo(backendDirectories()),
    );
    ipcMain.handle('get-project', (_event, options) =>
      getProject(backendDirectories(), options),
    );
    ipcMain.handle('get-inclusion-tree', (_event, project, refresh) =>
      this.inclusionTree(
        JSON.parse(project) as PundokEditorProject,
        refresh,
      ),
    );
    ipcMain.handle('get-bookmarks', (_event, bookmarkType) =>
      getBookmarks(backendDirectories(), bookmarkType),
    );
    ipcMain.handle('get-value', (_event, key) =>
      getValue(backendDirectories(), key),
    );
    ipcMain.handle('available-configurations', (_event, options) =>
      getAvailableConfigurationSummaries(backendDirectories(), options),
    );
    ipcMain.handle('load-configuration', (_event, configurationName) =>
      loadConfiguration(backendDirectories(), configurationName),
    );
    ipcMain.handle('file-contents', (_event, filename, options) =>
      getFileContents(backendDirectories(), filename, options),
    );
    ipcMain.handle(
      'find-resource-files',
      (_event, filenameRegex, regexFlags, options) =>
        findResourceFilesWithProvenance(
          backendDirectories(),
          new RegExp(filenameRegex, regexFlags),
          options,
        ),
    );
    ipcMain.handle('set-value', setValueHandler(this));
    ipcMain.handle('new-project', (_event, directory, project) =>
      createProject(directory, JSON.parse(project)),
    );
    ipcMain.handle('transform-json', (_event, document, transform) =>
      transformJsonHandler(backendDirectories(), document, transform),
    );
    ipcMain.handle('pandoc-feature', (_event, featureName, options) =>
      getPandocFeature(featureName, options),
    );
    ipcMain.handle('query', (_event, query) =>
      queryHandler(backendDirectories(), query),
    );
    ipcMain.handle('get-source-file', async (_event, editorKey, info) => {
      const source = await getSourceLocation(
        backendDirectories(),
        feedbackSink(this),
        editorKey,
        info,
      );
      if (source)
        this.fireEventOpenDocument({
          path: source.path,
          atLine: source.line,
        });
    });
    ipcMain.handle('show-rendered-again', (_event, hash, editorKey) =>
      showAgain(this, getRenderingJobWithHash(hash), hash, editorKey),
    );
    ipcMain.handle('render-again', renderAgainHandler(this));
    ipcMain.handle('get-rendering-job', (_event, hash) =>
      getRenderingJobWithHashAsJsonString(hash),
    );
    ipcMain.handle('update-config', (_event, options) =>
      updateConfiguration(options),
    );
    ipcMain.handle('list-git-repositories', () => this.gitRepositories.list());
    ipcMain.handle('clone-git-project', (_event, options) =>
      this.gitRepositories.clone(options),
    );
    ipcMain.handle('publish-git-project', (_event, options) =>
      this.gitRepositories.publish(options),
    );
    ipcMain.handle('connect-git-project', (_event, options) =>
      this.gitRepositories.connect(options),
    );
    ipcMain.handle('git-project-status', (_event, path) =>
      this.gitRepositories.status(path),
    );
    ipcMain.handle('init-git-project', (_event, path) =>
      this.gitRepositories.init(path),
    );
    ipcMain.handle('stage-git-project', (_event, path, paths) =>
      this.gitRepositories.stage(path, paths),
    );
    ipcMain.handle('commit-git-project', (_event, options) =>
      this.gitRepositories.commit(options),
    );
    ipcMain.handle('scan-git-projects', (_event, url, user, password) =>
      this.gitRepositories.scanRemoteProjects(url, user, password),
    );
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
      const { path, configurationName, atLine } = docToOpen || {};
      this.fireEventInRenderer('document', 'open', {
        path,
        configurationName,
        atLine,
      });
      this.pendingDocumentOpen = undefined;
    } else if (docToOpen?.whenEditorReady) this.pendingDocumentOpen = docToOpen;
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
      editorKey: editorKey || this.mainEditorKey,
    };
    this.editorView.webContents.send('set-project', message);
  }
}
