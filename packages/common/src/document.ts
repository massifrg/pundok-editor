import { PundokEditorProject } from './config';
import { DocumentFormat } from './documentFormat';
import { EditorKeyType } from "./editorKey";

interface CommonDocumentCoords {
  id?: string;
  src?: string;
  path?: string;
  // format?: string;
  // formats?: string[];
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
  /** The format of the document */
  documentFormat?: DocumentFormat | string;
  /** The name of the configuration associated with the document. */
  configurationName?: string;
  /** The project associated with the document */
  project?: PundokEditorProject | string;
  /** An array of paths for pandoc's --resource-path option */
  resourcePath?: string[];
}

/**
 * An interface for the environment of a document.
 */
export interface DocumentContext extends CompatibleDocumentContext {
  /** The format of the document */
  documentFormat?: DocumentFormat;
  /** The project associated with the document */
  project?: PundokEditorProject;
}

/**
 * A document with a context.
 */
export interface CxDocument extends DocumentContext {
  /** The document JSON.stringified contents. */
  content: string;
}