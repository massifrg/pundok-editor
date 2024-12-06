/**
 * @module preload
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../common/src';
export { type SaveResponse, type StoredDoc } from '../../common/src';

type IpcRendererListener = (
  e: Electron.IpcRendererEvent,
  ...args: any[]
) => void;
// preload.js
const validChannels = Object.keys(IPC_CHANNELS);

contextBridge.exposeInMainWorld('ipc', {
  send: (channel: string, data: any) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.log(`channel ${channel} is not valid`);
    }
  },
  on: (channel: string, listener: IpcRendererListener) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    } else {
      console.log(`channel ${channel} is not valid`);
    }
  },
  invoke: (channel: string, ...args: any) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      return Promise.reject(`channel ${channel} is not valid`);
    }
  },
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string | undefined) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text || '';
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
