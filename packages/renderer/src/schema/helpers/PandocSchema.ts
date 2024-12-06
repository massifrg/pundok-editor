import { Schema } from '@tiptap/pm/model';
import { LINE_BLOCK_CLASS, LINE_BLOCK_LINE_CLASS } from './lineBlock';
import {
  domToListNumberDelim,
  domToListNumberStyle,
  pandocListAttributesAsPMAttrs,
  pandocNumberDelimToHtmlClass,
  pandocNumberStyleToHtmlStyle,
} from './listAttributes';
import {
  domToMathType,
  mathTypeToHtmlAttributes,
  PANDOC_DEFAULT_MATH_TYPE,
} from './mathType';
import {
  getPandocAttr,
  pandocAttrAsPmAttrs,
  pmPandocAttrToHtmlAttrs,
} from './pandocAttr';
import { DOUBLE_QUOTED_CLASS, SINGLE_QUOTED_CLASS } from './quoted';
import { PmColSpec } from './colSpec';
import { DEFAULT_NOTE_TYPE } from '../../common';

/// Document schema for the data model used by Pandoc.
export const schema = new Schema({
  nodes: {
    doc: {
      content: 'metadata? block+',
    },

    metadata: {
      content: 'metaMap*',
      group: 'meta',
    },

    metaInlines: {
      content: 'inline*',
      group: 'meta',
    },

    metaBlocks: {
      content: 'block+',
      group: 'meta',
      isolating: true,
    },

    metaBool: {
      group: 'meta',
      atom: true,
      attrs: { value: { default: false } },
    },

    metaList: {
      content: 'meta*',
      group: 'meta',
      isolating: true,
    },

    metaMap: {
      content: 'meta',
      attrs: { text: { default: null } },
      group: 'meta',
    },

    paragraph: {
      content: 'inline*',
      group: 'block',
      attrs: { customStyle: { default: null } },
      parseDOM: [{ tag: 'p' }],
      toDOM() {
        return ['p', 0];
      },
    },

    plain: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'div.plain' }, { tag: 'span.plain' }],
      toDOM() {
        return ['span', { class: 'plain' }, 0];
      },
    },

    line: {
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [{ tag: `p.${LINE_BLOCK_LINE_CLASS}` }],
      toDOM() {
        return ['p', { class: LINE_BLOCK_LINE_CLASS }, 0];
      },
    },

    lineBlock: {
      content: 'line+',
      group: 'block',
      parseDOM: [{ tag: `div.${LINE_BLOCK_CLASS}` }],
      toDOM() {
        return ['div', { class: LINE_BLOCK_CLASS }, 0];
      },
    },

    codeBlock: {
      content: 'text*',
      group: 'block',
      code: true,
      defining: true,
      marks: '',
      attrs: {
        ...pandocAttrAsPmAttrs,
      },
      parseDOM: [
        {
          tag: 'pre',
          preserveWhitespace: 'full',
          getAttrs: (node) => getPandocAttr(node as HTMLElement),
        },
      ],
      toDOM(node) {
        return ['pre', pmPandocAttrToHtmlAttrs(node.attrs), ['code', 0]];
      },
    },

    rawBlock: {
      content: 'text*',
      group: 'block',
      code: true,
      atom: true,
      marks: '',
      attrs: { format: { default: '' } },
      parseDOM: [
        {
          tag: 'pre.raw-block',
          preserveWhitespace: 'full',
          getAttrs: (node) => ({
            format: (node as HTMLElement).getAttribute('data-format'),
          }),
        },
      ],
      toDOM(node) {
        return [
          'pre',
          { class: 'raw-block', 'data-format': node.attrs.format },
          ['code', 0],
        ];
      },
    },

    rawInline: {
      group: 'inline',
      code: true,
      inline: true,
      atom: true,
      marks: '',
      attrs: {
        format: { default: '' },
        text: { default: '' },
      },
      parseDOM: [
        {
          tag: 'samp.raw-inline',
          getAttrs: (node) => ({
            format: (node as HTMLElement).getAttribute('data-format'),
            text: (node as HTMLElement).textContent,
          }),
        },
      ],
      toDOM(node) {
        return [
          'samp',
          { class: 'raw-inline', 'data-format': node.attrs.format },
          node.attrs.text,
        ];
      },
    },

    blockquote: {
      content: 'block+',
      group: 'block',
      parseDOM: [{ tag: 'blockquote' }],
      toDOM() {
        return ['blockquote', 0];
      },
    },

    listItem: {
      content: 'block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM() {
        return ['li', 0];
      },
    },

    orderedList: {
      content: 'listItem+',
      group: 'block',
      attrs: { ...pandocListAttributesAsPMAttrs() },
      parseDOM: [
        {
          tag: 'ol',
          getAttrs(dom) {
            const e = dom as HTMLElement;
            return {
              start: e.hasAttribute('start') ? +e.getAttribute('start')! : 1,
              numberStyle: domToListNumberStyle(e),
              numberDelim: domToListNumberDelim(e),
            };
          },
        },
      ],
      toDOM(node) {
        return [
          'ol',
          {
            start: node.attrs.start == 1 ? null : node.attrs.start,
            class: pandocNumberDelimToHtmlClass(node.attrs.numberDelim),
            ...pandocNumberStyleToHtmlStyle(node.attrs.numberStyle),
          },
          0,
        ];
      },
    },

    bulletList: {
      content: 'listItem+',
      group: 'block',
      // attrs: { tight: { default: false } },
      parseDOM: [{ tag: 'ul' }],
      toDOM() {
        return ['ul', 0];
      },
    },

    definitionTerm: {
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [{ tag: 'dt' }],
      toDOM() {
        return ['dt', 0];
      },
    },

    definitionData: {
      content: 'block*',
      group: 'block',
      defining: true,
      parseDOM: [{ tag: 'dd' }],
      toDOM() {
        return ['dd', 0];
      },
    },

    definitionList: {
      content: '(definitionTerm definitionData+)+',
      group: 'block',
      parseDOM: [{ tag: 'dl' }],
      toDOM() {
        return ['dl', 0];
      },
    },

    heading: {
      attrs: {
        ...pandocAttrAsPmAttrs,
        level: {
          default: 1,
        },
      },
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [
        { tag: 'h1', attrs: { level: 1 } },
        { tag: 'h2', attrs: { level: 2 } },
        { tag: 'h3', attrs: { level: 3 } },
        { tag: 'h4', attrs: { level: 4 } },
        { tag: 'h5', attrs: { level: 5 } },
        { tag: 'h6', attrs: { level: 6 } },
      ],
      toDOM(node) {
        return ['h' + node.attrs.level, 0];
      },
    },

    horizontalRule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM() {
        return ['div', ['hr']];
      },
    },

    pandocTable: {
      content: 'caption? tableHead? tableBody* tableFoot?',
      isolating: true,
      group: 'block',
      tableRole: 'table',
      attrs: {
        ...pandocAttrAsPmAttrs,
        colSpec: {
          default: [] as PmColSpec[],
        },
      },
      parseDOM: [{ tag: 'table' }],
      toDOM() {
        return ['table', { class: 'pandoc-table' }, 0];
      },
    },

    caption: {
      content: 'block+',
      isolating: true,
      tableRole: 'caption',
      parseDOM: [{ tag: 'caption' }],
      toDOM() {
        return ['caption', { class: 'table-caption' }, 0];
      },
    },

    tableHead: {
      attrs: { ...pandocAttrAsPmAttrs },
      content: 'tableRow+',
      isolating: true,
      tableRole: 'head',
      parseDOM: [{ tag: 'thead' }],
      toDOM() {
        return ['thead', 0];
      },
    },

    tableBody: {
      attrs: {
        ...pandocAttrAsPmAttrs,
        headRows: { default: 0 },
        rowHeadColumns: { default: 0 },
      },
      content: 'tableRow+',
      isolating: true,
      tableRole: 'body',
      parseDOM: [{ tag: 'tbody' }],
      toDOM() {
        return ['tbody', 0];
      },
    },

    tableFoot: {
      attrs: { ...pandocAttrAsPmAttrs },
      content: 'tableRow+',
      isolating: true,
      tableRole: 'foot',
      parseDOM: [{ tag: 'tfoot' }],
      toDOM() {
        return ['tfoot', 0];
      },
    },

    tableRow: {
      attrs: { ...pandocAttrAsPmAttrs },
      content: '(tableCell | tableHeader)*',
      isolating: true,
      parseDOM: [{ tag: 'tr' }],
      toDOM() {
        return ['tr', 0];
      },
    },

    tableHeader: {
      attrs: {
        ...pandocAttrAsPmAttrs,
        colspan: {
          default: 1,
        },
        rowspan: {
          default: 1,
        },
        colwidth: {
          default: null,
        },
      },
      content: 'block+',
      isolating: true,
      parseDOM: [{ tag: 'th' }],
      toDOM() {
        return ['th', 0];
      },
    },

    tableCell: {
      attrs: {
        ...pandocAttrAsPmAttrs,
        colspan: {
          default: 1,
        },
        rowspan: {
          default: 1,
        },
        colwidth: {
          default: null,
        },
      },
      content: 'block+',
      isolating: true,
      parseDOM: [{ tag: 'td' }],
      toDOM() {
        return ['td', 0];
      },
    },

    div: {
      attrs: { ...pandocAttrAsPmAttrs },
      content: 'block+',
      group: 'block',
      parseDOM: [{ tag: 'div' }],
      toDOM() {
        return ['div', 0];
      },
    },

    pandocNull: {
      name: 'pandocNull',
      atom: true,
      group: 'block',
      parseDOM: [{ tag: 'div.pandoc-null' }],
      toDOM() {
        return ['div', 'pandoc-null', 'PANDOC NULL'];
      },
    },

    figure: {
      name: 'figure',
      content: 'figureCaption? block+',
      group: 'block',
      defining: true,
      attrs: { ...pandocAttrAsPmAttrs },
      parseDOM: [{ tag: 'div.figure' }],
      toDOM() {
        return ['div', 'figure'];
      },
    },

    figureCaption: {
      name: 'figureCaption',
      content: 'block+',
      isolating: true,
      parseDOM: [{ tag: 'div.figure-caption' }],
      toDOM() {
        return ['div', { class: 'figure-caption' }, 0];
      },
    },

    text: {
      group: 'inline',
    },

    image: {
      name: 'image',
      inline: true,
      group: 'inline',
      atom: true,
      content: 'inline*',
      draggable: true,
      isolating: true,
      attrs: {
        ...pandocAttrAsPmAttrs,
        src: { default: null },
        title: { default: null },
      },
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs(dom) {
            return {
              src: (dom as HTMLElement).getAttribute('src'),
              title: (dom as HTMLElement).getAttribute('title'),
            };
          },
        },
      ],
      toDOM(node) {
        return ['img', node.attrs];
      },
    },

    hardBreak: {
      attrs: { soft: { default: false } },
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br.soft' }],
      toDOM() {
        return ['br', { class: 'soft' }];
      },
    },

    note: {
      attrs: {
        ...pandocAttrAsPmAttrs,
        noteType: { default: DEFAULT_NOTE_TYPE },
      },
      inline: true,
      atom: true,
      group: 'inline',
      content: 'block+',
      parseDOM: [{ tag: 'note' }],
      toDOM: () => ['note', 0],
    },

    emptySpan: {
      attrs: { ...pandocAttrAsPmAttrs },
      group: 'inline',
      inline: true,
      isLeaf: true,
      draggable: true,
      marks: '',
      parseDOM: [
        {
          tag: 'span',
          getAttrs: (e) => ((e as HTMLElement).hasChildNodes() ? false : null),
        },
      ],
      toDOM: () => ['span'],
    },
  },

  marks: {
    link: {
      attrs: {
        ...pandocAttrAsPmAttrs,
        href: {},
        title: { default: null },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs(dom) {
            return {
              href: (dom as HTMLElement).getAttribute('href'),
              title: (dom as HTMLElement).getAttribute('title'),
            };
          },
        },
      ],
      toDOM(node) {
        return ['a', node.attrs];
      },
    },

    doubleQuoted: {
      parseDOM: [
        {
          tag: `q.${DOUBLE_QUOTED_CLASS}`,
        },
      ],
      toDOM: (node) => ['q', { class: DOUBLE_QUOTED_CLASS }],
    },

    singleQuoted: {
      parseDOM: [
        {
          tag: `q.${SINGLE_QUOTED_CLASS}`,
        },
      ],
      toDOM: (node) => ['q', { class: SINGLE_QUOTED_CLASS }],
    },

    span: {
      excludes: '',
      attrs: { ...pandocAttrAsPmAttrs },
      parseDOM: [
        {
          tag: 'span',
          getAttrs: (e) => ((e as HTMLElement).hasChildNodes() ? null : false),
        },
      ],
      toDOM() {
        return ['span', 0];
      },
    },

    emph: {
      parseDOM: [
        { tag: 'i' },
        { tag: 'em' },
        { style: 'font-style', getAttrs: (value) => value == 'italic' && null },
      ],
      toDOM() {
        return ['em'];
      },
    },

    underline: {
      parseDOM: [
        { tag: 'u' },
        {
          style: 'text-decoration',
          getAttrs: (value) => /^underline$/.test(value as string) && null,
        },
      ],
      toDOM() {
        return ['u'];
      },
    },

    strong: {
      parseDOM: [
        { tag: 'b' },
        { tag: 'strong' },
        {
          style: 'font-weight',
          getAttrs: (value) =>
            /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
        },
      ],
      toDOM() {
        return ['strong'];
      },
    },

    strikeout: {
      parseDOM: [
        { tag: 's' },
        {
          style: 'text-decoration',
          getAttrs: (value) => /^line-through$/.test(value as string) && null,
        },
      ],
      toDOM() {
        return ['s'];
      },
    },

    superscript: {
      parseDOM: [{ tag: 'sup' }],
      toDOM() {
        return ['sup'];
      },
    },

    subscript: {
      parseDOM: [{ tag: 'sub' }],
      toDOM() {
        return ['sub'];
      },
    },

    smallcaps: {
      parseDOM: [
        {
          style: 'font-variant',
          getAttrs: (value) => /^small-caps$/.test(value as string) && null,
        },
      ],
      toDOM() {
        return ['span', { style: 'font-variant: small-caps' }];
      },
    },

    cite: {
      attrs: { citations: { default: [] } },
      parseDOM: [{ tag: 'cite' }],
      toDOM() {
        return ['cite'];
      },
    },

    code: {
      attrs: { ...pandocAttrAsPmAttrs },
      excludes: '_',
      parseDOM: [{ tag: 'code' }],
      toDOM() {
        return ['code'];
      },
    },

    math: {
      attrs: { mathType: { default: PANDOC_DEFAULT_MATH_TYPE } },
      excludes: '_',
      parseDOM: [
        {
          tag: 'span.math',
          getAttrs: (e) => ({ quoteType: domToMathType(e as HTMLElement) }),
        },
      ],
      toDOM: (node) => {
        const htmlAttrs = mathTypeToHtmlAttributes(node.attrs.mathType) || {};
        if (htmlAttrs.class) htmlAttrs.class = `math ${htmlAttrs.class}`;
        return ['span', htmlAttrs];
      },
    },
  },
});
