import { IpcHub } from "./ipcHub";
import { IpcMainInvokeEvent } from "electron";
import { stringify } from "../utils";
import { getRenderingJobWithHash } from "./documentHash";
import { EditorKeyType, CxDocument, DocumentFormat } from "../common";
import { exportDocument } from "./saveDocumentHandler";

export const renderAgainHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      documentHash: string,
      editorKey: EditorKeyType,
    ): Promise<void> => {
      const job = getRenderingJobWithHash(documentHash)
      if (job) {
        const { path, converter, configurationName, project } = job
        const documentFormat: DocumentFormat = {
          ftype: 'output-converter',
          ...converter
        }
        const sdoc: CxDocument = {
          path,
          documentFormat,
          configurationName,
          content: '',
          project,
          editorKey,
        }
        try {
          exportDocument(hub, sdoc)
        } catch (error) {
          const msg = stringify(error)
          console.log(msg)
          return Promise.reject(msg)
        }
      }
    }