import { InputConverter, OutputConverter, PundokEditorProject } from './config';
import { EditorKeyType } from "./editorKey";

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
  /** The original format of the file. */
  format?: string;
}

/**
 * A document that has been saved or exported to any kind of storage.
 */
export interface StoredDoc extends ReadDoc {
  /** The converter used to export it. */
  outputConverter?: OutputConverter;
}

