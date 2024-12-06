import { IpcMainInvokeEvent, shell } from 'electron';
import { IpcHub } from './ipcHub';
import {
  EditorKeyType,
  PandocEditorProject,
  SaveResponse,
  ServerMessageForViewer,
  StoredDoc,
} from '../common';
import { errorFeedback } from './feedback';
import { stringify } from '../utils';

/**
 * Return a handler function for the messages that the `renderer` sends on the `open-document` channel,
 * to ask to save to a file the contents of a {@link StoredDoc}.
 * @param hub the manager of the communications between `main` and `renderer`
 */
export const saveDocumentHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    docAsJsonString: string,
    projectAsJsonString: string | undefined,
    editorKey?: EditorKeyType,
  ): Promise<SaveResponse> => {
    let response: SaveResponse;
    try {
      const doc: StoredDoc = JSON.parse(docAsJsonString);
      const project: PandocEditorProject | undefined =
        !projectAsJsonString || projectAsJsonString === '{}'
          ? undefined
          : JSON.parse(projectAsJsonString);
      if (doc.converter) {
        response = await hub.exportDocument(doc, project, editorKey);
        console.log(`EXPORT FINISHED`);
        console.log(doc);
        if (!response.error && response.resultFile) {
          const openResult = doc.converter?.openResult;
          console.log(`openResult=${openResult}`);
          if (openResult === 'editor') {
            hub.send('show-in-viewer', {
              type: 'viewer',
              editorKey,
              setup: {
                name: response.resultFile,
              },
            } as ServerMessageForViewer);
          } else if (openResult === 'os') {
            shell.openPath(response.resultFile).catch((error) => {
              errorFeedback(hub, stringify(error), editorKey);
            });
          }
        }
      } else {
        response = await hub.saveDocument(doc, project);
      }
      if (response.error) {
        const errmsg = stringify(response.error);
        errorFeedback(hub, errmsg, editorKey);
        // console.log(errmsg);
      } else {
        // actionsHub.setSavePath(doc.path);
      }
      // console.log(response.doc.path);
      return response;
    } catch (error) {
      if (error !== 'save cancelled')
        errorFeedback(hub, stringify(error), editorKey);
      return Promise.reject(error);
    }
  };
