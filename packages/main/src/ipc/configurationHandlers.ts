import { IpcMainInvokeEvent } from 'electron';
import { ConfigQueryOptions, ConfigurationSummary, PundokEditorConfigInit } from '../common';
import { getConfigurationInit, parseConfigurationFiles } from '../resourcesManager';
import { IpcHub } from './ipcHub';

export const availableConfigurationsHandler = (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent, options: ConfigQueryOptions): Promise<ConfigurationSummary[]> => {
    return (await parseConfigurationFiles(options))
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
