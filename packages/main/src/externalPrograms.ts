import { runExternalProgram } from '../../backend/src';
import type { SoftwareCheckResult } from '../../common/src';

interface RequiredProgram {
  name: string;
  executable: string;
  url: string;
}

const REQUIRED_PROGRAMS: RequiredProgram[] = [
  { name: 'Pandoc', executable: 'pandoc', url: 'https://pandoc.org' },
  { name: 'Git', executable: 'git', url: 'https://git-scm.com/install/' },
  {
    name: 'ImageMagick',
    executable: process.platform === 'win32' ? 'magick' : 'convert',
    url: 'https://imagemagick.org',
  },
  {
    name: 'ConTeXt',
    executable: 'context',
    url: 'https://wiki.contextgarden.net/Introduction/Installation',
  },
];

const simulatedMissingPrograms = new Set(
  (import.meta.env.VITE_MISSING_PROGRAMS || '')
    .split(',')
    .map((program) => program.trim())
    .filter(Boolean),
);

export async function checkRequiredPrograms(): Promise<SoftwareCheckResult> {
  const results = await Promise.all(
    REQUIRED_PROGRAMS.map(async (program) => {
      if (simulatedMissingPrograms.has(program.executable))
        return { program, result: undefined };
      try {
        const result = await runExternalProgram(program.executable, [
          '--version',
        ]).result;
        return { program, result };
      } catch {
        return { program, result: undefined };
      }
    }),
  );
  const missing = results
    .filter(({ result }) => !result || result.exitCode !== 0)
    .map(({ program }) => ({
      name: program.name,
      url: program.url,
    }));
  const available = results.flatMap(({ program, result }) =>
    result && result.exitCode === 0
      ? [
          {
            name: program.name,
            version: (result.output || result.error)
              .trim()
              .split(/\r?\n/, 1)[0],
            url: program.url,
          },
        ]
      : [],
  );

  return { missing, available };
}
