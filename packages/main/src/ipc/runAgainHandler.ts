import { runExternalProgram } from "src/runExternal";
import { IpcHub } from "./ipcHub";
import { IpcMainInvokeEvent } from "electron";
import { stringify } from "src/utils";

export const runAgainHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      commandLine: string,
      cwd: string,
    ): Promise<void> => {
      const chunks = commandLine.split(/ /)
      const path = chunks[0]
      const args = chunks.slice(1)
      try {
        const result = runExternalProgram(path, args, { cwd })
      } catch (error) {
        const msg = stringify(error)
        console.log(msg)
        return Promise.reject(msg)
      }
    }