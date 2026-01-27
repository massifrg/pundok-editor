import { CxDocument } from "./document";

/**
 * The response after trying to save a document.
 */
export interface SaveResponse {
  /** An error message, in case of failure. */
  error?: any;
  /** A feedback message about the saving operation. */
  message: string;
  /** The saved document. */
  doc: CxDocument;
  /** The file where the output has been saved */
  resultFile?: string;
  /** The command line used to save the document */
  commandLine?: string;
  /** The directory where the command line has been run */
  cwd?: string;
  /** A hash that lets you retrieve what's needed to export a document again */
  documentHash?: string;
}
