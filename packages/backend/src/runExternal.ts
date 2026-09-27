import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';
import type { ExternalProgramResult } from '../../common/src';

export type ProgressCallback = (
  source: 'out' | 'err' | 'end',
  chunk: any,
) => void;

export interface ExternalProgram {
  childProcess: ChildProcessWithoutNullStreams;
  result: Promise<ExternalProgramResult>;
}

export function externalProgramError(
  error: unknown,
  commandLine = '',
  cwd = process.cwd(),
  output = '',
  programError = '',
): ExternalProgramResult {
  return {
    exitCode: -1,
    commandLine,
    cwd,
    output,
    error: (programError ? `${programError}\n` : '') + `${error}`,
  };
}

export function runExternalProgram(
  path: string,
  args: string[],
  options?: SpawnOptionsWithoutStdio,
  callback?: ProgressCallback,
  input?: string,
): ExternalProgram {
  const commandLine = [path, ...args].join(' ');
  const output: string[] = [];
  const error: string[] = [];
  const childProcess = spawn(path, args, options);
  childProcess.stdout.on('data', (chunk) => {
    if (callback) callback('out', chunk);
    else output.push(chunk.toString());
  });
  childProcess.stderr.on('data', (chunk) => {
    if (callback) callback('err', chunk);
    else error.push(chunk.toString());
  });
  if (input) {
    childProcess.stdin.write(input);
    childProcess.stdin.end();
  }

  return {
    childProcess,
    result: new Promise((resolve, reject) => {
      const cwd = options?.cwd?.toString() || process.cwd();
      childProcess.on('close', (exitCode) => {
        resolve({
          commandLine,
          cwd,
          exitCode: exitCode || 0,
          output: output.join(''),
          error: error.join(''),
        });
      });
      childProcess.on('error', (spawnError) => {
        reject({
          commandLine,
          cwd,
          exitCode: -1,
          output: output.join(''),
          error: error.join('') + '\n' + spawnError.toString(),
        });
      });
    }),
  };
}
