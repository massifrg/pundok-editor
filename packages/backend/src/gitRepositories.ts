import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import {
  DEFAULT_PROJECT_FILENAME,
  type CloneGitProjectOptions,
  type ClonedGitProject,
  type DocRepository,
  type ExternalProgramResult,
  isDocRepositories,
} from '../../common/src';
import { DOC_REPOSITORIES_FILENAME } from './handlers/value';
import { runExternalProgram } from './runExternal';
import type { BackendDirectories } from './resourceManager';

interface RepositoryMetadata {
  name: string;
  description: string;
}

export class GitRepositoryManager {
  private readonly credentials = new Map<
    string,
    { user: string; password: string }
  >();

  constructor(private readonly directories: BackendDirectories) {}

  async list(): Promise<ClonedGitProject[]> {
    const repositories = await this.repositories();
    return repositories.flatMap((repository) =>
      repository.projects
        .filter((project) => project.user !== undefined && project.typeOptions)
        .map((project) => ({
          name: project.name,
          description: project.description,
          url: repository.url,
          user: project.user!,
          type: 'git' as const,
          typeOptions: project.typeOptions!,
        })),
    );
  }

  async clone(options: CloneGitProjectOptions): Promise<ClonedGitProject> {
    validateCloneOptions(options);
    await mkdir(this.directories.userDataDir, { recursive: true });
    const metadata = await repositoryMetadata(
      options.url,
      options.user,
      options.password,
    );
    const branch = options.branch || options.user;
    validateBranch(branch);
    const projects = await this.list();
    if (projects.some((project) => project.name === metadata.name))
      throw new Error(`A project named "${metadata.name}" is already cloned`);

    const projectPath = resolve(this.directories.userDataDir, metadata.name);
    if (!isDirectChild(this.directories.userDataDir, projectPath))
      throw new Error(`Invalid repository name: "${metadata.name}"`);
    try {
      await this.runGit(
        ['clone', '--origin', 'origin', options.url, projectPath],
        options.user,
        options.password,
      );
      await readProjectFile(projectPath);
      const mainBranch = await this.defaultBranch(projectPath, options);
      if (branch === mainBranch)
        throw new Error(
          `The user branch "${branch}" must differ from the main branch`,
        );
      await this.runGit(
        ['switch', '-c', branch],
        options.user,
        options.password,
        projectPath,
      );
      await this.runGit(
        ['fetch', 'origin', mainBranch],
        options.user,
        options.password,
        projectPath,
      );
      if (branch !== mainBranch) {
        await this.runGit(
          ['merge', '--no-edit', `origin/${mainBranch}`],
          options.user,
          options.password,
          projectPath,
        );
      }
    } catch (error) {
      await rm(projectPath, { recursive: true, force: true });
      throw error;
    }

    const project: ClonedGitProject = {
      name: metadata.name,
      description: metadata.description,
      url: options.url,
      user: options.user,
      type: 'git',
      typeOptions: { branch },
    };
    await this.writeProjects([...projects, project]);
    this.credentials.set(project.name, {
      user: options.user,
      password: options.password,
    });
    return project;
  }

  async mergeMain(name: string): Promise<void> {
    const project = await this.project(name);
    const credentials = this.credentialsFor(project);
    const path = this.projectPath(project);
    const mainBranch = await this.defaultBranch(path, credentials);
    await this.runGit(
      ['fetch', 'origin', mainBranch],
      credentials.user,
      credentials.password,
      path,
    );
    await this.checkoutBranch(project, credentials);
    await this.runGit(
      ['merge', '--no-edit', `origin/${mainBranch}`],
      credentials.user,
      credentials.password,
      path,
    );
  }

  async pull(name: string): Promise<void> {
    const project = await this.project(name);
    const credentials = this.credentialsFor(project);
    const path = this.projectPath(project);
    await this.checkoutBranch(project, credentials);
    await this.runGit(
      ['pull', '--ff-only', 'origin', project.typeOptions.branch],
      credentials.user,
      credentials.password,
      path,
    );
  }

  async push(name: string): Promise<void> {
    const project = await this.project(name);
    const credentials = this.credentialsFor(project);
    const path = this.projectPath(project);
    await this.checkoutBranch(project, credentials);
    await this.runGit(
      [
        'push',
        'origin',
        `${project.typeOptions.branch}:${project.typeOptions.branch}`,
      ],
      credentials.user,
      credentials.password,
      path,
    );
  }

  private async project(name: string): Promise<ClonedGitProject> {
    const project = (await this.list()).find(
      (candidate) => candidate.name === name,
    );
    if (!project) throw new Error(`No cloned project named "${name}"`);
    return project;
  }

  private projectPath(project: ClonedGitProject): string {
    const path = resolve(this.directories.userDataDir, project.name);
    if (!isDirectChild(this.directories.userDataDir, path))
      throw new Error(`Invalid cloned project name: "${project.name}"`);
    return path;
  }

  private credentialsFor(project: ClonedGitProject) {
    const credentials = this.credentials.get(project.name);
    if (!credentials)
      throw new Error(
        `No credentials are available for "${project.name}"; clone it again in this session`,
      );
    return credentials;
  }

  private async checkoutBranch(
    project: ClonedGitProject,
    credentials: { user: string; password: string },
  ): Promise<void> {
    await this.runGit(
      ['switch', project.typeOptions.branch],
      credentials.user,
      credentials.password,
      this.projectPath(project),
    );
  }

