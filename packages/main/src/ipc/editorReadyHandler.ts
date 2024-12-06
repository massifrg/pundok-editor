import { IpcMainInvokeEvent } from 'electron';
import { EditorKeyType, ServerMessageSetConfiguration } from '../common';
import { getStartup } from '../resourcesManager';
import { IpcHub } from './ipcHub';

/**
 * Return a handler function for the messages that the `renderer` sends on the `editor-ready` channel,
 * to notify that the editor is ready.
 * @param hub the manager of the communications between `main` and `renderer`
 * @returns a handler for the messages `renderer->main` on the `editor-ready` channel
 */
export const editorReadyHandler =
  (hub: IpcHub) => async (e: IpcMainInvokeEvent, editorKey?: EditorKeyType) => {
    const startup = await getStartup();
    const message: ServerMessageSetConfiguration = {
      type: 'configuration',
      configurationName: startup.configuration,
      editorKey,
    };
    hub.send('set-configuration', message);
  };
