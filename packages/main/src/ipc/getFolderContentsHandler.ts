import { IpcMainInvokeEvent } from "electron";
import { resolve } from "path";
import { readdir } from "fs/promises";
import { IpcHub } from "./ipcHub";
import { stringify } from "../utils";
import { Document, Folder, FolderContents } from "../common";

export const getFolderContentsHandler = (hub: IpcHub) => async (
  e: IpcMainInvokeEvent,
  options: {
    path: string | string[],
  },
): Promise<FolderContents> => {
  try {
    const { path: folderPath } = options
    const folder = folderPath && Array.isArray(folderPath) ? resolve(...folderPath) : resolve()
    const contents = await readdir(folder, { withFileTypes: true })
    console.log(JSON.stringify(contents))
    const folders: Folder[] = []
    const documents: Document[] = []
    contents.forEach(c => {
      if (c.isDirectory())
        folders.push({ name: c.name })
      else if (c.isFile() || c.isSymbolicLink())
        documents.push({ name: c.name })
    })
    return { folders, documents } as FolderContents
  } catch (err) {
    console.log(err)
    return Promise.reject(stringify(err))
  }
}