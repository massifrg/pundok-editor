import { getConfigurationInit, parseConfigurationFiles } from "..";
import {
  PundokEditorConfigInit,
  ConfigurationSummary,
  ConfigQueryOptions
} from "../common";

export async function availableConfigurationsHandler(
  options: ConfigQueryOptions
): Promise<ConfigurationSummary[]> {
  return (await parseConfigurationFiles(options))
    .map((c) => ({
      name: c.name,
      description: c.description,
      isLocal: c.isLocal,
    } as ConfigurationSummary))
};

export async function loadConfigurationHandler(
  configurationName: string
): Promise<PundokEditorConfigInit | undefined> {
  return getConfigurationInit(configurationName);
};
