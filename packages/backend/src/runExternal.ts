import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';
import { delimiter } from 'node:path';
import type { ExternalProgramResult } from '../../common/src';
import {
  registerRenderingProcess,
  unregisterRenderingProcess,
} from './renderingProcess';

export type ExternalProgramEnvironment = NodeJS.ProcessEnv & {
  /**
   * Paths to append to PATH for this process. This is consumed before spawn
   * and is not passed through as a child-process environment variable.
   */
  additionalPath?: string;
};

export type ExternalProgramOptions = Omit<
  SpawnOptionsWithoutStdio,
  'env'
> & {
  env?: ExternalProgramEnvironment;
};

export type ProgressCallback = (
  source: 'out' | 'err' | 'end',
  chunk: any,
) => void;

export interface ExternalProgramRegistration {
  key?: string;
}

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
  options?: ExternalProgramOptions,
  callback?: ProgressCallback,
  input?: string,
  registration?: ExternalProgramRegistration,
): ExternalProgram {
  const commandLine = [path, ...args].join(' ');
  const output: string[] = [];
  const error: string[] = [];
  const spawnOptions = extendEnvironment(options);
  const childProcess = spawn(
    path,
    args,
    registration?.key ? { ...spawnOptions, detached: true } : spawnOptions,
  );
  if (registration?.key) registerRenderingProcess(registration.key, childProcess);
  childProcess.stdout.on('data', (chunk) => {
    if (callback) callback('out', chunk);
    output.push(chunk.toString());
  });
  childProcess.stderr.on('data', (chunk) => {
    if (callback) callback('err', chunk);
    error.push(chunk.toString());
  });
  childProcess.stdin.on('error', (stdinError) => {
    if ((stdinError as NodeJS.ErrnoException).code !== 'EPIPE') {
      error.push(stdinError.toString());
    }
  });
  if (input) {
    childProcess.stdin.end(input);
  }

  return {
    childProcess,
    result: new Promise((resolve, reject) => {
      const cwd = options?.cwd?.toString() || process.cwd();
      childProcess.on('close', (exitCode) => {
        if (registration?.key)
          unregisterRenderingProcess(registration.key, childProcess);
        resolve({
          commandLine,
          cwd,
          exitCode: exitCode ?? -1,
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

function extendEnvironment(
  options?: ExternalProgramOptions,
): SpawnOptionsWithoutStdio | undefined {
  const additionalPath = options?.env?.additionalPath;
  if (!options || additionalPath === undefined) return options;

  const env = { ...options.env };
  delete env.additionalPath;
  if (!additionalPath) return { ...options, env };

  const pathName =
    Object.keys(env).find((name) => name.toUpperCase() === 'PATH') || 'PATH';
  const currentPath = env[pathName];
  if (
    currentPath === additionalPath ||
    currentPath?.endsWith(`${delimiter}${additionalPath}`)
  ) {
    return { ...options, env };
  }
  env[pathName] = currentPath
    ? `${currentPath}${delimiter}${additionalPath}`
    : additionalPath;

  return { ...options, env };
}
