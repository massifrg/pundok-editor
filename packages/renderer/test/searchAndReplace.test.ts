import { describe, expect, it } from 'vitest';
import { EditorState } from '@tiptap/pm/state';
import type { AddableMark } from '../src/components/helpers/addableMark';
import { rangeHasAddableMark } from '../src/components/helpers/searchMarkFilter';
import { schema } from '../src/schema/helpers/PandocSchema';
import { validCssSelector } from '../src/schema/helpers/cssSelection';
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
