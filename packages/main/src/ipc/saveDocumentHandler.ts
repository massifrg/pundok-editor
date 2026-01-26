import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  PundokBookmark,
  EditorKeyType,
  PundokEditorProject,
  SaveResponse,
  StoredDoc,
} from '../common';
import { errorFeedback } from './feedback';
import { stringify } from '../utils';
import { updateBookmarksFile } from '../bookmarks';

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
        const project: PundokEditorProject | undefined =
          !projectAsJsonString || projectAsJsonString === '{}'
            ? undefined
            : JSON.parse(projectAsJsonString);
        if (doc.outputConverter) {
          response = await hub.exportDocument(doc, project, editorKey);
          console.log(`EXPORT FINISHED`);
          // console.log(doc);
        } else if (doc.content) {
          response = await hub.saveDocument(doc, project);
          const bookmark: PundokBookmark = {
            type: 'document',
            path: doc.path!,
            configurationName: !project && doc.configurationName || undefined,
            id: doc.id
          }
          await updateBookmarksFile([bookmark]);
        } else {
          response = {
            doc,
            error: "you provided no content to save",
            message: "you provided no content to save"
          }
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
