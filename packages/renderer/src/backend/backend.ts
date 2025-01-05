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
  ReadDoc,
  SaveResponse,
  StoredDoc,
  DocumentCoords,
  PandocFilterTransform,
} from '../common';
import type Electron from 'electron';
import { LocalBackend } from './localbackend';
import { NetBackend } from './netbackend';
import { OpenDialogOptions } from 'electron';

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

export type WhyAskingForIdOrPath = 'edit' | 'inclusion' | 'image';

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
   * Retrieves a document from the backend.
   * @param context The environment of the document.
   */
  open(context: DocumentContext): Promise<ReadDoc>;

  /**
   * Stores a document in the backend.
   * @param doc The document to be stored.
   * @param project The (optional) project of the document.
   * @param editorKey The key of the editor that will be answered.
   */
  save(
    doc: StoredDoc,
    project?: PundokEditorProject,
    editorKey?: EditorKeyType,
  ): Promise<SaveResponse>;

  /**
   * Retrieves the project of a document from the backend.
   * @param context
   */
  getProject(context: Record<string, any>): Promise<PundokEditorProject>;

  /**
   * Retrieves a tree-structure of a document made of multiple documents.
   * @param project
   */
  getInclusionTree(
    project: PundokEditorProject,
  ): Promise<ProjectComponent | undefined>;

  /**
   * Retrieves the id or the path of a document from the backend.
   * @param why The aim of the request (open a document, include a document, ...)
   * @param options
   */
  askForDocumentIdOrPath(
    why: WhyAskingForIdOrPath,
    options?: DocumentContext & { openDialogOptions?: Partial<OpenDialogOptions> },
  ): Promise<DocumentCoords | undefined>;

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
   * Asks the backend to run the installed version of pandoc to retrieve its input formats.
   */
  pandocInputFormats(): Promise<string[]>;

  /**
   * Asks the backend to run the installed version of pandoc to retrieve its output formats.
   */
  pandocOutputFormats(): Promise<string[]>;

  /**
   * Asks the backend to open the viewer to show the result file.
   */
  // openViewer(
  //   docName: string,
  //   options?: Partial<FindResourceOptions>
  // ): Promise<void>;

  /**
   * Transform the document or the fragment passed as Pandoc JSON.
   * @param pandocJson the (Pandoc) JSON representation of a document or a fragment.
   * @param transform the transformation to apply.
   * @param options options to retrieve what is needed by Pandoc (e.g. to find filters).
   * @returns a (Pandoc) stringified-JSON representation of the transformed fragment or document
   */
  transformPandocJson(
    pandocJson: string | undefined,
    transform: PandocFilterTransform,
    options?: Partial<FindResourceOptions>,
  ): Promise<string>;
}

export function createBackend(config: BackendConfig): Backend {
  if (config.ipc) {
    return new LocalBackend(config);
  } else {
    return new NetBackend(config);
  }
}
