import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createBackendDirectories,
  GitRepositoryManager,
} from '../../packages/backend/src';

const execFile = promisify(execFileCallback);

describe('GitRepositoryManager', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pundok-git-repositories-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.each(['ours', 'theirs'] as const)(
    'aborts an in-progress merge before merging with -X %s',
    async (strategy) => {
      const repository = await createConflictingRepository(root);
      const manager = new GitRepositoryManager(createBackendDirectories(root));

      const check = await manager.checkMerge(repository, 'origin/theirs');
      expect(check.mergeable).toBe(false);

      await expect(
        git(repository, ['merge', 'origin/theirs']),
      ).rejects.toBeDefined();
      await manager.merge(repository, 'origin/theirs', strategy);

      expect(await readFile(join(repository, 'file.txt'), 'utf8')).toBe(
        strategy === 'ours' ? 'ours\n' : 'theirs\n',
      );
      expect((await git(repository, ['status', '--porcelain=v1'])).stdout).toBe(
        '',
      );
      await expect(
        git(repository, ['rev-parse', '--verify', 'MERGE_HEAD']),
      ).rejects.toBeDefined();
    },
  );
});

async function createConflictingRepository(root: string): Promise<string> {
  const remote = join(root, 'remote.git');
  const seed = join(root, 'seed');
  const repository = join(root, 'repository');
  await git(root, ['init', '--bare', '-b', 'main', remote]);
  await git(root, ['init', '-b', 'main', seed]);
  await configureGit(seed);
  await writeFile(join(seed, 'file.txt'), 'base\n');
  await git(seed, ['add', 'file.txt']);
  await git(seed, ['commit', '-m', 'base']);
  await git(seed, ['remote', 'add', 'origin', remote]);
  await git(seed, ['push', '-u', 'origin', 'main']);
  await git(root, ['clone', remote, repository]);
  await configureGit(repository);

  await git(repository, ['checkout', '-b', 'theirs']);
  await writeFile(join(repository, 'file.txt'), 'theirs\n');
  await git(repository, ['commit', '-am', 'theirs']);
  await git(repository, ['push', '-u', 'origin', 'theirs']);
  await git(repository, ['checkout', 'main']);
  await writeFile(join(repository, 'file.txt'), 'ours\n');
  await git(repository, ['commit', '-am', 'ours']);
  await git(repository, ['push', 'origin', 'main']);
  await git(repository, ['fetch', 'origin']);
  return repository;
}

async function configureGit(repository: string): Promise<void> {
  await git(repository, ['config', 'user.name', 'Test User']);
  await git(repository, ['config', 'user.email', 'test@example.com']);
}

function git(cwd: string, args: string[]) {
  return execFile('git', args, { cwd });
}
