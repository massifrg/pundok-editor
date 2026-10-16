import { mkdir } from 'node:fs/promises';
import { localizePath } from '../filesystem';

export async function createFolder(path: string): Promise<string> {
  const directory = localizePath(path);
  await mkdir(directory);
  return directory;
}
