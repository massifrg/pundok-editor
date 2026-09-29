import { describe, expect, it } from 'vitest';
import { PANDOC_OPTIONS } from '../src/pandocOptions';

const optionByLongName = (name: string) =>
  PANDOC_OPTIONS.find((option) => option.name.includes(name));

describe('PANDOC_OPTIONS', () => {
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
});
