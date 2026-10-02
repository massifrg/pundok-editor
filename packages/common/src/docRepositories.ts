export const BACKEND_VALUE_DOC_REPOSITORIES = 'doc-repositories';

export type BackendValueKey = typeof BACKEND_VALUE_DOC_REPOSITORIES;
export type DocRepositoryProjectRole = 'admin' | 'user';

export interface DocRepositoryProject {
  name: string;
  description: string;
  role: DocRepositoryProjectRole;
  user?: string;
  typeOptions?: {
    branch: string;
  };
}

export interface DocRepository {
  name: string;
  description: string;
  url: string;
  type: 'git';
  projects: DocRepositoryProject[];
}

export function isDocRepositories(value: unknown): value is DocRepository[] {
  return (
    Array.isArray(value) &&
    value.every(
      (repository) =>
        isRecord(repository) &&
        typeof repository.name === 'string' &&
        typeof repository.description === 'string' &&
        typeof repository.url === 'string' &&
        repository.type === 'git' &&
        Array.isArray(repository.projects) &&
        repository.projects.every(isDocRepositoryProject),
    )
  );
}

function isDocRepositoryProject(
  project: unknown,
): project is DocRepositoryProject {
  return (
    isRecord(project) &&
    typeof project.name === 'string' &&
    typeof project.description === 'string' &&
    (project.role === 'admin' || project.role === 'user') &&
    (project.user === undefined || typeof project.user === 'string') &&
    (project.typeOptions === undefined ||
      (isRecord(project.typeOptions) &&
        typeof project.typeOptions.branch === 'string'))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
