import { IpcMainInvokeEvent } from 'electron';
import { ConfigurationSummary, PandocEditorConfigInit } from '../common';
import { IpcHub } from './ipcHub';
import { parseConfigurationFiles } from '../resourcesManager';

export const availableConfigurationsHandler =
  (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent): Promise<ConfigurationSummary[]> => {
    const configs = await parseConfigurationFiles();
    return configs.map((c) => ({
      name: c.name,
      description: c.description,
    }));
  };

export async function getConfigurationInit(
  configurationName?: string
): Promise<PandocEditorConfigInit | undefined> {
  if (!configurationName) return undefined;
  const configs = await parseConfigurationFiles();
  const config = configs.find((c) => c.name === configurationName);
  // console.log(config);
  return config;
}

export const loadConfigurationHandler =
  (hub: IpcHub) =>
  async (
    e: IpcMainInvokeEvent,
    configurationName: string
  ): Promise<PandocEditorConfigInit | undefined> => {
    return getConfigurationInit(configurationName);
  };
