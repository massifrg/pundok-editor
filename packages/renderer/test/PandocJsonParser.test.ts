// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  PandocJsonParser,
  PANDOC_JSON_PARSER_RULES,
  pandocJsonToPMNode,
  parseJsonFragmentToPMJson,
} from '../src/schema/helpers/PandocJsonParser';
import { nodeToPandocJsonString } from '../src/schema/helpers/PandocJsonExporter';
import { schema } from '../src/schema/helpers/PandocSchema';

const testsuite = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/testsuite.json'), 'utf8'),
);

function testsuiteCopy() {
  return JSON.parse(JSON.stringify(testsuite));
}

function documentWith(...blocks: any[]) {
  return pandocJsonToPMNode({
    'pandoc-api-version': [1, 23],
    meta: {},
    blocks,
  });
}

describe('PandocJsonParser', () => {
  it('parses the Pandoc native testsuite fixture', () => {
    const doc = pandocJsonToPMNode(testsuiteCopy());

    expect(doc.type.name).toBe('doc');
    expect(doc.childCount).toBeGreaterThan(1);
    expect(doc.firstChild?.type.name).toBe('metadata');
    expect(doc.firstChild?.firstChild?.type.name).toBe('metaMapEntry');
    expect(doc.firstChild?.firstChild?.firstChild?.type.name).toBe(
      'metaList',
    );
    expect(doc.textContent).toContain('This is a set of tests for pandoc.');
  });

  it('roundtrips the parsed ProseMirror document for the Pandoc fixture', () => {
    const doc = pandocJsonToPMNode(testsuiteCopy());
    const exported = JSON.parse(
      nodeToPandocJsonString(doc, {
        apiVersion: testsuite['pandoc-api-version'],
      }),
    );
    const reparsed = pandocJsonToPMNode(exported);

    expect(reparsed.toJSON()).toEqual(doc.toJSON());
  });

  it('parses paragraphs and merges adjacent text with the same marks', () => {
    const doc = documentWith({
      t: 'Para',
      c: [
        { t: 'Str', c: 'Hello' },
        { t: 'Space' },
        { t: 'Str', c: 'world' },
      ],
    });

    expect(doc.toJSON()).toEqual({
      type: 'doc',
      content: [
        {
          type: 'metadata',
        },
        {
          type: 'paragraph',
          attrs: { customStyle: null },
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    });
  });

  it('converts Pandoc inline marks into ProseMirror marks', () => {
    const doc = documentWith({
      t: 'Para',
      c: [
        {
          t: 'Strong',
          c: [
            { t: 'Str', c: 'strong' },
            {
              t: 'Emph',
              c: [{ t: 'Str', c: ' and emphasized' }],
            },
          ],
        },
      ],
    });

    expect(doc.toJSON().content?.[1]).toEqual({
      type: 'paragraph',
      attrs: { customStyle: null },
      content: [
        {
          type: 'text',
          text: 'strong',
          marks: [{ type: 'strong' }],
        },
        {
          type: 'text',
          text: ' and emphasized',
          marks: [{ type: 'emph' }, { type: 'strong' }],
        },
      ],
    });
  });

  it('parses quoted, code, math, and break inlines', () => {
    const doc = documentWith({
      t: 'Para',
      c: [
        {
          t: 'Quoted',
          c: [{ t: 'DoubleQuote' }, [{ t: 'Str', c: 'quoted' }]],
        },
        { t: 'Space' },
        { t: 'Code', c: [['', [], []], 'x + 1'] },
        { t: 'SoftBreak' },
        { t: 'Math', c: [{ t: 'InlineMath' }, 'x^2'] },
      ],
    });

    expect(doc.toJSON().content?.[1]).toEqual({
      type: 'paragraph',
      attrs: { customStyle: null },
      content: [
        {
          type: 'text',
          text: 'quoted',
          marks: [{ type: 'doubleQuoted' }],
        },
        {
          type: 'text',
          text: ' ',
        },
        {
          type: 'text',
          text: 'x + 1',
          marks: [
            {
              type: 'code',
              attrs: { id: '', classes: [], kv: {} },
            },
          ],
        },
        {
          type: 'hardBreak',
          attrs: { soft: true },
        },
        {
          type: 'text',
          text: 'x^2',
          marks: [{ type: 'math', attrs: { mathType: 'InlineMath' } }],
        },
      ],
    });
  });

  it('parses links, images, raw inlines, and line breaks', () => {
    const doc = documentWith({
      t: 'Para',
      c: [
        {
          t: 'Link',
          c: [
            ['', [], []],
            [{ t: 'Str', c: 'link' }],
            ['https://example.com', 'title'],
          ],
        },
        { t: 'LineBreak' },
        {
          t: 'Image',
          c: [
            ['', [], []],
            [{ t: 'Str', c: 'alt' }],
            ['image.png', 'image title'],
          ],
        },
        { t: 'RawInline', c: ['html', '<b>raw</b>'] },
      ],
    });

    expect(doc.toJSON().content?.[1]).toEqual({
      type: 'paragraph',
      attrs: { customStyle: null },
      content: [
        {
          type: 'text',
          text: 'link',
          marks: [
            {
              type: 'link',
              attrs: {
                id: '',
                classes: [],
                kv: {},
                href: 'https://example.com',
                title: 'title',
              },
            },
          ],
        },
        { type: 'hardBreak', attrs: { soft: false } },
        {
          type: 'image',
          attrs: {
            id: '',
            classes: [],
            kv: {},
            src: 'image.png',
            title: 'image title',
          },
          content: [{ type: 'text', text: 'alt' }],
        },
        {
          type: 'rawInline',
          attrs: { format: 'html', text: '<b>raw</b>' },
        },
      ],
    });
  });

  it('parses headings, block quotes, lists, and code blocks', () => {
    const doc = documentWith(
      {
        t: 'Header',
        c: [2, ['', ['title'], [['id', 'heading']]], [{ t: 'Str', c: 'Title' }]],
      },
      {
        t: 'BlockQuote',
        c: [{ t: 'Para', c: [{ t: 'Str', c: 'Quoted block' }] }],
      },
      {
        t: 'BulletList',
        c: [
          [{ t: 'Plain', c: [{ t: 'Str', c: 'one' }] }],
          [{ t: 'Plain', c: [{ t: 'Str', c: 'two' }] }],
        ],
      },
      {
        t: 'CodeBlock',
        c: [['', ['javascript'], []], 'const x = 1;'],
      },
    );

    expect(doc.toJSON().content?.slice(1)).toEqual([
      {
        type: 'heading',
        attrs: {
          level: 2,
          id: '',
          classes: ['title'],
          kv: { id: 'heading' },
        },
        content: [{ type: 'text', text: 'Title' }],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            attrs: { customStyle: null },
            content: [{ type: 'text', text: 'Quoted block' }],
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'plain',
                content: [{ type: 'text', text: 'one' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'plain',
                content: [{ type: 'text', text: 'two' }],
              },
            ],
          },
        ],
      },
      {
        type: 'codeBlock',
        attrs: {
          id: '',
          classes: ['javascript'],
          kv: {},
        },
        content: [{ type: 'text', text: 'const x = 1;' }],
      },
    ]);
  });

  it('applies custom paragraph styles from a custom-style Div', () => {
    const doc = documentWith({
      t: 'Div',
      c: [
        ['', [], [['custom-style', 'Quote']]],
        [{ t: 'Para', c: [{ t: 'Str', c: 'styled' }] }],
      ],
    });

    expect(doc.toJSON().content?.[1]).toEqual({
      type: 'paragraph',
      attrs: { customStyle: 'Quote' },
      content: [{ type: 'text', text: 'styled' }],
    });
  });

  it('maps Pandoc ordered-list attributes and note blocks', () => {
    const doc = documentWith(
      {
        t: 'OrderedList',
        c: [
          [3, { t: 'LowerAlpha' }, { t: 'OneParen' }],
          [[{ t: 'Plain', c: [{ t: 'Str', c: 'item' }] }]],
        ],
      },
      {
        t: 'Para',
        c: [
          { t: 'Str', c: 'before' },
          {
            t: 'Note',
            c: [{ t: 'Para', c: [{ t: 'Str', c: 'note text' }] }],
          },
        ],
      },
    );

    expect(doc.toJSON().content?.slice(1)).toEqual([
      {
        type: 'orderedList',
        attrs: { start: 3, numberStyle: 'LowerAlpha', numberDelim: 'OneParen' },
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'plain',
                content: [{ type: 'text', text: 'item' }],
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { customStyle: null },
        content: [
          { type: 'text', text: 'before' },
          {
            type: 'note',
            attrs: {
              id: '',
              classes: [],
              kv: { 'note-type': 'footnote' },
              noteType: 'footnote',
            },
            content: [
              {
                type: 'paragraph',
                attrs: { customStyle: null },
                content: [{ type: 'text', text: 'note text' }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('parses metadata values and preserves metadata keys', () => {
    const doc = pandocJsonToPMNode({
      'pandoc-api-version': [1, 23],
      meta: {
        title: { t: 'MetaInlines', c: [{ t: 'Str', c: 'Document title' }] },
        draft: { t: 'MetaBool', c: true },
        keywords: {
          t: 'MetaList',
          c: [{ t: 'MetaString', c: 'one' }, { t: 'MetaString', c: 'two' }],
        },
      },
      blocks: [{ t: 'Para', c: [{ t: 'Str', c: 'body' }] }],
    });

    expect(doc.toJSON().content?.[0]).toEqual({
      type: 'metadata',
      content: [
        {
          type: 'metaMapEntry',
          attrs: { text: 'title' },
          content: [
            {
              type: 'metaInlines',
              content: [{ type: 'text', text: 'Document title' }],
            },
          ],
        },
        {
          type: 'metaMapEntry',
          attrs: { text: 'draft' },
          content: [{ type: 'metaBool', attrs: { value: 'True' } }],
        },
        {
          type: 'metaMapEntry',
          attrs: { text: 'keywords' },
          content: [
            {
              type: 'metaList',
              content: [
                {
                  type: 'metaString',
                  content: [{ type: 'text', text: 'one' }],
                },
                {
                  type: 'metaString',
                  content: [{ type: 'text', text: 'two' }],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('parses fragments as a single block and returns its last child', () => {
    const fragment = parseJsonFragmentToPMJson([
      { t: 'Str', c: 'hello' },
      { t: 'Space' },
      { t: 'Str', c: 'fragment' },
    ]);

    expect(fragment?.toJSON()).toEqual({
      type: 'plain',
      content: [{ type: 'text', text: 'hello fragment' }],
    });
  });

  it('returns null for unsupported Pandoc item types', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(
      new PandocJsonParser(schema, PANDOC_JSON_PARSER_RULES).parse({
        'pandoc-api-version': [1, 23],
        meta: {},
        blocks: [{ t: 'UnsupportedBlock', c: [] }],
      }),
    ).toBeNull();

    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
