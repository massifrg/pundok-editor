import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { CxDocument, PandocFilterTransform } from '../common';
import { transformWithPandoc } from '../importExport';

export const transformJsonHandler = (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    jsonDoc: string,
    jsonTransform: string,
  ): Promise<string> => {
    const doc = JSON.parse(jsonDoc) as Partial<CxDocument>
    const pandocTransform = JSON.parse(jsonTransform) as PandocFilterTransform;
    return transformWithPandoc(doc, pandocTransform);
  };
