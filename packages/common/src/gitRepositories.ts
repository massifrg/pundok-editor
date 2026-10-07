export interface ClonedGitProject {
  name: string;
  description: string;
  path: string;
  url: string;
  user: string;
  type: 'git';
  typeOptions: {
    branch: string;
  };
}

export interface CloneGitProjectOptions {
  url: string;
  user: string;
  password: string;
  branch?: string;
  destination?: string;
}

export interface LocalGitProjectOptions {
  projectPath: string;
  url: string;
  user: string;
  password: string;
  remoteName?: string;
  private?: boolean;
}

export interface GitStatusEntry {
  path: string;
  indexStatus: string;
  worktreeStatus: string;
}

export interface GitProjectStatus {
  managed: boolean;
  branch?: string;
  files: GitStatusEntry[];
}

export interface GitCommitOptions {
  projectPath: string;
  message: string;
  paths?: string[];
}
