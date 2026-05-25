import { IpcMainInvokeEvent } from "electron";
import { IpcHub } from "./ipcHub";
import { getRenderingJobWithHash } from "./documentHash";
import { EditorKeyType, ServerMessageForViewer } from "../common";
import { isString } from "lodash-es";

export const showAgainHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      documentHash: string,
      editorKey: EditorKeyType,
    ): Promise<void> => {
      const job = getRenderingJobWithHash(documentHash)
      if (job) {
        const { path, project } = job
        const projectAsJson = isString(project) ? project : JSON.stringify(project)
        hub.send('show-in-viewer', {
          type: 'viewer',
          editorKey,
          setup: {
            name: path,
            projectAsJson,
            documentHash
          },
        } as ServerMessageForViewer)
      } else {
        return Promise.reject('Export job no longer available')
      }
    }