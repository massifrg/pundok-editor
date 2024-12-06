import { IpcMainInvokeEvent, OpenDialogOptions } from 'electron';
import { IpcHub } from './ipcHub';
import {
  DocumentCoords,
  EditorKeyType,
  pandocFormatsFromExtension,
  pandocInputFileFilters,
} from '../common';
import { parse as parsePath, relative as relativePath } from 'path';

export const askForDocumentHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    editorKey?: EditorKeyType,
    id?: string,
    options?: Partial<OpenDialogOptions>
  ): Promise<DocumentCoords | undefined> => {
    const filename = await hub.fileManager.openFile({
      filters: pandocInputFileFilters(),
      ...options,
    });
    if (filename) {
      console.log(
        `options.defaultPath=${options?.defaultPath}, filename=${filename}`
      );
      const base = options?.defaultPath;
      const src = base ? relativePath(base, filename) : filename;
      const formats = pandocFormatsFromExtension(parsePath(filename).ext);
      return {
        path: filename,
        src,
        id: id || parsePath(filename).name,
        format: formats[0],
        formats,
      };
    }
  };
