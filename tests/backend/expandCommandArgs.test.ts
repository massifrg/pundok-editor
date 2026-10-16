import { join, parse, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandCommandArgs } from '../../packages/backend/src/expandCommandArgs';

describe('expandCommandArgs', () => {
  it('leaves arguments unchanged without an environment', () => {
    const args = ['--output=%NAME%.html', '%PROJECT_NAME%'];

    expect(expandCommandArgs(args)).toEqual(args);
  });

  it('expands all source path placeholders, including repeated placeholders', () => {
    const path = join(sep, 'tmp', 'pundok', 'chapter.one.md');
    const file = parse(path);

    expect(
      expandCommandArgs(
        [
          '%BASE%',
          '%DIR%',
          '%EXT%',
          '%NAME%',
          '%ROOT%',
          '%SEP%',
          '%NAME%-%NAME%',
          '--output=%DIR%%SEP%%NAME%.html',
        ],
        { path },
      ),
    ).toEqual([
      file.base,
      file.dir,
      file.ext,
      file.name,
      file.root,
      sep,
      `${file.name}-${file.name}`,
      `--output=${file.dir}${sep}${file.name}.html`,
    ]);
  });

  it('expands project placeholders alongside source path placeholders', () => {
    expect(
      expandCommandArgs(
        ['%PROJECT_NAME%', '%PROJECT_ROOT_DOC%', '%NAME%'],
        {
          path: join(sep, 'tmp', 'pundok', 'chapter.md'),
          project: {
            name: 'Book',
            path: join(sep, 'tmp', 'pundok'),
            rootDocument: 'book.md',
            editorConfig: {},
          },
        },
      ),
    ).toEqual(['Book', 'book.md', 'chapter']);
  });

  it('leaves unknown placeholders unchanged', () => {
    expect(
      expandCommandArgs(['%UNKNOWN%', '%NAME%'], {
        path: join(sep, 'tmp', 'pundok', 'chapter.md'),
      }),
    ).toEqual(['%UNKNOWN%', 'chapter']);
  });
});
