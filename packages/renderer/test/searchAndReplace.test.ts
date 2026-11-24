import { describe, expect, it } from 'vitest';
import { EditorState } from '@tiptap/pm/state';
import type { AddableMark } from '../src/components/helpers/addableMark';
import { rangeHasAddableMark } from '../src/components/helpers/searchMarkFilter';
import { schema } from '../src/schema/helpers/PandocSchema';
import { cssSelect, validCssSelector } from '../src/schema/helpers/cssSelection';
import { SearchQuery } from '../src/schema/helpers/query';

const customStyle = (name: string): AddableMark => ({
  name,
  title: name,
  markspec: {
    kind: 'style',
    typeName: 'span',
    attrs: {
      customStyle: name,
      kv: { 'custom-style': name },
    },
  },
});

describe('search and replace mark filters', () => {
  it('recognizes custom styles despite additional span attributes', () => {
    const styledText = schema.text('excluded', [
      schema.marks.span.create({
        classes: ['extra-class'],
        kv: { 'custom-style': 'excluded' },
      }),
    ]);
    const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create(null, [
      styledText,
      schema.text(' excluded'),
    ])]);
    const state = EditorState.create({ schema, doc });
    const excluded = customStyle('excluded');
    const query = new SearchQuery({
      search: 'excluded',
      filterResult: (currentState, result) =>
        !rangeHasAddableMark(schema, currentState.doc, result.from, result.to, excluded),
    });

    expect(query.findNext(state)?.from).toBe(10);
  });
});

describe('CSS selector validation', () => {
  it('accepts selectors that parse successfully', () => {
    expect(validCssSelector('paragraph > emph')).toBe(true);
  });

  it('rejects selectors that do not compile', () => {
    expect(validCssSelector('paragraph > [')).toBe(false);
  });
});

