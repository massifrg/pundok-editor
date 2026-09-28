import { basename, extname, isAbsolute, relative, sep } from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
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
  allowedDirectories?: readonly string[],
): Promise<string> {
  const path = localizePath(filename);
  const kind = options?.kind || resourceTypesFromExtension(extname(path))[0];
  const resolved = isAbsolute(path)
    ? path
    : findResourceFile(directories, basename(path), { ...options, kind });
  if (!resolved) throw new Error(`File not found: ${filename}`);
  let pathToRead = resolved;
  if (allowedDirectories) {
    const realFilename = await realpath(resolved);
    const realAllowedDirectories = await Promise.all(
      allowedDirectories.map(async (directory) => {
        try {
          return await realpath(directory);
        } catch (error) {
          if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          )
            return undefined;
          throw error;
        }
      }),
    );
    const isAllowed = realAllowedDirectories.some((directory) => {
      if (!directory) return false;
      const relativePath = relative(directory, realFilename);
      return (
        relativePath === '' ||
        (relativePath !== '..' &&
          !relativePath.startsWith(`..${sep}`) &&
          !isAbsolute(relativePath))
      );
    });
    if (!isAllowed) throw new Error('File access is not permitted');
    pathToRead = realFilename;
  }

  const content = await readFile(pathToRead);
  return options?.base64 ? content.toString('base64') : content.toString();
}
