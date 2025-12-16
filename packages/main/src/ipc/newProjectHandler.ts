import { IpcMainInvokeEvent } from "electron"
import { resolve } from "path"
import { writeFile } from "fs/promises"
import { IpcHub } from "./ipcHub"
import { isReadableDir } from "../resourcesManager"
import { DEFAULT_PROJECT_FILENAME, serializeProject } from "../common"

export const newProjectHandler = (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent, dir: string, jsonProject: string) => {
    try {
      if (isReadableDir(dir)) {
        const filename = resolve(dir, DEFAULT_PROJECT_FILENAME)
        const project = JSON.parse(jsonProject)
        await writeFile(filename, serializeProject(project))
      }
    } catch (err) {
      return Promise.reject(err)
    }
  }