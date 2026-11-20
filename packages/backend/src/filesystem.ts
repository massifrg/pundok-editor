import { platform } from 'node:os';
import { normalizeDocumentPath } from '../../common/src';

export function localizePath(path: string): string {
  const normalized = normalizeDocumentPath(path);
  return platform() === 'win32'
    ? normalized.replaceAll('/', '\\').replace(/^\\([A-Z]:)/i, '$1')
    : normalized;
}
