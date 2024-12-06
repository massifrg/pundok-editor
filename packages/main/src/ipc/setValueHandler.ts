import { IpcMainInvokeEvent } from 'electron';
import {
  EditorKeyType,
  IPC_MAIN_EDITOR_KEY,
  IPC_VALUE_WINDOW_TITLE,
} from '../common';
import { IpcHub } from './ipcHub';

export const setValueHandler =
  (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent, key: string, value?: string): Promise<void> => {
    const decoded = value && JSON.parse(value);
    switch (key) {
      case IPC_VALUE_WINDOW_TITLE:
        hub.setWindowTitle(decoded || '');
        break;
      case IPC_MAIN_EDITOR_KEY:
        hub.setMainEditorKey(decoded as EditorKeyType);
        break;
      default:
        console.error(
          `don't know what to do with "set-value" event on parameter "${key}"`
        );
    }
  };
