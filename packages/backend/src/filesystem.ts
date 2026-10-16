import { platform } from 'node:os';

export function localizePath(path: string): string {
  const withoutFileProtocol = path.replace(/^file:\/\//, '');
  return platform() === 'win32'
    ? withoutFileProtocol.replaceAll('/', '\\').replace(/^\\([A-Z]:)/i, '$1')
    : withoutFileProtocol;
}
