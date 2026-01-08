import { IpcMainInvokeEvent } from "electron";
import {
  dirname,
  normalize,
  resolve,
  sep as separator
} from "path";
import { readdir } from "fs/promises";
import { IpcHub } from "./ipcHub";
import { stringify } from "../utils";
import { Document, Folder, FolderContents } from "../common";

export const getFolderContentsHandler = (hub: IpcHub) => async (
  e: IpcMainInvokeEvent,
  options: {
    path: string,
  },
): Promise<FolderContents> => {
  try {
    const folder = resolve(normalize(options.path))
    const contents = await readdir(folder, { withFileTypes: true })
    const base = normalize(folder).split(separator)
    const folders: Folder[] = []
    const documents: Document[] = []
    if (!isRoot(folder))
      folders.push({ name: '..' })
    contents.forEach(c => {
      if (c.isDirectory())
        folders.push({ name: c.name })
      else if (c.isFile() || c.isSymbolicLink())
        documents.push({ name: c.name })
    })
    // maybe we could add bookmarks found in Linux at:
    // ~/.local/share/user-places.xbel
    // ~/.config/gtk-3.0/bookmarks
    // or drives, known folders and quick access bookmarks in Windows
    return { base, folders, documents, separator } as FolderContents
  } catch (err) {
    console.log(err)
    return Promise.reject(stringify(err))
  }
}

function isRoot(dir: string) {
  const normalized = resolve(dir)
  return dirname(normalized) === normalized
}
