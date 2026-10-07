import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  DEFAULT_PROJECT_FILENAME,
  type CloneGitProjectOptions,
  type ClonedGitProject,
  type DocRepository,
  type ExternalProgramResult,
  type LocalGitProjectOptions,
  type GitCommitOptions,
  type GitProjectStatus,
  type GitStatusEntry,
  isDocRepositories,
  type PundokEditorProject,
} from '../../common/src';
import { DOC_REPOSITORIES_FILENAME } from './handlers/value';
import { runExternalProgram } from './runExternal';
import type { BackendDirectories } from './resourceManager';

export class GitRepositoryManager {
  private readonly credentials = new Map<
    string,
    { user: string; password: string }
  >();

  constructor(private readonly directories: BackendDirectories) {}

  async status(path: string): Promise<GitProjectStatus> {
    try {
      const branch = await this.currentBranch(path, { user: '', password: '' });
      const result = await this.runGit(['status', '--porcelain'], '', '', path);
      return { managed: true, branch, files: parseStatus(result.output) };
    } catch {
      return { managed: false, files: [] };
    }
  }

  async init(path: string): Promise<void> {
    await this.runGit(['init'], '', '', path);
  }

  async stage(path: string, paths: string[]): Promise<void> {
    if (!paths.length) return;
    await this.runGit(['add', '--', ...paths], '', '', path);
  }

  async commit(options: GitCommitOptions): Promise<void> {
    if (!options.message.trim())
      throw new Error('A commit message is required');
    await this.runGit(
      ['commit', '-m', options.message],
      '',
      '',
      options.projectPath,
    );
  }

