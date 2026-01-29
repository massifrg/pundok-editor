import { IpcMainInvokeEvent, OpenDialogOptions } from 'electron';
import { IpcHub } from './ipcHub';
import {
  DocumentCoords,
  EditorKeyType,
  pandocInputFileFilters,
} from '../common';
import { parse as parsePath, relative as relativePath } from 'path';
import { pandocFeatures } from '../pandocFeatures';

export const askForDocumentHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      editorKey?: EditorKeyType,
      id?: string,
      options?: Partial<OpenDialogOptions>
    ): Promise<DocumentCoords | undefined> => {
      if (options?.properties?.includes('openDirectory')) {
        const dir = await hub.fileManager.chooseDirectory(options)
        if (dir)
          return { path: dir }
      } else {
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
          // TODO: search also custom formats, not just Pandoc formats
          const formats = await pandocFeatures.documentFormatsFromFilename(filename, 'input');
          return {
            path: filename,
            src,
            id: id || parsePath(filename).name,
            formatName: formats[0]?.name,
          };
        }
      }
    };
