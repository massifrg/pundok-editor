export type GitRepositoryOperation = 'merge-main' | 'pull' | 'push';

export interface ClonedGitProject {
  name: string;
  description: string;
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
}
