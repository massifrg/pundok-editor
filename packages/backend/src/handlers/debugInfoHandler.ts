import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { userAppDataDir, configsDir, localConfigsDir } from '../resourcesManager';

export const debugInfoHandler =
  (hub: IpcHub) =>
    async (e: IpcMainInvokeEvent): Promise<object> => {
      const info = {
        'app-data-dir': userAppDataDir(),
        'configs-dir': configsDir(),
        'local-configs-dir': localConfigsDir(),
      };
      return Promise.resolve(info);
    };
