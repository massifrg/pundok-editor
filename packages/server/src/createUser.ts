import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { isDocRepositories } from './common';
import { hashPassword, type UserRecord } from './auth';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{1,64}$/;

async function main() {
  const [usersFileArgument, username] = process.argv.slice(2);
  if (!usersFileArgument || !username || !USERNAME_PATTERN.test(username)) {
    throw new Error(
      'Usage: node packages/server/dist/create-user.mjs <users-file> <username>',
    );
  }

  const password = await readHiddenPassword();
  const usersFile = resolve(usersFileArgument);
  let users: UserRecord[] = [];
  try {
    const configuredUsers: unknown = JSON.parse(
      await readFile(usersFile, 'utf8'),
    );
    if (!Array.isArray(configuredUsers))
      throw new Error('The users file must contain a JSON array');
    users = configuredUsers.map((user): UserRecord => {
      if (
        !isRecord(user) ||
        typeof user.username !== 'string' ||
        typeof user.passwordHash !== 'string' ||
        (user.docRepositories !== undefined &&
          !isDocRepositories(user.docRepositories))
      ) {
        throw new Error('The users file contains an invalid user record');
      }
      return {
        username: user.username,
        passwordHash: user.passwordHash,
        docRepositories: user.docRepositories ?? [],
      };
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const existing = users.find((user) => user.username === username);
  const record: UserRecord = {
    username,
    passwordHash: await hashPassword(password),
    docRepositories: existing?.docRepositories ?? [],
  };
  const existingIndex = users.findIndex((user) => user.username === username);
  if (existingIndex >= 0) users[existingIndex] = record;
  else users.push(record);

  await mkdir(dirname(usersFile), { recursive: true });
  const temporaryFile = `${usersFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(users, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryFile, usersFile);
  console.log(`Saved credentials for ${username} in ${usersFile}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    return Promise.reject(
      new Error('Run this command in an interactive terminal'),
    );
  }
  return new Promise((resolvePassword, reject) => {
    let password = '';
    const stdin = process.stdin;
    const onData = (buffer: Buffer) => {
      for (const char of buffer.toString()) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Password entry cancelled'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolvePassword(password);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          password = password.slice(0, -1);
        } else if (char >= ' ') {
          password += char;
        }
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    process.stdout.write('Password (minimum 12 characters): ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
