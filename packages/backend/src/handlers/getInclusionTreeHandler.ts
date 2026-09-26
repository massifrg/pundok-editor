import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { runWriterOnMasterFile } from '../importExport';

const INCLUSION_TREE_CUSTOM_WRITER = 'inclusion-tree.lua';

export const getInclusionTreeHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    projectAsJson: string,
  ): Promise<string | undefined> =>
    runWriterOnMasterFile(projectAsJson, INCLUSION_TREE_CUSTOM_WRITER);
