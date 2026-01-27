import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  CompatibleDocumentContext,
  PundokBookmark,
  InputConverter,
  PundokEditorProject,
  DocumentContext,
} from '../common';
import { isAbsolute, parse as parsePath, resolve } from 'path';
import { isString } from 'lodash-es';
import { updateBookmarksFile } from '../bookmarks';
import { refreshMainMenu } from '../mainWindow';

/**
 * Return a handler function for the messages that the `renderer` sends on the `open-document` channel,
 * to ask to read and send back the contents of a file to the `renderer`.
 * @param hub the manager of the communications between `main` and `renderer`
 * @returns
 */
export const openDocumentHandler =
  (hub: IpcHub) =>
    async (e: IpcMainInvokeEvent, ctx: string) => {
      try {
        const context = JSON.parse(ctx) as DocumentContext
        const {
          configurationName,
          editorKey,
          documentFormat,
          path: maybePath,
          project,
        } = context;
        let path = maybePath;
        if (project && maybePath && !isAbsolute(maybePath)) {
          if (project.rootDocument && isAbsolute(project.rootDocument)) {
            path = resolve(parsePath(project.rootDocument).dir, maybePath);
          } else {
            path = resolve(project.path, maybePath);
          }
        }
        const readDoc = await hub.openDocument({
          editorKey,
          configurationName,
          path,
          documentFormat,
          project,
        });
        const bookmarks: PundokBookmark[] = [];
        if (readDoc?.path)
          bookmarks.push({
            type: 'document',
            path: readDoc!.path,
            configurationName: readDoc?.project
              ? undefined
              : readDoc.configurationName,
          });
        if (readDoc?.project?.rootDocument)
          bookmarks.push({
            type: 'project',
            name: readDoc.project.name,
            path: resolve(readDoc.project.path, readDoc.project.rootDocument),
          });
        await updateBookmarksFile(bookmarks);
        refreshMainMenu(hub);
        return readDoc;
      } catch (err) {
        return Promise.reject(err);
      }
    };
