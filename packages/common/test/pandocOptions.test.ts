import { describe, expect, it } from 'vitest';
import {
  PANDOC_OPTIONS_SPECS,
  pandocOptionsToCliOptions,
} from '../src/pandocOptions';
import { PANDOC_EXTENSION_DESCRIPTIONS } from '../src/pandocExtensions';
import { pandocFilterToCliOptions } from '../src/pandoc';

const optionByLongName = (name: string) =>
  PANDOC_OPTIONS_SPECS.find((option) => option.name.includes(name));

describe('PANDOC_OPTIONS_SPECS', () => {
  it('includes the documented Pandoc 3 option families', () => {
    for (const name of [
      'completion',
      'sandbox',
      'base-header-level',
      'typst-input',
      'variable-json',
      'syntax-highlighting',
      'self-contained',
      'citeproc',
      'math-method',
      'epub-chapter-level',
      'dump-args',
    ]) {
      expect(optionByLongName(name)).toBeDefined();
    }
  });

  describe('pandocFilterToCliOptions', () => {
    it('can produce an argv-safe filter path without shell quotes', () => {
      expect(
        pandocFilterToCliOptions('filter', '/tmp/filter with spaces.lua', false),
      ).toEqual(['--lua-filter=/tmp/filter with spaces.lua']);
    });
  });

  describe('PANDOC_EXTENSION_DESCRIPTIONS', () => {
    it('describes extensions returned by Pandoc', () => {
      expect(PANDOC_EXTENSION_DESCRIPTIONS).toMatchObject({
        footnotes: expect.any(String),
        smart: expect.any(String),
        yaml_metadata_block: expect.any(String),
      });
    });
  });

  it('uses canonical option names and value types', () => {
    expect(optionByLongName('reference-links')).toMatchObject({
      name: ['reference-links'],
      valueType: 'boolean',
    });
    expect(optionByLongName('markdown-headings')).toMatchObject({
      name: ['markdown-headings'],
      valueType: 'setext|atx',
    });
    expect(optionByLongName('math-method')).toMatchObject({
      valueType: 'plain|mathjax[:URL]|mathml|webtex[:URL]|katex[:URL]|gladtex',
    });
    expect(optionByLongName('pdf-engine-opt')).toMatchObject({
      valueType: 'STRING',
      multiple: true,
    });
  });

  it('marks documented repeatable options as multiple', () => {
    for (const name of [
      'defaults',
      'metadata-file',
      'variable',
      'syntax-definition',
      'include-in-header',
      'css',
      'epub-embed-font',
      'bibliography',
    ]) {
      expect(optionByLongName(name)).toMatchObject({ multiple: true });
    }
  });

  it('marks options documented as deprecated', () => {
    for (const name of [
      'base-header-level',
      'self-contained',
      'epub-chapter-level',
      'mathjax',
      'mathml',
      'webtex',
      'katex',
      'gladtex',
    ]) {
      expect(optionByLongName(name)).toMatchObject({ deprecated: true });
    }
  });

  it('serializes flags, booleans, numbers, and string values', () => {
    expect(
      pandocOptionsToCliOptions([
        ['standalone'],
        ['fail-if-warnings', true],
        ['toc-depth', 2],
        ['metadata', 'title=A title'],
        ['V', 'include_sub_meta'],
        ['variable', 'include_sub_meta'],
      ]),
    ).toEqual([
      '--standalone',
      '--fail-if-warnings=true',
      '--toc-depth=2',
      '--metadata=title=A title',
      '-V',
      'include_sub_meta',
      '--variable=include_sub_meta',
    ]);
  });

  it('rejects values that do not match the option specification', () => {
    expect(() => pandocOptionsToCliOptions([['toc-depth', false]])).toThrow(
      'does not accept a boolean value',
    );
    expect(() => pandocOptionsToCliOptions([['toc-depth']])).toThrow(
      'requires a value',
    );
  });
});
