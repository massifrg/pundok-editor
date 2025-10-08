import { runExternalProgram } from "../runExternal";
import { IpcHub } from "./ipcHub";
import { IpcMainInvokeEvent } from "electron";
import { stringify } from "../utils";
import { getDocumentHash } from "./documentHash";
import { EditorKeyType, PundokEditorProject, StoredDoc } from "src/common";

export const exportAgainHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      documentHash: string,
      editorKey: EditorKeyType,
    ): Promise<void> => {
      const job = getDocumentHash(documentHash)
      if (job) {
        const { path, converter, configurationName, projectAsJsonString } = job
        const project = projectAsJsonString
          ? JSON.parse(projectAsJsonString) as PundokEditorProject
          : undefined
        const sdoc: StoredDoc = {
          path,
          converter,
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