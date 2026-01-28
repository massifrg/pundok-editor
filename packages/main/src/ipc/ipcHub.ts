import type { BaseWindow, WebContentsView } from 'electron';
import { ipcMain } from 'electron';
import {
  CommandToRenderer,
  EditorKeyType,
  IPC_CHANNELS,
  PundokEditorProject,
  ServerMessage,
  ServerMessageCommand,
  IpcMainToRendererChannel,
  ServerMessageSetProject,
} from '../common';
// import FileManager from '../fileManager';
import { askForDocumentHandler } from './askForDocumentHandler';
import { availableConfigurationsHandler, loadConfigurationHandler } from './configurationHandlers';
import { debugInfoHandler } from './debugInfoHandler';
import { editorReadyHandler } from './editorReadyHandler';
import { renderAgainHandler } from './renderAgainHandler';
import { getBookmarksHandler } from './getBookmarksHandler';
import { getExportJobHandler } from './getExportJobHandler';
import { getFolderContentsHandler } from './getFolderContentsHandler';
import { getInclusionTreeHandler } from './getInclusionTreeHandler';
import { getSourceFileHandler } from './getSourceFileHandler';
import { fileContentsHandler } from './fileContentsHandler';
import { getProjectHandler } from './getProjectHandler';
import { newProjectHandler } from './newProjectHandler';
import { openDocumentHandler } from './openDocumentHandler';
import { pandocInputFormatsHandler, pandocOutputFormatsHandler } from './pandocFormatsHandler';
import { queryHandler } from './queryHandler';
import { saveDocumentHandler } from './saveDocumentHandler';
import { setValueHandler } from './setValueHandler';
import { showAgainHandler } from './showAgainHandler';
import { transformJsonHandler } from './transformJsonHandler';
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

  handleIpcMainEvents() {
    ipcMain.handle('editor-ready', editorReadyHandler(this));
    ipcMain.handle('get-folder-contents', getFolderContentsHandler(this));
    ipcMain.handle('open-document', openDocumentHandler(this));
    ipcMain.handle('save-document', saveDocumentHandler(this));
    ipcMain.handle('debug-info', debugInfoHandler(this));
    ipcMain.handle('get-project', getProjectHandler(this));
    ipcMain.handle('get-inclusion-tree', getInclusionTreeHandler(this));
    ipcMain.handle('ask-for-document', askForDocumentHandler(this));
    ipcMain.handle('get-bookmarks', getBookmarksHandler(this));
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
    ipcMain.handle('show-rendered-again', showAgainHandler(this));
    ipcMain.handle('render-again', renderAgainHandler(this));
    ipcMain.handle('get-rendering-job', getExportJobHandler(this));
    ipcMain.handle('update-config', updateConfigHandler(this))
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
