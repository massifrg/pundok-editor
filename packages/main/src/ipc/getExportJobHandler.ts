import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { getExportJobWithHashAsJsonString } from './documentHash';

export const getExportJobHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      hash: string,
    ): Promise<string | undefined> => {
      return getExportJobWithHashAsJsonString(hash)
    };
