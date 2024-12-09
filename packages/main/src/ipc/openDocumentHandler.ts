import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import {
  CompatibleDocumentContext,
  DocBookmark,
  InputConverter,
  PundokEditorProject,
} from '../common';
import { isAbsolute, sep as pathSeparator, parse as parsePath } from 'path';
import { isString } from 'lodash';
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
    async (e: IpcMainInvokeEvent, context: CompatibleDocumentContext) => {
      const {
        configurationName,
        editorKey,
        inputConverter: maybeInputConverter,
        path: maybePath,
        project: maybeProject,
      } = context;
      try {
        const inputConverter = isString(maybeInputConverter)
          ? (JSON.parse(maybeInputConverter) as InputConverter)
          : maybeInputConverter;
        const project = isString(maybeProject)
          ? (JSON.parse(maybeProject) as PundokEditorProject)
          : maybeProject;
        let path = maybePath;
        if (project && maybePath && !isAbsolute(maybePath)) {
          if (project.rootDocument && isAbsolute(project.rootDocument)) {
            path =
              parsePath(project.rootDocument).dir + pathSeparator + maybePath;
          } else {
            path = project.path + pathSeparator + maybePath;
          }
        }
        const readDoc = await hub.openDocument({
          editorKey,
          configurationName,
          path,
          inputConverter,
          project,
        });
        const bookmarks: DocBookmark[] = [];
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
            path:
              readDoc.project.path + pathSeparator + readDoc.project.rootDocument,
          });
        await updateBookmarksFile(bookmarks);
        refreshMainMenu(hub);
        return readDoc;
      } catch (err) {
        return Promise.reject(err);
      }
    };
