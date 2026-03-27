import type {
  ConfigurationSummary,
  EditorKeyType,
  FindResourceOptions,
  DocumentContext,
  PundokEditorConfig,
  PundokEditorProject,
  ProjectComponent,
  Query,
  QueryResult,
  SaveResponse,
  CxDocument,
  PandocFilterTransform,
  SynctexInfo,
  RenderingJob,
  ConfigInitField,
  GetProjectOptions,
  FolderContents,
  PundokBookmarkType,
  PundokBookmark,
  PandocFeatureName,
  PandocFeatureOptions,
} from '../common';
import type Electron from 'electron';
import { LocalBackend } from './localbackend';
import { NetBackend } from './netbackend';

export type IpcRendererListener = (
  e: Electron.IpcRendererEvent,
  ...args: any[]
) => void;

export interface Ipc {
  send: (channel: string, data: any) => void;
  on: (
    channel: string,
    listener: IpcRendererListener,
  ) => (() => void) | undefined;
  invoke: (channel: string, ...args: any) => Promise<any>;
}

export interface BackendConfig {
  ipc?: Ipc;
}

export type WhyAskingForIdOrPath =
  | 'edit'      // document to open and edit
  | 'inclusion' // inclusion of a (sub-)document
  | 'image'     // image file path
  | 'project'   // directory for a new project

/**
 * An interface to connect to the backend, to get the documents' data.
 *
 * It's a {@link LocalBackend} when the editor is embedded inside Electron
 * in a standalone app.
 *
 * It's a {@link NetBackend} when the editor lives in a browser
 * and communicates with a server.
 */
export interface Backend {
  /**
   * Returns `true` when the editor is logged in
   * as a username with a password.
   */
  loggedin(): Promise<boolean>;

  /**
   * Tries to log in with the credentials passed in the arguments.
   * @param user
   * @param password
   * @returns true if the login is successful.
   */
  login(user: string, password: string): Promise<boolean>;

  /**
   * Logs the user out.
   * @returns true if successful.
   */
  logout(): Promise<boolean>;

  /**
   * Retrieve some debugging info. For development only.
   */
  debugInfo(): Promise<object>;

  /**
   * Aknowledges the backend that the editor with a particular key is up and ready.
   * @param editorKey The editor key of editor.
   */
  editorReady(editorKey?: EditorKeyType): Promise<void>;

  /** 
   * Get the contents of a folder (a collection of documents and/or sub-folders).
   * @param path The folders path (an array of the names of the path's folders).
   */
  getFolderContents(context: Partial<DocumentContext>): Promise<FolderContents>;

  /**
   * Get the bookmarks (projects and documents).
   * @param bookmarkType 
   */
  getBookmarks(bookmarkType?: PundokBookmarkType): Promise<PundokBookmark[]>;

  /**
   * Retrieves a document from the backend.
   * @param context The environment of the document.
   */
  open(context: DocumentContext): Promise<CxDocument>;

  /**
   * Stores a document in the backend.
   * @param doc The document to be stored.
   */
  save(doc: CxDocument): Promise<SaveResponse>;

  /**
   * Retrieves the project of a document from the backend.
   * @param context
   */
  getProject(options: GetProjectOptions): Promise<PundokEditorProject | undefined>;

  /**
   * Create a new project in a directory.
   * @param path
   * @param project 
   */
  createProject(path: string, project: Partial<PundokEditorProject>): Promise<void>;

  /**
   * Retrieves a tree-structure of a document made of multiple documents.
   * @param project
   */
  getInclusionTree(
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined>;

  /**
   * Create a folder for documents.
   * @param path A path or URL of the folder to be created.
   */
  createFolder(path: string): Promise<string>;

  /**
   * Retrieves all the available configurations for the editor.
   */
  availableConfigurations(): Promise<ConfigurationSummary[]>;

  /**
   * Retrieves the configuration with a particular name.
   * @param name
   */
  configuration(name?: string): Promise<PundokEditorConfig>;

  /**
   * Retrieves the contents of a file on the backend (e.g. a CSS stylesheet).
   * @param filename The filename to be retrieved.
   * @param options Options that are helpful to retrieve the file.
   */
  getFileContents(
    filename: string,
    options?: Partial<FindResourceOptions>,
  ): Promise<string>;

  /**
   * Query the backend for accessory data, e.g. an index database.
   * @param query
   */
  queryDatabase(query: Query): Promise<QueryResult[]>;

  /**
   * Sets the value of a variable on the backend.
   * This is used especially for the local backend, e.g. to set the window title.
   */
  setValue(key: string, value?: any): Promise<void>;

  /**
   * Asks the backend to run the installed version of pandoc to retrieve its features
   * (input and output formats, extensions of a format).
   */
  pandocFeature(
    featureName: PandocFeatureName,
    options?: PandocFeatureOptions
  ): Promise<any[]>;

  /**
   * Asks the backend to open the viewer to show the result file.
   */
  // openViewer(
  //   docName: string,
  //   options?: Partial<FindResourceOptions>
  // ): Promise<void>;

  /**
   * Transform the document or the fragment passed as Pandoc JSON.
   * @param doc a document or a fragment with a context.
   * @param transform the transformation to apply.
   * @returns a (Pandoc) stringified-JSON representation of the transformed fragment or document
   */
  transformPandocJson(
    doc: Partial<CxDocument>,
    transform: PandocFilterTransform
  ): Promise<string>;

  gotoSource(
    editorKey: EditorKeyType,
    info: SynctexInfo,
  ): Promise<void>

  renderAgain(hash: string, editorKey: EditorKeyType): Promise<void>;

  getRenderingJob(hash: string): Promise<RenderingJob | undefined>;

  showAgain(hash: string, editorKey: EditorKeyType): Promise<void>

  /**
   * Update a configuration or project JSON file adding/updating an object
   * like `CustomStyle`, `Automation`, etc.
   * @param where The configuration's key where the object must go ("automations", "customStyles", etc.).
   * @param obj The added/updated object.
   * @param isProject When `false` the next argument is the configuration name, when `true` it's the project path.
   * @param configNameOrProjectPath The configuration name or the project path when `isProject` is `true`.
   */
  storeInConfiguration(
    where: ConfigInitField,
    obj: object,
    isDeletion: boolean,
    isProject: boolean,
    configNameOrProjectPath: string
  ): Promise<void>;
}

export function createBackend(config: BackendConfig): Backend {
  if (config.ipc) {
    return new LocalBackend(config);
  } else {
    return new NetBackend(config);
  }
}
