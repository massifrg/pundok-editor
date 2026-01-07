import { IpcMainInvokeEvent } from "electron";
import { isAbsolute, normalize, parse, resolve, sep as separator } from "path";
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
    if (!(isAbsolute(folder) && parse(folder).root === normalize(folder)))
      folders.push({ name: '..' })
    contents.forEach(c => {
      if (c.isDirectory())
        folders.push({ name: c.name })
      else if (c.isFile() || c.isSymbolicLink())
        documents.push({ name: c.name })
    })
    return { folders, documents, separator } as FolderContents
  } catch (err) {
    console.log(err)
    return Promise.reject(stringify(err))
  }
}