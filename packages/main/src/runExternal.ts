import {
  ChildProcessWithoutNullStreams,
  spawn,
  SpawnOptionsWithoutStdio,
} from 'node:child_process';
import { ExternalProgramResult } from './common';

export type ProgressCallback = (
  source: 'out' | 'err' | 'end',
  chunk: any,
) => void;

export interface ExternalProgram {
  childProcess: ChildProcessWithoutNullStreams;
  result: Promise<ExternalProgramResult>;
}

export function externalProgramError(
  err: unknown,
  commandLine?: string,
  output?: string,
  error?: string,
): ExternalProgramResult {
  return {
    exitCode: -1,
    commandLine: commandLine || '',
    output: output || '',
    error: (error ? `${error}\n` : '') + `${err}`,
  };
}

/**
 * Spawn an external program and collect stdout and stderr, unless a callback is defined.
 * @param path
 * @param args
 * @param options
 * @param callback
 * @param input
 * @returns
 */
export function runExternalProgram(
  path: string,
  args: string[],
  options?: SpawnOptionsWithoutStdio,
  callback?: ProgressCallback,
  input?: string,
): ExternalProgram {
  const commandLine = [path, ...args].join(' ');
  console.log(commandLine);
  const output: string[] = [];
  const error: string[] = [];
  const spawned = spawn(path, args, options);
  spawned.stdout.on('data', (chunk) => {
    if (callback) callback('out', chunk);
    else output.push(chunk.toString());
  });
  spawned.stderr.on('data', (chunk) => {
    if (callback) callback('err', chunk);
    else error.push(chunk.toString());
  });

  if (input) {
    spawned.stdin.write(input);
    spawned.stdin.end();
  }

  return {
    childProcess: spawned,
    result: new Promise((resolve, reject) => {
      spawned.on('close', (exitCode) => {
        resolve({
          commandLine,
          exitCode: exitCode || 0,
          output: output.join(''),
          error: error.join(''),
        });
      });
      spawned.on('error', (err) => {
        reject({
          commandLine,
          exitCode: -1,
          output: output.join(''),
          error: error.join('') + '\n' + err?.toString(),
        });
      });
    }),
  };
}
