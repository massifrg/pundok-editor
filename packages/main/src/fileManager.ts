import type { OpenDialogOptions, SaveDialogOptions } from 'electron';
import { dialog } from 'electron';
import * as path from 'path';
import { InputConverter } from './common';

class FileManager {
  private currentDir: string | undefined;

  // constructor() {}

  async openFile(
    openDialogOptions?: Partial<OpenDialogOptions>,
    inputConverter?: InputConverter
  ): Promise<string | undefined> {
    const config: OpenDialogOptions = {
      ...openDialogOptions,
      properties: ['openFile'],
    };
    if (inputConverter) {
      config.filters = [
        {
          name: `${inputConverter.name} files (${inputConverter.extensions
            .map((e) => '*.' + e)
            .join(',')})`,
          extensions: inputConverter.extensions,
        },
      ];
    }
    if (this.currentDir) config.defaultPath = this.currentDir;
    try {
      const res = await dialog.showOpenDialog(config);
      if (!res.canceled && res.filePaths.length > 0) {
        const filePath = res.filePaths[0];
        this.currentDir = path.dirname(filePath);
        // console.log(this.currentDir)
        // console.log(res.filePaths)
        return filePath;
      }
    } catch (err) {
      console.log(err);
      return Promise.reject(err);
    }
  }

  async saveFile(
    saveDialogOptions?: Partial<SaveDialogOptions>
  ): Promise<string> {
    const config: SaveDialogOptions = {
      properties: ['createDirectory'],
      ...saveDialogOptions,
    };
    if (!saveDialogOptions?.defaultPath && this.currentDir)
      config.defaultPath = this.currentDir;
    try {
      const res = await dialog.showSaveDialog(config);
      if (res.canceled) {
        return Promise.reject('save cancelled');
      } else {
        if (res.filePath) {
          this.currentDir = path.dirname(res.filePath);
          return res.filePath;
        }
        return Promise.reject('no save file path');
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

export default FileManager;
