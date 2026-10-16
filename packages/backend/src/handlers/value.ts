import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  BACKEND_VALUE_DOC_REPOSITORIES,
  type BackendValueKey,
  type DocRepository,
  isDocRepositories,
} from '../../../common/src';
import type { BackendDirectories } from '../resourceManager';

export const DOC_REPOSITORIES_FILENAME = 'docrepos.json';

export async function getValue(
  directories: BackendDirectories,
  key: BackendValueKey,
): Promise<DocRepository[]> {
  switch (key) {
    case BACKEND_VALUE_DOC_REPOSITORIES: {
      let content: string;
      try {
        content = await readFile(
          resolve(directories.userDataDir, DOC_REPOSITORIES_FILENAME),
          'utf8',
        );
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return [];
        throw error;
      }

      const value: unknown = JSON.parse(content);
      if (!isDocRepositories(value)) {
        throw new Error(
          `${DOC_REPOSITORIES_FILENAME} must contain an array of document repositories`,
        );
      }
      return value;
    }
    default:
      throw new Error(`Unsupported backend value: ${key}`);
  }
}
