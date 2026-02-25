import { IpcMainInvokeEvent } from "electron";
import { IpcHub } from "./ipcHub";
import { getRenderingJobWithHash } from "./documentHash";
import { EditorKeyType, ServerMessageForViewer } from "../common";

export const showAgainHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      documentHash: string,
      editorKey: EditorKeyType,
    ): Promise<void> => {
      const job = getRenderingJobWithHash(documentHash)
      if (job) {
        const { path, projectAsJsonString } = job
        hub.send('show-in-viewer', {
          type: 'viewer',
          editorKey,
          setup: {
            name: path,
            projectAsJson: projectAsJsonString,
            documentHash
          },
        } as ServerMessageForViewer)
      } else {
        return Promise.reject('Export job no longer available')
      }
    }