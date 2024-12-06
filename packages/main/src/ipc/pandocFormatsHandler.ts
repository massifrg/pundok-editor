import { IpcMainInvokeEvent } from 'electron';
import { IpcHub } from './ipcHub';
import { runExternalProgram } from '../runExternal';

export const pandocInputFormatsHandler =
  (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent): Promise<string[]> => {
    return runPandocForFormats(['--list-input-formats']);
  };

export const pandocOutputFormatsHandler =
  (hub: IpcHub) =>
  async (e: IpcMainInvokeEvent): Promise<string[]> => {
    return runPandocForFormats(['--list-output-formats']);
  };

async function runPandocForFormats(args: string[]): Promise<string[]> {
  const command = 'pandoc';
  const { result } = runExternalProgram(command, args);
  const { error, exitCode, output } = await result;
  if (error)
    return Promise.reject(
      `Command "${command} ${args.join(
        ' '
      )} exited with code ${exitCode}: ${error}`
    );
  const formats = output.split(/\s*[\r\n]+\s*/m).filter((f) => f.length > 0);
  console.log(formats.join(','));
  return formats;
}
