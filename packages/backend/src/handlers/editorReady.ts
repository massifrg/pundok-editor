import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  getPundokVersion,
  HARDCODED_CONFIG_NAME,
  type EditorKeyType,
  type ServerMessageSetConfiguration,
} from '../../../common/src';
import type { BackendDirectories } from '../resourceManager';
import type { RendererHub } from '../rendererHub';

const STARTUP_FILENAME = 'startup.json';

type StartupConfiguration = {
  version: string;
  configuration: string;
  env: Record<string, string>;
};

export async function editorReady(
  directories: BackendDirectories,
  hub: RendererHub,
  editorKey?: EditorKeyType,
): Promise<void> {
  const filename = resolve(directories.userDataDir, STARTUP_FILENAME);
  const startup = await readStartup(filename);
  if (!existsSync(filename) || startup.version !== getPundokVersion()) {
    await writeFile(
      filename,
      JSON.stringify({ ...startup, version: getPundokVersion() }, undefined, 2),
    );
  }
  const message: ServerMessageSetConfiguration = {
    type: 'configuration',
    configurationName: startup.configuration,
    editorKey,
  };
  hub.send('set-configuration', message);
}

async function readStartup(filename: string): Promise<StartupConfiguration> {
  try {
    return JSON.parse(await readFile(filename, 'utf8')) as StartupConfiguration;
  } catch {
    return {
      version: getPundokVersion(),
      configuration: HARDCODED_CONFIG_NAME,
      env: {},
    };
  }
}
