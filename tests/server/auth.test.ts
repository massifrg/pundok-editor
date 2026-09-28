import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKEND_VALUE_DOC_REPOSITORIES } from '../../packages/common/src';
import { JwtAuthentication } from '../../packages/server/src/auth';

const passwordHash = `scrypt$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(64).toString('base64url')}`;

describe('JwtAuthentication user records', () => {
  let directory: string;
  let usersFile: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pundok-users-'));
    usersFile = join(directory, 'users.json');
    vi.stubEnv('USERS_FILE', usersFile);
    vi.stubEnv('JWT_SECRET', 'a sufficiently long test-only secret value');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  });

  async function writeUsers(users: unknown[]): Promise<void> {
    await writeFile(usersFile, JSON.stringify(users));
  }

  it('accepts records without the optional docRepositories field', async () => {
    await writeUsers([{ username: 'alice', passwordHash }]);

    const authentication = await JwtAuthentication.fromEnvironment();
    expect(authentication).toBeInstanceOf(JwtAuthentication);
    expect(
      authentication.getValue('alice', BACKEND_VALUE_DOC_REPOSITORIES),
    ).toEqual([]);
  });

  it('returns repository values for the requested user', async () => {
    const repositories = [
      {
        name: 'Documents',
        description: 'Project documents',
        url: 'https://example.org/documents.git',
        type: 'git',
        projects: [],
      },
    ];
    await writeUsers([
      { username: 'alice', passwordHash, docRepositories: repositories },
      { username: 'bob', passwordHash },
    ]);

    const authentication = await JwtAuthentication.fromEnvironment();
    expect(
      authentication.getValue('alice', BACKEND_VALUE_DOC_REPOSITORIES),
    ).toEqual(repositories);
    expect(
      authentication.getValue('bob', BACKEND_VALUE_DOC_REPOSITORIES),
    ).toEqual([]);
  });

  it('validates repository and project fields when supplied', async () => {
    await writeUsers([
      {
        username: 'alice',
        passwordHash,
        docRepositories: [
          {
            name: 'Documents',
            description: 'Project documents',
            url: 'https://example.org/documents.git',
            type: 'git',
            projects: [
              { name: 'Book', description: 'Manuscript', role: 'admin' },
              { name: 'Notes', description: 'Research notes', role: 'user' },
            ],
          },
        ],
      },
    ]);

    await expect(JwtAuthentication.fromEnvironment()).resolves.toBeInstanceOf(
      JwtAuthentication,
    );
  });

  it('rejects unsupported repository types and project roles', async () => {
    await writeUsers([
      {
        username: 'alice',
        passwordHash,
        docRepositories: [
          {
            name: 'Documents',
            description: 'Project documents',
            url: 'https://example.org/documents.git',
            type: 'svn',
            projects: [
              { name: 'Book', description: 'Manuscript', role: 'owner' },
            ],
          },
        ],
      },
    ]);

    await expect(JwtAuthentication.fromEnvironment()).rejects.toThrow(
      'USERS_FILE contains an invalid or duplicate user record',
    );
  });
});
