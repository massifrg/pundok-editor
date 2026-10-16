import { statSync, type Dirent } from 'node:fs';
import { lstat, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type {
  Document,
  Folder,
  FolderContents,
  Place,
} from '../../../common/src';
import { localizePath } from '../filesystem';

export async function getFolderContents(
  path: string,
  places: Place[] = [],
): Promise<FolderContents> {
  const directory = localizePath(path);
  const contents = await readdir(directory, { withFileTypes: true });
  const folders: Folder[] = [];
  const documentEntries: Dirent[] = [];
  if (!isRoot(directory)) folders.push({ name: '..' });
  for (const entry of contents) {
    if (
      entry.isDirectory() ||
      (entry.isSymbolicLink() && isDirectory(directory, entry.name))
    )
      folders.push({ name: entry.name });
    else if (entry.isFile() || entry.isSymbolicLink())
      documentEntries.push(entry);
  }
  const documents: Document[] = await Promise.all(
    documentEntries.map(async (entry) => {
      const filename = resolve(directory, entry.name);
      const details = await statDocument(filename, entry.isSymbolicLink());
      return {
        name: entry.name,
        size: details.size,
        lastModified: details.mtimeMs,
      };
    }),
  );
  return {
    baseUrl: `file://${directory.replaceAll('\\', '/')}`,
    folders,
    documents,
    places,
    platform: process.platform,
  };
}

async function statDocument(filename: string, isSymbolicLink: boolean) {
  try {
    return await stat(filename);
  } catch (error) {
    if (!isSymbolicLink || !isNotFoundError(error)) throw error;
    return lstat(filename);
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isRoot(directory: string): boolean {
  const normalized = resolve(directory);
  return dirname(normalized) === normalized;
}

function isDirectory(directory: string, name: string): boolean {
  try {
    return statSync(resolve(directory, name)).isDirectory();
  } catch {
    return false;
  }
}
