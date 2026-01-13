import { IpcMainInvokeEvent } from "electron";
import { homedir } from "os";
import {
  dirname,
  joinPath,
  normalize,
  resolve,
  sep as separator
} from "path";
import { Dirent, existsSync, statSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { pathToFileURL } from 'url'
import { IpcHub } from "./ipcHub";
import { stringify } from "../utils";
import { Document, Folder, FolderContents, Place } from "../common";

type DriveListModule = {
  list: () => Promise<{ mountpoints: { path: string }[] }[]>
}
type DestinationParser = (bytes: Buffer) => Promise<any[]>
type JumpListModule = {
  automatic_destination_parser: DestinationParser,
  custom_destination_parser: DestinationParser,
}
let drivelist: DriveListModule | undefined = undefined
let jumplist: JumpListModule | undefined = undefined

// if (process.platform === 'win32') {
//   drivelist = require('drivelist')
//   // import { automatic_destination_parser, custom_destination_parser } from "@recent-cli/jumplist-parser-lite"
//   jumplist = require('@recent-cli/jumplist-parser-lite')
// }

async function loadPlatformModules() {
  if (process.platform === 'win32') {
    drivelist = await import('drivelist');
    jumplist = await import('@recent-cli/jumplist-parser-lite');
  }
}

const USER_PLACES = '.local/share/user-places.xbel'
const GTK_BOOKMARKS = '.config/gtk-3.0/bookmarks'

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
      else if (c.isFile())
        documents.push({ name: c.name })
      else if (c.isSymbolicLink()) {
        if (isSymlinkToDirectory(folder, c))
          folders.push({ name: c.name })
        else
          documents.push({ name: c.name })
      }
      console.log(c.name)
    })
    const places = await getUserPlaces()
    return { base, folders, documents, places, separator, platform: process.platform } as FolderContents
  } catch (err) {
    console.log(err)
    return Promise.reject(stringify(err))
  }
}

function isRoot(dir: string) {
  const normalized = resolve(dir)
  return dirname(normalized) === normalized
}

function isSymlinkToDirectory(dirPath: string, dirent: Dirent) {
  if (!dirent.isSymbolicLink()) return false;
  const fullPath = resolve(dirPath, dirent.name);
  try {
    const stats = statSync(fullPath);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
}

async function getUserPlacesUnix(): Promise<Place[]> {
  const places: Place[] = []
  const user_places_dir = resolve(homedir(), USER_PLACES)
  if (existsSync(user_places_dir)) {
    const user_places = (await readFile(user_places_dir)).toString()
    user_places.replaceAll(/<bookmark href="(file:\/\/.*?)".*?\n\s*<title>(.*?)<\/title>/gm, (_, href, title) => {
      places.push({ name: title, href })
      return ''
    })
  }
  const gtk_bookmarks_dir = resolve(homedir(), GTK_BOOKMARKS)
  if (existsSync(gtk_bookmarks_dir)) {
    const lines = (await readFile(gtk_bookmarks_dir)).toString().split(/\r?\n/)
    lines.forEach(line => {
      if (line.startsWith('file://')) {
        const chunks = line.split(separator)
        if (chunks.length > 0)
          places.push({ name: chunks[chunks.length - 1], href: line })
      }
    })
  }
  console.log(JSON.stringify(places, null, 2))
  return places
}

async function getUserPlacesWindows(): Promise<Place[]> {
  const places: Place[] = []
  // Get Drives
  if (!drivelist || !jumplist)
    await loadPlatformModules()
  if (drivelist) {
    const drives = await drivelist.list();
    drives.forEach(d => {
      d.mountpoints.forEach(m => {
        const href = pathToFileURL(m.path)
        places.push({
          name: href.pathname,
          href: href.toString()
        })
      });
    })
  }
  // Get Known Folders
  const user = process.env.USERPROFILE;
  if (user) {
    ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Videos'].forEach(p =>
      places.push({
        name: p,
        href: pathToFileURL(joinPath(user, p)).toString()
      })
    );
    ['AppData', 'LocalAppData'].forEach(p => {
      const v = process.env[p.toUpperCase()]
      if (v) {
        places.push({
          name: p,
          href: pathToFileURL(joinPath(user, v)).toString()
        })
      }
    });
  }

  // Get Quick Access Bookmarks
  if (jumplist) {
    // const quickAccessDir = joinPath(
    //   process.env.APPDATA || '',
    //   "Microsoft",
    //   "Windows",
    //   "Recent",
    //   "AutomaticDestinations"
    // );
    // if (existsSync(quickAccessDir)) {
    //   // NOTE: These are binary jump list files. You’ll need a parser like `win-jump-list`
    //   // npm install win-jump-list
    //   const files = await readdir(quickAccessDir);
    //   files.map(f => joinPath(quickAccessDir, f));
    // }
  }

  return places
}

async function getUserPlaces(): Promise<Place[]> {
  if (process.platform === 'win32')
    return getUserPlacesWindows()
  return getUserPlacesUnix()
}