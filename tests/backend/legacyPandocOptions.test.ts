import { describe, expect, it } from 'vitest';
import { migrateLegacyPandocOptions } from '../../packages/backend/src/legacyPandocOptions';

describe('migrateLegacyPandocOptions', () => {
  it('converts legacy Pandoc command-line arguments to option tuples', () => {
    expect(
      migrateLegacyPandocOptions([
        '--wrap=none',
        '-V',
        'include_sub_meta',
        '--variable',
        'include_sub_meta=1',
        '--template templates/myhtml.html',
        '--variable=cssfile:mycss.css',
      ]),
    ).toEqual([
      ['wrap', 'none'],
      ['V', 'include_sub_meta'],
      ['variable', 'include_sub_meta=1'],
      ['template', 'templates/myhtml.html'],
      ['variable', 'cssfile:mycss.css'],
    ]);
  });

  it('rejects malformed legacy arguments', () => {
    expect(() => migrateLegacyPandocOptions(['--not-an-option'])).toThrow(
      'Unknown Pandoc option "not-an-option"',
    );
  });
});
