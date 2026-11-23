import { platform } from 'node:os';
import {
  normalizeDocumentPath,
  resolveDocumentContextPath,
} from '../../common/src';

export function localizePath(path: string): string {
  const normalized = normalizeDocumentPath(path);
  return platform() === 'win32'
    ? normalized.replaceAll('/', '\\').replace(/^\\([A-Z]:)/i, '$1')
    : normalized;
}

export function localizeDocumentPath(
  path: string,
  projectPath?: string,
): string {
  return localizePath(resolveDocumentContextPath(path, projectPath));
}
