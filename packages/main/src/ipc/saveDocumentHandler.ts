import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  PundokBookmark,
  EditorKeyType,
  SaveResponse,
  CxDocument,
  documentFormatToOutputConverter,
  DocumentFormat,
} from '../common';
import { errorFeedback } from './feedback';
import { stringify } from '../utils';
import { updateBookmarksFile } from '../bookmarks';

/**
 * Return a handler function for the messages that the `renderer` sends on the `open-document` channel,
 * to ask to save to a file the contents of a {@link CxDocument}.
 * @param hub the manager of the communications between `main` and `renderer`
 */
export const saveDocumentHandler =
  (hub: IpcHub) =>
    async (e: IpcMainInvokeEvent, storedDoc: string): Promise<SaveResponse> => {
      let response: SaveResponse;
      let editorKey: EditorKeyType | undefined = undefined
      try {
        const doc: CxDocument = JSON.parse(storedDoc);
        editorKey = doc.editorKey
        const { configurationName, content, documentFormat, id, path, project } = doc
        const outputConverter = documentFormatToOutputConverter(documentFormat as DocumentFormat)
        if (outputConverter) {
          response = await hub.exportDocument(doc, project, editorKey);
          console.log(`EXPORT FINISHED`);
          // console.log(doc);
        } else if (content) {
          response = await hub.saveDocument(doc, project);
          const bookmark: PundokBookmark = {
            type: 'document',
            id,
            path: path!,
            configurationName: project ? undefined : configurationName,
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
        if (error !== 'save cancelled' && editorKey)
          errorFeedback(hub, stringify(error), editorKey);
        return Promise.reject(error);
      }
    };
