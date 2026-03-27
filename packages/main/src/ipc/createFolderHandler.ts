import { IpcMainInvokeEvent } from "electron";
import { IpcHub } from "./ipcHub";
import { mkdirSync } from "fs";
import { stringify } from "../utils";

/**
 * 
 * @param hub 
 * @returns 
 */
export const createFolderHandler = (hub: IpcHub) => async (
  e: IpcMainInvokeEvent,
  path: string,
): Promise<string> => {
  try {
    mkdirSync(path)
    return path
  } catch (err) {
    console.log(err)
    return Promise.reject(stringify(err) + `\nwhile trying to create the "${path}" folder`)
  }
}