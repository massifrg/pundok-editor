import { IpcMainInvokeEvent } from "electron";
import { IpcHub } from "./ipcHub";
import { stringify } from "../utils";
import { PundokBookmark, PundokBookmarkType } from "../common";
import { getBookmarks } from "../bookmarks";

export const getBookmarksHandler = (hub: IpcHub) => async (
  e: IpcMainInvokeEvent,
  bookmarkType?: PundokBookmarkType,
): Promise<PundokBookmark[]> => {
  try {
    return getBookmarks(bookmarkType)
  } catch (err) {
    console.log(err)
    return Promise.reject(stringify(err))
  }
}