import { describe, expect, it } from 'vitest';
import { runExternalProgram } from '../../packages/backend/src/runExternal';

describe('runExternalProgram', () => {
  it('appends additionalPath to PATH using the platform separator', async () => {
    const basePath = 'base-path';
    const additionalPath = 'additional-path';
    const result = await runExternalProgram(
      process.execPath,
      ['-e', 'process.stdout.write(process.env.PATH ?? "")'],
      {
        env: {
          PATH: basePath,
          additionalPath,
        },
      },
    ).result;

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe(
      `${basePath}${process.platform === 'win32' ? ';' : ':'}${additionalPath}`,
    );
  });

  it('does not pass additionalPath to the child process', async () => {
    const result = await runExternalProgram(
      process.execPath,
      ['-e', 'process.stdout.write(String(process.env.additionalPath))'],
      {
        env: { additionalPath: 'not-an-environment-variable' },
      },
    ).result;

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe('undefined');
  });
});
