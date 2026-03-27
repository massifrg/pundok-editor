import { PundokEditorProject } from './config';
import { DocumentFormat } from './documentFormat';
import { EditorKeyType } from "./editorKey";

/**
 * An interface for the environment of a document.
 */
export interface DocumentContext {
  /** The editor that is the recipient of the file content */
  editorKey?: EditorKeyType;
  /** The document id. */
  id?: string;
  /** The path or URL of the file. */
  path?: string;
  /** The format of the document */
  documentFormat?: DocumentFormat;
  /** The name of the configuration associated with the document. */
  configurationName?: string;
  /** The project associated with the document */
  project?: PundokEditorProject;
  /** An array of paths for pandoc's --resource-path option */
  resourcePath?: string[];
}

/**
 * A document with a context.
 */
export interface CxDocument extends DocumentContext {
  /** The document JSON.stringified contents. */
  content: string;
}

export function documentNameToId(name?: string): string | undefined {
  return name && name.replace(/([.][0-9a-z_-]{1,5})*[.].*?$/i, '') || undefined
}