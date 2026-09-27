import { statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
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
  const documents: Document[] = [];
  if (!isRoot(directory)) folders.push({ name: '..' });
  for (const entry of contents) {
    if (
      entry.isDirectory() ||
      (entry.isSymbolicLink() && isDirectory(directory, entry.name))
    )
      folders.push({ name: entry.name });
    else if (entry.isFile() || entry.isSymbolicLink())
      documents.push({ name: entry.name });
  }
  return {
    baseUrl: `file://${directory.replaceAll('\\', '/')}`,
    folders,
    documents,
    places,
    platform: process.platform,
  };
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
