import { IpcHub } from "./ipcHub";
import { IpcMainInvokeEvent } from "electron";
import { stringify } from "../utils";
import { getExportJobWithHash } from "./documentHash";
import { EditorKeyType, PundokEditorProject, Document, DocumentFormat } from "../common";

export const exportAgainHandler =
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
        const sdoc: Document = {
          path,
          documentFormat,
          configurationName,
          content: ''
        }
        try {
          hub.exportDocument(sdoc, project, editorKey)
        } catch (error) {
          const msg = stringify(error)
          console.log(msg)
          return Promise.reject(msg)
        }
      }
    }