import { isAbsolute, basename, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  type FindResourceOptions,
  resourceTypesFromExtension,
} from '../../../common/src';
import { localizePath } from '../filesystem';
import { findResourceFile, type BackendDirectories } from '../resourceManager';

export async function getFileContents(
  directories: BackendDirectories,
  filename: string,
  options?: Partial<FindResourceOptions>,
): Promise<string> {
  const path = localizePath(filename);
  const kind = options?.kind || resourceTypesFromExtension(extname(path))[0];
  const resolved = isAbsolute(path)
    ? path
    : findResourceFile(directories, basename(path), { ...options, kind });
  if (!resolved) throw new Error(`File not found: ${filename}`);
  const content = await readFile(resolved);
  return options?.base64 ? content.toString('base64') : content.toString();
}
