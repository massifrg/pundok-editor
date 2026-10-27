import { IpcHub } from "./ipcHub";
import { IpcMainInvokeEvent } from "electron";
import { stringify } from "../utils";
import {
  desktopRenderingJobStore,
  feedbackSink,
  renderAgain,
} from "../backend";
import { EditorKeyType, RenderingBookmark } from "../common";
import { backendDirectories } from "../resourcesManager";

export const renderAgainHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      bookmark: RenderingBookmark,
      editorKey: EditorKeyType,
    ): Promise<void> => {
      try {
        await renderAgain(
          backendDirectories(),
          hub,
          feedbackSink(hub),
          desktopRenderingJobStore(),
          bookmark,
          editorKey,
        )
      } catch (error) {
        const msg = stringify(error)
        console.log(msg)
        return Promise.reject(msg)
      }
    }