import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { getRenderingJobWithHashAsJsonString } from './documentHash';

export const getRenderingJobHandler =
  (hub: IpcHub) =>
    async (
      e: IpcMainInvokeEvent,
      hash: string,
    ): Promise<string | undefined> => {
      return getRenderingJobWithHashAsJsonString(hash)
    };
