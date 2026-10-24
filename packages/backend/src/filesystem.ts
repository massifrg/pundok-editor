import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';

export function localizePath(path: string): string {
  if (path.startsWith('file://')) {
    try {
      return fileURLToPath(path);
    } catch {
      // Fall back to the legacy path handling for malformed file URLs.
    }
  }
  const withoutFileProtocol = path.replace(/^file:\/\//, '');
  return platform() === 'win32'
    ? withoutFileProtocol.replaceAll('/', '\\').replace(/^\\([A-Z]:)/i, '$1')
    : withoutFileProtocol;
}
