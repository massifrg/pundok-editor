import { InputConverter, OutputConverter, PundokEditorProject } from './config';
import { EditorKeyType } from './editorKey';

export * from './bookmarks';
export * from './colors';
export * from './config';
export * from './editorKey';
export * from './ipc';
export * from './pandocFormat';
export * from './pandocOptions';
export * from './query';
export * from './readers';
export * from './resources';
export * from './shortcuts';
export * from './version';
export * from './viewer';

/**
 * The response after trying to save a document.
 */
export interface SaveResponse {
  /** An error message, in case of failure. */
  error?: any;
  /** A feddback message about the saving operation. */
  message: string;
  /** The saved document. */
  doc: StoredDoc;
  /** The file where the output has been saved */
  resultFile?: string;
}

interface CommonDocumentCoords {
  id?: string;
  src?: string;
  path?: string;
  format?: string;
  formats?: string[];
}
interface LocalDocumentCoords extends CommonDocumentCoords {
  path: string;
}
interface DbDocumentCoords extends CommonDocumentCoords {
  id: string;
}
export type DocumentCoords = LocalDocumentCoords | DbDocumentCoords;

/**
 * An interface for the environment of a document.
 */
export interface CompatibleDocumentContext {
  /** The editor that is the recipient of the file content */
  editorKey?: EditorKeyType;
  /** The document id. */
  id?: string;
  /** The path of the file, when the document is read from a file. */
  path?: string;
  /** The name of the configuration associated with the document. */
  configurationName?: string;
  /** The converter to use to read the document */
  inputConverter?: InputConverter | string;
  /** The project associated with the document */
  project?: PundokEditorProject | string;
  /** An array of paths for pandoc's --resource-path option */
  resourcePath?: string[];
}

/**
 * An interface for the environment of a document.
 */
export interface DocumentContext extends CompatibleDocumentContext {
  /** The converter to use to read the document */
  inputConverter?: InputConverter;
  /** The project associated with the document */
  project?: PundokEditorProject;
}

/**
 * A document that has been read (from the filesystem or from any other storage).
 */
export interface ReadDoc extends DocumentContext {
  /** The file contents. */
  content: string;
}

/**
 * A document that has been saved or exported to any kind of storage.
 */
export interface StoredDoc extends ReadDoc {
  /** The converter used to export it. */
  converter?: OutputConverter;
  /** Options about a possible preview of the document. */
  // preview?: Partial<PreviewOptions>;
  /** Set the path of the exported file, when the document is exported in a different format */
  exportedAsPath?: string;
}

/**
 * Options about previewing a document.
 */
export interface PreviewOptions {
  /** Open the preview inside pandoc-editor. */
  inPundokEditor: boolean;
}

/**
 * The result of the execution of an external program.
 */
export interface ExternalProgramResult {
  /** The command line used to call the external program. */
  commandLine: string;
  /** The execution exit code. */
  exitCode: number;
  /** The output from `stdout`. */
  output: string;
  /** The output from `stderr`. */
  error: string;
}

/**
 * Kinds of feedback messages, from the backend to the frontend.
 */
export type FeedbackMessageType =
  | 'command-line'
  | 'error'
  | 'progress'
  | 'success';

/**
 * A feedback message from the backend to the frontend.
 */
export interface FeedbackMessage {
  /** The kind of feedback message. */
  type: FeedbackMessageType;
  /** The text message. */
  message: string;
  /** The source of the message (can be 'out', 'err', etc.) */
  source?: string;
  /** The level of verbosity needed to show this message. */
  level?: number;
}
