import { IpcHub } from "./ipcHub";
import { IpcMainInvokeEvent } from "electron";
import { stringify } from "../utils";
import { getExportJobWithHash } from "./documentHash";
import { EditorKeyType, PundokEditorProject, CxDocument, DocumentFormat } from "../common";
import { exportDocument } from "./saveDocumentHandler";

export const renderAgainHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      documentHash: string,
      editorKey: EditorKeyType,
    ): Promise<void> => {
      const job = getExportJobWithHash(documentHash)
      if (job) {
        const { path, converter, configurationName, projectAsJsonString } = job
        const project = projectAsJsonString
          ? JSON.parse(projectAsJsonString) as PundokEditorProject
          : undefined
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