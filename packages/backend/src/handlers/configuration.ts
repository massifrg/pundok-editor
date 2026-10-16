import type {
  ConfigQueryOptions,
  ConfigurationSummary,
  PundokEditorConfigInit,
} from '../../../common/src';
import {
  getConfigurationInit,
  parseConfigurationFiles,
  type BackendDirectories,
} from '../resourceManager';

export async function getAvailableConfigurationSummaries(
  directories: BackendDirectories,
  options?: ConfigQueryOptions,
): Promise<ConfigurationSummary[]> {
  return (await parseConfigurationFiles(directories, options)).map(
    ({ name, description, isLocal }) => ({
      name,
      description,
      isLocal: !!isLocal,
    }),
  );
}

export function loadConfiguration(
  directories: BackendDirectories,
  configurationName: string,
): Promise<PundokEditorConfigInit | undefined> {
  return getConfigurationInit(directories, configurationName);
}
