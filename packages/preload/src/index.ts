/**
 * @module preload
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  ConfigInitField,
  ConfigQueryOptions,
  ConfigurationSummary,
  CxDocument,
  BackendValueKey,
  DocRepository,
  CloneGitProjectOptions,
  ClonedGitProject,
  LocalGitProjectOptions,
  GitProjectStatus,
  GitRemoteBranch,
  GitMergeCheck,
  GitMergeStrategy,
  GitCommitOptions,
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
  ResourceFile,
  SaveResponse,
  SynctexInfo,
} from './common';

export interface Ipc {
  // send: (channel: string, data: any) => void;
  // invoke: (channel: string, ...args: any) => Promise<any>;
  listen: (
    channel: IpcMainToRendererChannel,
    listener: IpcRendererListener,
  ) => (() => void) | undefined;

  debugInfo: () => Promise<object>;

  getFolderContents: (context: string) => Promise<FolderContents>;

  createFolder: (path: string) => Promise<string>;

  openDocument: (context: string) => Promise<CxDocument>;

  saveDocument: (doc: string) => Promise<SaveResponse>;

  getBookmarks: (
    bookmarkType?: PundokBookmarkType,
  ) => Promise<PundokBookmark[]>;

  getValue: (key: BackendValueKey) => Promise<DocRepository[]>;

  availableConfigurations: (
    options?: ConfigQueryOptions,
  ) => Promise<ConfigurationSummary[]>;

  editorReady: (editorKey?: EditorKeyType) => Promise<void>;

  loadConfiguration: (
    name?: string,
  ) => Promise<PundokEditorConfigInit | undefined>;

  fileContents: (
    filename: string,
    options?: Partial<FindResourceOptions>,
  ) => Promise<string>;

  findResourceFiles: (
    filenameRegex: string,
    regexFlags?: string,
    options?: Partial<FindResourceOptions>,
  ) => Promise<ResourceFile[]>;

  newProject: (path: string, project: string) => Promise<void>;

  getProject: (
    options: GetProjectOptions,
  ) => Promise<PundokEditorProject | undefined>;

  getInclusionTree: (
    project: string,
    refresh?: boolean,
  ) => Promise<string | undefined>;

  transformJson: (doc: string, transform: string) => Promise<string>;

  pandocFeature: (
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions,
  ) => Promise<string[] | PandocFormatExtension[]>;

  setValue: (key: string, value?: any) => Promise<void>;

  query: (query: string) => Promise<QueryResult[]>;

  getSourceFile: (editorKey: EditorKeyType, info: SynctexInfo) => Promise<void>;

  showRenderedAgain: (hash: string, editorKey: EditorKeyType) => Promise<void>;

  renderAgain: (hash: string, editorKey: EditorKeyType) => Promise<void>;

  stopRendering: (converterName: string, path: string) => Promise<boolean>;
  stopTransformation: (editorKey: EditorKeyType) => Promise<boolean>;

  getRenderingJob: (hash: string) => Promise<string | undefined>;

  updateConfig: (
    where: ConfigInitField,
    obj: string,
    isDeletion: boolean,
    isProject: boolean,
    configNameOrProjectPath: string,
  ) => Promise<void>;

  listGitRepositories: () => Promise<DocRepository[]>;

  cloneGitProject: (
    options: CloneGitProjectOptions,
  ) => Promise<ClonedGitProject>;
  gitDefaultBranchName: () => Promise<string>;

  publishGitProject: (
    options: LocalGitProjectOptions,
  ) => Promise<ClonedGitProject>;

  connectGitProject: (
    options: LocalGitProjectOptions,
  ) => Promise<ClonedGitProject>;

  gitProjectStatus: (path: string) => Promise<GitProjectStatus>;
  gitProjectUpdates: (path: string) => Promise<GitRemoteBranch[]>;
  checkGitMerge: (path: string, remoteBranch: string) => Promise<GitMergeCheck>;
  mergeGitProject: (
    path: string,
    remoteBranch: string,
    strategy?: GitMergeStrategy,
  ) => Promise<void>;
  pushGitProject: (
    path: string,
    user?: string,
    password?: string,
  ) => Promise<void>;
  initGitProject: (path: string) => Promise<void>;
  stageGitProject: (path: string, paths: string[]) => Promise<void>;
  unstageGitProject: (path: string, paths: string[]) => Promise<void>;
  updateGitignore: (path: string, paths: string[]) => Promise<void>;
  commitGitProject: (options: GitCommitOptions) => Promise<void>;
  scanGitProjects: (
    url: string,
    user: string,
    password: string,
  ) => Promise<Array<{ name: string; description: string; url: string }>>;
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
  openDocument: (context: string) =>
    ipcRenderer.invoke('open-document', context),
  saveDocument: (doc: string) => ipcRenderer.invoke('save-document', doc),
  getBookmarks: (bookmarkType?: PundokBookmarkType) =>
    ipcRenderer.invoke('get-bookmarks', bookmarkType),
  getValue: (key: BackendValueKey) => ipcRenderer.invoke('get-value', key),
  availableConfigurations: (options?: ConfigQueryOptions) =>
    ipcRenderer.invoke('available-configurations', options),
  editorReady: (editorKey?: EditorKeyType) =>
    ipcRenderer.invoke('editor-ready', editorKey),
  loadConfiguration: (name?: string) =>
    ipcRenderer.invoke('load-configuration', name),
  fileContents: (filename: string, options?: Partial<FindResourceOptions>) =>
    ipcRenderer.invoke('file-contents', filename, options),
  findResourceFiles: (
    filenameRegex: string,
    regexFlags?: string,
    options?: Partial<FindResourceOptions>,
  ) =>
    ipcRenderer.invoke(
      'find-resource-files',
      filenameRegex,
      regexFlags,
      options,
    ),
  newProject: (path: string, project: string) =>
    ipcRenderer.invoke('new-project', path, project),
  getProject: (options: GetProjectOptions) =>
    ipcRenderer.invoke('get-project', options),
  getInclusionTree: (project: string, refresh?: boolean) =>
    ipcRenderer.invoke('get-inclusion-tree', project, refresh),
  transformJson: (doc: string, transform: string) =>
    ipcRenderer.invoke('transform-json', doc, transform),
  pandocFeature: (
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions,
  ) => ipcRenderer.invoke('pandoc-feature', featureName, options),
  setValue: (key: string, value?: any) =>
    ipcRenderer.invoke('set-value', key, value),
  query: (query: string) => ipcRenderer.invoke('query', query),
  getSourceFile: (editorKey: EditorKeyType, info: SynctexInfo) =>
    ipcRenderer.invoke('get-source-file', editorKey, info),
  showRenderedAgain: (hash: string, editorKey: EditorKeyType) =>
    ipcRenderer.invoke('show-rendered-again', hash, editorKey),
  renderAgain: (hash: string, editorKey: EditorKeyType) =>
    ipcRenderer.invoke('render-again', hash, editorKey),
  stopRendering: (converterName: string, path: string) =>
    ipcRenderer.invoke('stop-rendering', converterName, path),
  stopTransformation: (editorKey: EditorKeyType) =>
    ipcRenderer.invoke('stop-transformation', editorKey),
  getRenderingJob: (hash: string) =>
    ipcRenderer.invoke('get-rendering-job', hash),
  updateConfig: (
    where: ConfigInitField,
    obj: string,
    isDeletion: boolean,
    isProject: boolean,
    configNameOrProjectPath: string,
  ) =>
    ipcRenderer.invoke(
      'update-config',
      where,
      obj,
      isDeletion,
      isProject,
      configNameOrProjectPath,
    ),
  listGitRepositories: () => ipcRenderer.invoke('list-git-repositories'),
  cloneGitProject: (options: CloneGitProjectOptions) =>
    ipcRenderer.invoke('clone-git-project', options),
  gitDefaultBranchName: () => ipcRenderer.invoke('git-default-branch-name'),
  publishGitProject: (options: LocalGitProjectOptions) =>
    ipcRenderer.invoke('publish-git-project', options),
  connectGitProject: (options: LocalGitProjectOptions) =>
    ipcRenderer.invoke('connect-git-project', options),
  gitProjectStatus: (path: string) =>
    ipcRenderer.invoke('git-project-status', path),
  gitProjectUpdates: (path: string) =>
    ipcRenderer.invoke('git-project-updates', path),
  checkGitMerge: (path: string, remoteBranch: string) =>
    ipcRenderer.invoke('check-git-merge', path, remoteBranch),
  mergeGitProject: (
    path: string,
    remoteBranch: string,
    strategy?: GitMergeStrategy,
  ) => ipcRenderer.invoke('merge-git-project', path, remoteBranch, strategy),
  pushGitProject: (path: string, user?: string, password?: string) =>
    ipcRenderer.invoke('push-git-project', path, user, password),
  initGitProject: (path: string) =>
    ipcRenderer.invoke('init-git-project', path),
  stageGitProject: (path: string, paths: string[]) =>
    ipcRenderer.invoke('stage-git-project', path, paths),
  unstageGitProject: (path: string, paths: string[]) =>
    ipcRenderer.invoke('unstage-git-project', path, paths),
  updateGitignore: (path: string, paths: string[]) =>
    ipcRenderer.invoke('update-gitignore', path, paths),
  commitGitProject: (options: GitCommitOptions) =>
    ipcRenderer.invoke('commit-git-project', options),
  scanGitProjects: (url: string, user: string, password: string) =>
    ipcRenderer.invoke('scan-git-projects', url, user, password),
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
