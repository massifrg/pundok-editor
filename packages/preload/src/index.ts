/**
 * @module preload
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  ConfigInitField,
  ConfigQueryOptions,
  ConfigurationSummary,
  CxDocument,
  EditorKeyType,
  FindResourceOptions,
  FolderContents,
  GetProjectOptions,
  IpcChannel,
  IpcMainToRendererChannel,
  IpcRendererListener,
  isMainToRendererChannel,
  PandocFeatureName,
  PandocFeatureOptions,
  PandocFormatExtension,
  PundokBookmark,
  PundokBookmarkType,
  PundokEditorConfigInit,
  PundokEditorProject,
  QueryResult,
  SaveResponse,
  SynctexInfo
} from './common';

export interface Ipc {
  // send: (channel: string, data: any) => void;
  // invoke: (channel: string, ...args: any) => Promise<any>;
  listen: (
    channel: IpcMainToRendererChannel,
    listener: IpcRendererListener,
  ) => (() => void) | undefined;

  debugInfo: () => Promise<object>

  getFolderContents: (context: string) => Promise<FolderContents>

  createFolder: (path: string) => Promise<string>

  openDocument: (context: string) => Promise<CxDocument>

  saveDocument: (doc: string) => Promise<SaveResponse>

  getBookmarks: (bookmarkType?: PundokBookmarkType) => Promise<PundokBookmark[]>

  availableConfigurations: (options?: ConfigQueryOptions) => Promise<ConfigurationSummary[]>

  editorReady: (editorKey?: EditorKeyType) => Promise<void>

  loadConfiguration: (name?: string) => Promise<PundokEditorConfigInit | undefined>

  fileContents: (filename: string, options?: Partial<FindResourceOptions>) => Promise<string>

  newProject: (path: string, project: string) => Promise<void>

  getProject: (options: GetProjectOptions) => Promise<PundokEditorProject | undefined>

  getInclusionTree: (project: string) => Promise<string | undefined>

  transformJson: (doc: string, transform: string) => Promise<string>

  pandocFeature: (
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions
  ) => Promise<string[] | PandocFormatExtension[]>

  setValue: (key: string, value?: any) => Promise<void>

  query: (query: string) => Promise<QueryResult[]>

  getSourceFile: (editorKey: EditorKeyType, info: SynctexInfo) => Promise<void>

  showRenderedAgain: (hash: string, editorKey: EditorKeyType) => Promise<void>

  renderAgain: (hash: string, editorKey: EditorKeyType) => Promise<void>

  getRenderingJob: (hash: string) => Promise<string | undefined>

  updateConfig: (
    where: ConfigInitField,
    obj: string,
    isDeletion: boolean,
    isProject: boolean,
    configNameOrProjectPath: string
  ) => Promise<void>

}

contextBridge.exposeInMainWorld('ipc', {
  send: (channel: IpcChannel, data: any) => {
    if (isMainToRendererChannel(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.log(`channel ${channel} is not valid`);
    }
  },
  listen: (channel: IpcChannel, listener: IpcRendererListener) => {
    if (isMainToRendererChannel(channel)) {
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    } else {
      console.log(`channel ${channel} is not valid`);
    }
  },
  debugInfo: () => ipcRenderer.invoke('debug-info'),
  getFolderContents: (context: string) =>
    ipcRenderer.invoke('get-folder-contents', context),
  createFolder: (path: string) => ipcRenderer.invoke('create-folder', path),
  openDocument: (context: string) => ipcRenderer.invoke('open-document', context),
  saveDocument: (doc: string) => ipcRenderer.invoke('save-document', doc),
  getBookmarks: (bookmarkType?: PundokBookmarkType) =>
    ipcRenderer.invoke('get-bookmarks', bookmarkType),
  availableConfigurations: (options?: ConfigQueryOptions) =>
    ipcRenderer.invoke('available-configurations', options),
  editorReady: (editorKey?: EditorKeyType) => ipcRenderer.invoke('editor-ready', editorKey),
  loadConfiguration: (name?: string) => ipcRenderer.invoke('load-configuration', name),
  fileContents: (filename: string, options?: Partial<FindResourceOptions>) =>
    ipcRenderer.invoke('file-contents', filename, options),
  newProject: (path: string, project: string) =>
    ipcRenderer.invoke('new-project', path, project),
  getProject: (options: GetProjectOptions) => ipcRenderer.invoke('get-project', options),
  getInclusionTree: (project: string) => ipcRenderer.invoke('get-inclusion-tree', project),
  transformJson: (doc: string, transform: string) =>
    ipcRenderer.invoke('transform-json', doc, transform),
  pandocFeature: (featureName: PandocFeatureName, options?: PandocFeatureOptions) =>
    ipcRenderer.invoke('pandoc-feature', featureName, options),
  setValue: (key: string, value?: any) => ipcRenderer.invoke('set-value', key, value),
  query: (query: string) => ipcRenderer.invoke('query', query),
  getSourceFile: (editorKey: EditorKeyType, info: SynctexInfo) =>
    ipcRenderer.invoke('get-source-file', editorKey, info),
  showRenderedAgain: (hash: string, editorKey: EditorKeyType) =>
    ipcRenderer.invoke('show-rendered-again', hash, editorKey),
  renderAgain: (hash: string, editorKey: EditorKeyType) =>
    ipcRenderer.invoke('render-again', hash, editorKey),
  getRenderingJob: (hash: string) => ipcRenderer.invoke('get-rendering-job', hash),
  updateConfig: (where: ConfigInitField, obj: string, isDeletion: boolean, isProject: boolean, configNameOrProjectPath: string) =>
    ipcRenderer.invoke('update-config', where, obj, isDeletion, isProject, configNameOrProjectPath),
} as Ipc);

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string | undefined) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text || '';
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
