import { IpcHub } from "./ipcHub";
import { IpcMainInvokeEvent } from "electron";
import { stringify } from "../utils";
import {
  desktopRenderingJobStore,
  exportDocument,
  feedbackSink,
  getRenderingJobWithHash,
} from "../backend";
import { EditorKeyType, CxDocument, DocumentFormat } from "../common";
import { backendDirectories } from "../resourcesManager";

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
          await exportDocument(
            backendDirectories(),
            hub,
            feedbackSink(hub),
            desktopRenderingJobStore(),
            sdoc,
            true,
          )
        } catch (error) {
          const msg = stringify(error)
          console.log(msg)
          return Promise.reject(msg)
        }
      }
    }