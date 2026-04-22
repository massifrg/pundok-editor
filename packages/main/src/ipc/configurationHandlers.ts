import { IpcMainInvokeEvent } from 'electron';
import { ConfigurationSummary, PundokEditorConfigInit } from '../common';
import { getConfigurationInit, parseConfigurationFiles } from '../resourcesManager';
import { IpcHub } from './ipcHub';

export const availableConfigurationsHandler = (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent): Promise<ConfigurationSummary[]> => {
    return (await parseConfigurationFiles())
      .map((c) => ({
        name: c.name,
        description: c.description,
        isLocal: c.isLocal,
      } as ConfigurationSummary))
  };

export const loadConfigurationHandler = (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    configurationName: string
  ): Promise<PundokEditorConfigInit | undefined> => {
    return getConfigurationInit(configurationName);
  };
