import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { FindResourceOptions, resourceTypesFromExtension } from '../common';
import { findResourceFile } from '../resourcesManager';
import {
  isAbsolute,
  basename as pathBasename,
  extname as pathExtension,
} from 'path';
import { readFile } from 'fs/promises';

export const fileContentsHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    filename: string,
    context: Partial<FindResourceOptions>,
  ): Promise<string> => {
    let kind = context?.kind;
    if (!kind) {
      const ext = pathExtension(filename);
      const types = resourceTypesFromExtension(ext);
      kind = types[0] || kind;
    }
    return getFileContents(filename, { ...context, kind });
  };

async function getFileContents(
  filename: string,
  context?: Partial<FindResourceOptions>,
): Promise<string> {
  try {
    const filenamepath = isAbsolute(filename)
      ? filename
      : findResourceFile(pathBasename(filename), context || {});
    if (filenamepath) {
      console.log(`found ${filename} at ${filenamepath}`);
      const buffer = await readFile(filenamepath);
      return context?.base64 ? buffer.toString('base64') : buffer.toString();
    } else {
      return Promise.reject(`File not found: ${filename}`);
    }
  } catch (err: any) {
    return Promise.reject(err.toString);
  }
}
