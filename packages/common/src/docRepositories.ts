import { isRecord } from './types';

export const BACKEND_VALUE_DOC_REPOSITORIES = 'doc-repositories';

export type BackendValueKey = typeof BACKEND_VALUE_DOC_REPOSITORIES;
export interface DocRepository {
  url: string;
  user: string;
  type: 'git';
  typeOptions: {
    branch: string;
  };
}

export function isDocRepositories(value: unknown): value is DocRepository[] {
  return (
    Array.isArray(value) &&
    value.every(
      (repository) =>
        isRecord(repository) &&
        typeof repository.url === 'string' &&
        typeof repository.user === 'string' &&
        repository.type === 'git' &&
        isRecord(repository.typeOptions) &&
        typeof repository.typeOptions.branch === 'string',
    )
  );
}