describe('CSS selector name matching', () => {
  const doubleQuoted = schema.marks.doubleQuoted.create();
  const singleQuoted = schema.marks.singleQuoted.create();
  const emph = schema.marks.emph.create();
  const strong = schema.marks.strong.create();
  const span = schema.marks.span.create({
    customStyle: 'myStyle',
    kv: { 'custom-style': 'myStyle' },
  });
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.paragraph.create({ customStyle: 'myStyle' }, [
      schema.text('double', [doubleQuoted]),
      schema.text('single', [singleQuoted]),
      schema.text('emph', [emph]),
      schema.text('strong', [strong]),
      schema.text('styled', [span]),
      schema.nodes.hardBreak.create({ soft: false }),
      schema.nodes.hardBreak.create({ soft: true }),
    ]),
    schema.nodes.paragraph.create(null, schema.text(`starts 'single' and ends "double"`)),
    schema.nodes.paragraph.create(null, schema.text(`starts "double" and ends 'single'`)),
    schema.nodes.paragraph.create(null, schema.text('path/to/file')),
    schema.nodes.paragraph.create({ customStyle: "my'Style" }, schema.text('single-quoted style')),
    schema.nodes.paragraph.create({ customStyle: 'my"Style' }, schema.text('double-quoted style')),
    ...[1, 2, 3, 4, 5, 6].map((level) =>
      schema.nodes.heading.create({ level }, schema.text(`heading ${level}`)),
    ),
    schema.nodes.horizontalRule.create(),
  ]);
  const state = EditorState.create({ schema, doc });

  const selectionSignature = (selector: string) =>
    cssSelect(state, selector).map(({ name, from, to, node, mark }) => ({
      name,
      from,
      to,
      isNode: !!node,
      isMark: !!mark,
    }));

  it.each([
    ['paragraph', ['paragraph', 'Paragraph', 'PARAGRAPH', 'p', 'P', 'para', 'PARA']],
    ['heading', ['heading', 'Heading', 'HEADING', 'header', 'Header', 'HEADER']],
    ['h1', ['h1', 'H1']],
    ['h2', ['h2', 'H2']],
    ['h3', ['h3', 'H3']],
    ['h4', ['h4', 'H4']],
    ['h5', ['h5', 'H5']],
    ['h6', ['h6', 'H6']],
    ['horizontalRule', ['horizontalRule', 'HorizontalRule', 'HORIZONTALRULE', 'hr', 'HR']],
    ['hardBreak', ['hardBreak', 'HardBreak', 'HARDBREAK', 'br', 'BR']],
    ['linebreak', ['linebreak', 'LineBreak', 'LINEBREAK']],
    ['softbreak', ['softbreak', 'SoftBreak', 'SOFTBREAK']],
    ['doubleQuoted', ['doubleQuoted', 'DoubleQuoted', 'DOUBLEQUOTED', 'dq', 'DQ']],
    ['singleQuoted', ['singleQuoted', 'SingleQuoted', 'SINGLEQUOTED', 'sq', 'SQ']],
    ['emph', ['emph', 'Emph', 'EMPH', 'em', 'EM', 'i', 'I']],
    ['strong', ['strong', 'Strong', 'STRONG', 'b', 'B']],
    ['quoted', ['quoted', 'Quoted', 'QUOTED', 'q', 'Q']],
  ])('treats capitalization of %s and its aliases equivalently', (canonical, selectors) => {
    const expected = selectionSignature(canonical);
    for (const selector of selectors) {
      expect(selectionSignature(selector)).toEqual(expected);
    }
  });

  it.each([
    ['p', 'p[customStyle=myStyle]', 'p[custom-style=myStyle]'],
    ['span', 'span[customStyle=myStyle]', 'span[custom-style=myStyle]'],
  ])('treats camel-case and kebab-case %s attributes equivalently', (_type, camelCase, kebabCase) => {
    expect(selectionSignature(camelCase)).toEqual(selectionSignature(kebabCase));
  });

  it('matches custom styles with the :cs pseudo-class', () => {
    expect(selectionSignature('p:cs(myStyle)')).toEqual(
      selectionSignature('p[customStyle=myStyle]'),
    );
  });

  it.each([
    ["p:contains('starts \\'single\\'')", "starts 'single' and ends \"double\""],
    ['p:contains("ends \\"double\\"")', 'starts \'single\' and ends "double"'],
    ["p:text-starts-with('starts \\'single\\'')", "starts 'single' and ends \"double\""],
    ['p:text-starts-with("starts \\"double\\"")', 'starts "double" and ends \'single\''],
    ["p:text-ends-with('ends \\'single\\'')", 'starts "double" and ends \'single\''],
    ['p:text-ends-with("ends \\"double\\"")', "starts 'single' and ends \"double\""],
  ])('supports quoted and escaped text predicate arguments: %s', (selector, text) => {
    expect(cssSelect(state, selector).map((selected) => selected.node?.textContent)).toEqual([text]);
  });

  it.each([
    ['p:text-matches-regex(^starts)', [
      "starts 'single' and ends \"double\"",
      "starts \"double\" and ends 'single'",
    ]],
    ['p:text-matches-regex(/^starts/)', [
      "starts 'single' and ends \"double\"",
      "starts \"double\" and ends 'single'",
    ]],
    ['p:text-matches-regex(/path\\/to\\/file/)', 'path/to/file'],
  ])('supports optional slash delimiters for regex arguments: %s', (selector, texts) => {
    const expected = Array.isArray(texts) ? texts : [texts];
    expect(cssSelect(state, selector).map((selected) => selected.node?.textContent)).toEqual(expected);
  });

  it.each([
    ['p:cs(myStyle)', 'myStyle'],
    ['p:cs("myStyle")', 'myStyle'],
    ["p:cs('my\\'Style')", "my'Style"],
    ['p:cs("my\\"Style")', 'my"Style'],
  ])('supports quoted and escaped :cs arguments: %s', (selector, customStyle) => {
    expect(cssSelect(state, selector).map((selected) => selected.node?.attrs.customStyle)).toEqual([customStyle]);
  });
});
