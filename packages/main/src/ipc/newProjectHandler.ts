import { IpcMainInvokeEvent } from "electron"
import { resolve } from "path"
import { IpcHub } from "./ipcHub"
import { isReadableDir } from "../resourcesManager"
import { DEFAULT_PROJECT_FILENAME, serializeProject } from "../common"
import { localizePath, writeFile } from "../filesystem"

export const newProjectHandler = (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent, dir: string, jsonProject: string) => {
    try {
      const path = localizePath(dir)
      if (isReadableDir(path)) {
        const filename = resolve(path, DEFAULT_PROJECT_FILENAME)
        const project = JSON.parse(jsonProject)
        await writeFile(filename, serializeProject(project))
      }
    } catch (err) {
      return Promise.reject(err)
    }
  }