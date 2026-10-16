import type { BackendDirectories } from '../resourceManager';

export function getBackendDebugInfo(directories: BackendDirectories): object {
  return {
    'app-data-dir': directories.userDataDir,
    'configs-dir': directories.configurationsDir,
    'local-configs-dir': directories.localConfigurationsDir,
  };
}
