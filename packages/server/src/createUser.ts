import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { hashPassword } from './auth';

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
  let users: Array<{ username: string; passwordHash: string }> = [];
  try {
    users = JSON.parse(await readFile(usersFile, 'utf8'));
    if (!Array.isArray(users))
      throw new Error('The users file must contain a JSON array');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const record = { username, passwordHash: await hashPassword(password) };
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
