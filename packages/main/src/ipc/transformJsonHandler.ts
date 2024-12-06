import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { FindResourceOptions, PandocFilterTransform } from '../common';
import { transformWithPandoc } from '../importExport';

export const transformJsonHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    pandocJson: string,
    transform: string,
    options: string,
  ): Promise<string> => {
    const pandocTransform = JSON.parse(transform) as PandocFilterTransform;
    const context = JSON.parse(options) as Partial<FindResourceOptions>;
    return transformWithPandoc(pandocJson, pandocTransform, context);
  };