  private async defaultBranch(
    path: string,
    credentials: { user: string; password: string },
  ): Promise<string> {
    try {
      const result = await this.runGit(
        ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'],
        credentials.user,
        credentials.password,
        path,
      );
      const branch = result.output.trim().replace(/^origin\//, '');
      if (branch) return branch;
    } catch {
      // Some Git servers do not advertise origin/HEAD.
    }
    for (const branch of ['main', 'master']) {
      try {
        await this.runGit(
          ['show-ref', '--verify', `refs/remotes/origin/${branch}`],
          credentials.user,
          credentials.password,
          path,
        );
        return branch;
      } catch {
        // Try the next conventional default branch.
      }
    }
    throw new Error(`Could not determine the main branch of "${path}"`);
  }

  private async runGit(
    args: string[],
    user: string,
    password: string,
    cwd?: string,
  ): Promise<ExternalProgramResult> {
    const result = await runExternalProgram('git', args, {
      ...(cwd && { cwd }),
      env: gitEnvironment(user, password),
    }).result;
    if (result.exitCode !== 0)
      throw new Error(
        `Git command failed (${result.commandLine}): ${result.error || result.output}`,
      );
    return result;
  }

  private async writeProjects(projects: ClonedGitProject[]): Promise<void> {
    const repositories = await this.repositories();
    for (const project of projects) {
      let repository = repositories.find(
        (candidate) => candidate.url === project.url,
      );
      if (!repository) {
        repository = {
          name: project.name,
          description: project.description,
          url: project.url,
          type: 'git',
          projects: [],
        };
        repositories.push(repository);
      }
      const existingProject = repository.projects.find(
        (candidate) => candidate.name === project.name,
      );
      const projectData = {
        name: project.name,
        description: project.description,
        role: existingProject?.role || ('user' as const),
        user: project.user,
        typeOptions: project.typeOptions,
      };
      if (existingProject) Object.assign(existingProject, projectData);
      else repository.projects.push(projectData);
    }
    const filename = resolve(
      this.directories.userDataDir,
      DOC_REPOSITORIES_FILENAME,
    );
    const temporary = `${filename}.tmp-${process.pid}`;
    await writeFile(
      temporary,
      `${JSON.stringify(repositories, undefined, 2)}\n`,
      'utf8',
    );
    await rename(temporary, filename);
  }

  private async repositories(): Promise<DocRepository[]> {
    try {
      const content = await readFile(
        resolve(this.directories.userDataDir, DOC_REPOSITORIES_FILENAME),
        'utf8',
      );
      const value: unknown = JSON.parse(content);
      if (!isDocRepositories(value))
        throw new Error(
          `${DOC_REPOSITORIES_FILENAME} must contain an array of document repositories`,
        );
      return value;
    } catch (error) {
      if (isNodeError(error, 'ENOENT')) return [];
      throw error;
    }
  }
}

async function repositoryMetadata(
  url: string,
  user: string,
  password: string,
): Promise<RepositoryMetadata> {
  const parsed = parseRepositoryUrl(url);
  if (!parsed) throw new Error(`Unsupported Git repository URL: "${url}"`);
  const fallback = { name: parsed.name, description: '' };
  const apiUrl =
    parsed.host === 'github.com'
      ? `https://api.github.com/repos/${parsed.owner}/${parsed.name}`
      : `${parsed.origin}/api/v1/repos/${parsed.owner}/${parsed.name}`;
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'pundok-editor',
        Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return fallback;
    const value: unknown = await response.json();
    if (!isRecord(value) || typeof value.name !== 'string') return fallback;
    return {
      name: safeProjectName(value.name),
      description:
        typeof value.description === 'string' ? value.description : '',
    };
  } catch {
    return fallback;
  }
}

function parseRepositoryUrl(
  value: string,
): { host: string; origin: string; owner: string; name: string } | undefined {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return undefined;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return undefined;
  const name = safeProjectName(parts.at(-1)!.replace(/\.git$/, ''));
  const owner = parts.at(-2)!;
  return { host: parsed.host, origin: parsed.origin, owner, name };
}

function safeProjectName(name: string): string {
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name))
    throw new Error(`Invalid repository name: "${name}"`);
  return name;
}

function validateCloneOptions(options: CloneGitProjectOptions): void {
  if (!options.url || !options.user || !options.password)
    throw new Error('A repository URL, username, and password are required');
}

function validateBranch(branch: string): void {
  if (
    !branch ||
    branch.startsWith('-') ||
    branch.includes('..') ||
    /[\s~^:?*[\\]/.test(branch)
  )
    throw new Error(`Invalid Git branch: "${branch}"`);
}

async function readProjectFile(path: string): Promise<void> {
  const filename = resolve(path, DEFAULT_PROJECT_FILENAME);
  await access(filename);
  const value: unknown = JSON.parse(await readFile(filename, 'utf8'));
  if (!isRecord(value))
    throw new Error(`${DEFAULT_PROJECT_FILENAME} must contain an object`);
}

function gitEnvironment(user: string, password: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraHeader',
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
  };
}

function isDirectChild(parent: string, child: string): boolean {
  const pathRelativeToParent = relative(resolve(parent), resolve(child));
  return (
    pathRelativeToParent !== '' &&
    pathRelativeToParent !== '..' &&
    !pathRelativeToParent.startsWith(
      `..${process.platform === 'win32' ? '\\' : '/'}`,
    ) &&
    !pathRelativeToParent.includes(process.platform === 'win32' ? '\\' : '/')
  );
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