  async scanRemoteProjects(
    url: string,
    user: string,
    password: string,
  ): Promise<Array<{ name: string; description: string; url: string }>> {
    validateCredentials({ url, user, password });
    const repositories = await remoteRepositories(url, user, password);
    const found: Array<{ name: string; description: string; url: string }> = [];
    for (const repository of repositories) {
      const directory = await mkdtemp(join(tmpdir(), 'pundok-scan-'));
      try {
        await this.runGit(
          ['clone', '--depth', '1', repository.url, directory],
          user,
          password,
        );
        const project = await readProject(directory);
        found.push({
          name: project.name,
          description: project.description || '',
          url: repository.url,
        });
      } catch {
        // Repositories without a valid root project file are not candidates.
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
    return found;
  }

  list(): Promise<DocRepository[]> {
    return this.repositories();
  }

  async clone(options: CloneGitProjectOptions): Promise<ClonedGitProject> {
    validateCredentials(options);
    const metadata = await repositoryMetadata(
      options.url,
      options.user,
      options.password,
    );
    const branch = options.branch || options.user;
    validateBranch(branch);
    const projectPath = resolve(
      options.destination || this.directories.userDataDir,
      metadata.name,
    );
    const destination = resolve(
      options.destination || this.directories.userDataDir,
    );
    if (!isDirectChild(destination, projectPath))
      throw new Error(`Invalid repository name: "${metadata.name}"`);

    try {
      await mkdir(destination, { recursive: true });
      await this.runGit(
        ['clone', '--origin', 'origin', options.url, projectPath],
        options.user,
        options.password,
      );
      const project = await readProject(projectPath);
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
      await this.runGit(
        ['merge', '--no-edit', `origin/${mainBranch}`],
        options.user,
        options.password,
        projectPath,
      );
      return {
        ...project,
        description: project.description || '',
        path: projectPath,
        url: options.url,
        user: options.user,
        type: 'git',
        typeOptions: { branch },
      };
    } catch (error) {
      await rm(projectPath, { recursive: true, force: true });
      throw error;
    }
  }

  async publish(options: LocalGitProjectOptions): Promise<ClonedGitProject> {
    validateCredentials(options);
    const project = await readProject(options.projectPath);
    const credentials = { user: options.user, password: options.password };
    const branch = await this.currentBranch(options.projectPath, credentials);
    const remoteName = options.remoteName || 'origin';
    const created = await this.createRemoteRepository(options, project);
    await this.addOrValidateRemote(
      options.projectPath,
      remoteName,
      options.url,
      credentials,
    );
    if (created)
      await this.runGit(
        ['push', '--set-upstream', remoteName, `${branch}:${branch}`],
        options.user,
        options.password,
        options.projectPath,
      );
    await this.saveRepository({
      url: options.url,
      user: options.user,
      type: 'git',
      typeOptions: { branch },
    });
    this.credentials.set(options.url, credentials);
    return {
      ...project,
      description: project.description || '',
      path: options.projectPath,
      url: options.url,
      user: options.user,
      type: 'git',
      typeOptions: { branch },
    };
  }

  async connect(options: LocalGitProjectOptions): Promise<ClonedGitProject> {
    validateCredentials(options);
    const project = await readProject(options.projectPath);
    const credentials = { user: options.user, password: options.password };
    const branch = await this.currentBranch(options.projectPath, credentials);
    await this.addOrValidateRemote(
      options.projectPath,
      options.remoteName || 'origin',
      options.url,
      credentials,
    );
    await this.saveRepository({
      url: options.url,
      user: options.user,
      type: 'git',
      typeOptions: { branch },
    });
    this.credentials.set(options.url, credentials);
    return {
      ...project,
      description: project.description || '',
      path: options.projectPath,
      url: options.url,
      user: options.user,
      type: 'git',
      typeOptions: { branch },
    };
  }

  private async saveRepository(repository: DocRepository): Promise<void> {
    const repositories = await this.repositories();
    const index = repositories.findIndex(
      (candidate) => candidate.url === repository.url,
    );
    if (index === -1) repositories.push(repository);
    else repositories[index] = repository;
    const filename = resolve(
      this.directories.userDataDir,
      DOC_REPOSITORIES_FILENAME,
    );
    const temporary = `${filename}.tmp-${process.pid}`;
    await writeFile(
      temporary,
      `${JSON.stringify(repositories, undefined, 2)}\n`,
    );
    await rename(temporary, filename);
  }

  private async repositories(): Promise<DocRepository[]> {
    try {
      const value: unknown = JSON.parse(
        await readFile(
          resolve(this.directories.userDataDir, DOC_REPOSITORIES_FILENAME),
          'utf8',
        ),
      );
      if (!isDocRepositories(value))
        throw new Error(
          `${DOC_REPOSITORIES_FILENAME} must contain an array of remote repositories`,
        );
      return value;
    } catch (error) {
      if (isNodeError(error, 'ENOENT')) return [];
      throw error;
    }
  }

  private async addOrValidateRemote(
    path: string,
    name: string,
    url: string,
    credentials: { user: string; password: string },
  ): Promise<void> {
    try {
      const current = await this.runGit(
        ['remote', 'get-url', name],
        credentials.user,
        credentials.password,
        path,
      );
      if (current.output.trim() !== url)
        throw new Error(`Git remote "${name}" already points to another URL`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already points'))
        throw error;
      await this.runGit(
        ['remote', 'add', name, url],
        credentials.user,
        credentials.password,
        path,
      );
    }
  }

  private async createRemoteRepository(
    options: LocalGitProjectOptions,
    project: PundokEditorProject,
  ): Promise<boolean> {
    const remote = parseRepositoryUrl(options.url);
    if (!remote)
      throw new Error(`Unsupported Git repository URL: "${options.url}"`);
    if (remote.name !== project.name)
      throw new Error(
        `Remote repository "${remote.name}" must have the same name as project "${project.name}"`,
      );
    const endpoint =
      remote.host === 'github.com'
        ? 'https://api.github.com/user/repos'
        : `${remote.origin}/api/v1/user/repos`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'pundok-editor',
        Authorization: basicAuth(options.user, options.password),
      },
      body: JSON.stringify({
        name: remote.name,
        description: project.description,
        private: options.private ?? true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok && response.status !== 409)
      throw new Error(
        `Could not create remote repository "${remote.name}" (${response.status})`,
      );
    return response.status !== 409;
  }

  private async currentBranch(
    path: string,
    credentials: { user: string; password: string },
  ): Promise<string> {
    const result = await this.runGit(
      ['branch', '--show-current'],
      credentials.user,
      credentials.password,
      path,
    );
    const branch = result.output.trim();
    validateBranch(branch);
    return branch;
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
}

async function readProject(path: string): Promise<PundokEditorProject> {
  const filename = resolve(path, DEFAULT_PROJECT_FILENAME);
  await access(filename);
  const project = JSON.parse(
    await readFile(filename, 'utf8'),
  ) as PundokEditorProject;
  if (typeof project.name !== 'string')
    throw new Error(`${DEFAULT_PROJECT_FILENAME} must contain a project name`);
  return project;
}

async function repositoryMetadata(
  url: string,
  user: string,
  password: string,
): Promise<{ name: string; description: string }> {
  const parsed = parseRepositoryUrl(url);
  if (!parsed) throw new Error(`Unsupported Git repository URL: "${url}"`);
  try {
    const response = await fetch(
      parsed.host === 'github.com'
        ? `https://api.github.com/repos/${parsed.owner}/${parsed.name}`
        : `${parsed.origin}/api/v1/repos/${parsed.owner}/${parsed.name}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'pundok-editor',
          Authorization: basicAuth(user, password),
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.ok) {
      const value: unknown = await response.json();
      if (isRecord(value) && typeof value.name === 'string')
        return {
          name: safeProjectName(value.name),
          description:
            typeof value.description === 'string' ? value.description : '',
        };
    }
  } catch {
    // Git remains the source of truth if repository metadata is unavailable.
  }
  return { name: parsed.name, description: '' };
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
  return {
    host: parsed.host,
    origin: parsed.origin,
    owner: parts.at(-2)!,
    name: safeProjectName(parts.at(-1)!.replace(/\.git$/, '')),
  };
}

function validateCredentials(
  options: CloneGitProjectOptions | LocalGitProjectOptions,
): void {
  if (!options.user || !options.password || !options.url)
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

function safeProjectName(name: string): string {
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name))
    throw new Error(`Invalid repository name: "${name}"`);
  return name;
}

function basicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
}

function gitEnvironment(user: string, password: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraHeader',
    GIT_CONFIG_VALUE_0: `Authorization: ${basicAuth(user, password)}`,
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

function parseStatus(output: string): GitStatusEntry[] {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({
      indexStatus: line[0] || ' ',
      worktreeStatus: line[1] || ' ',
      path: line.slice(3),
    }));
}

async function remoteRepositories(
  url: string,
  user: string,
  password: string,
): Promise<Array<{ url: string }>> {
  const parsed = parseServerUrl(url);
  if (!parsed) throw new Error(`Unsupported Git server URL: "${url}"`);
  const endpoint =
    parsed.hostname === 'github.com'
      ? 'https://api.github.com/user/repos?per_page=100'
      : `${parsed.origin}/api/v1/user/repos?limit=50`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'pundok-editor',
      Authorization: basicAuth(user, password),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Could not list remote repositories (${response.status})`);
  const value: unknown = await response.json();
  if (!Array.isArray(value))
    throw new Error('Remote repository list is invalid');
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.clone_url !== 'string') return [];
    return [{ url: entry.clone_url }];
  });
}

function parseServerUrl(
  value: string,
): { origin: string; hostname: string } | undefined {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;
    return { origin: parsed.origin, hostname: parsed.hostname };
  } catch {
    return undefined;
  }
}
