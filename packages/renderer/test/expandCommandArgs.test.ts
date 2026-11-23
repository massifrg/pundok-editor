import { describe, expect, it } from 'vitest';
import { expandCommandArgs } from '../src/components/helpers/expandCommandArgs';

describe('expandCommandArgs paths', () => {
  it.each([
    [
      '/home/alice/project/draft.md',
      ['draft.md', '/home/alice/project', '.md', 'draft', '/'],
    ],
    [
      '/Users/alice/project/draft.md',
      ['draft.md', '/Users/alice/project', '.md', 'draft', '/'],
    ],
    [
      'C:\\Users\\Alice\\project\\draft.md',
      ['draft.md', 'C:/Users/Alice/project', '.md', 'draft', 'C:/'],
    ],
    [
      '\\\\server\\share\\project\\draft.md',
      ['draft.md', '//server/share/project', '.md', 'draft', '//server/share/'],
    ],
  ])(
    'expands platform-specific document path variables for %s',
    (path, values) => {
      expect(
        expandCommandArgs(['%BASE%', '%DIR%', '%EXT%', '%NAME%', '%ROOT%'], {
          path,
        }),
      ).toEqual(values);
    },
  );

  it('preserves hidden-file names and recognizes no extension', () => {
    expect(
      expandCommandArgs(['%EXT%:%NAME%'], {
        path: '/project/.draft',
      }),
    ).toEqual([':.draft']);
  });

  it('expands file URLs using the same rules', () => {
    expect(
      expandCommandArgs(['%DIR%/%BASE%'], {
        path: 'file:///C:/project/draft%20copy.md',
      }),
    ).toEqual(['C:/project/draft copy.md']);
  });
});
