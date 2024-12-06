export interface PandocJson {
  t: string;
  c?: any;
  p?: PandocJson;
}

export function isPandocJsonBlock(json: PandocJson): boolean {
  return PANDOC_BLOCKS.includes(json.t);
}
export function isPandocJsonInline(json: PandocJson): boolean {
  return PANDOC_INLINES.includes(json.t);
}

// export const DEFAULT_PANDOC_API_VERSION: number[] = [1, 22, 2, 1];
export const DEFAULT_PANDOC_API_VERSION: number[] = [1, 23];

export interface PandocJsonDocument {
  meta: Record<string, PandocJson>;
  'pandoc-api-version': number[];
  blocks: PandocJson[];
}

import type {
  Pandoc,
  PandocItem,
  Attr,
  LineBlock,
  OrderedList,
  BulletList,
  DefinitionList,
  Cite,
  Citation,
  Cell,
  Row,
  TableHead,
  TableFoot,
  TableBody,
  Table,
  Caption,
  Meta,
  MetaValue,
  MetaMap,
} from './PandocModel';
import { PANDOC_BLOCKS, PANDOC_INLINES } from './PandocModel';
import { isPandocDocument } from './PandocModel';

interface PandocItemWithContent extends PandocItem {
  name: string;
  content: PandocItem[];
}

// const PANDOC_API_VERSION_DEFAULT: number[] = [1, 22, 2, 1];
const PANDOC_API_VERSION_DEFAULT: number[] = [1, 23];

export function pandocToJson(
  doc: Pandoc,
  apiVersion?: number[]
): PandocJsonDocument {
  return {
    'pandoc-api-version': apiVersion || PANDOC_API_VERSION_DEFAULT,
    meta: metadataToJson(doc.meta),
    blocks: arrayToJson(doc.content),
  };
}

export function toJson(item: PandocItem): PandocJson | PandocJsonDocument {
  if (item.properties.includes('meta')) {
    return pandocToJson(item as Pandoc);
  }
  switch (item.name) {
    case 'Str':
    case 'MetaString':
      return {
        t: item.name,
        c: item.text,
      };
    case 'Plain':
    case 'Para':
    case 'BlockQuote':
    case 'Emph':
    case 'Underline':
    case 'Strong':
    case 'Strikeout':
    case 'Superscript':
    case 'Subscript':
    case 'SmallCaps':
    case 'Note':
    case 'MetaBlocks':
    case 'MetaInlines':
      return itemWithOnlyContentToJson(item);
    case 'HorizontalRule':
    case 'Null':
    case 'Space':
    case 'SoftBreak':
    case 'LineBreak':
      return { t: item.name };
    case 'Div':
    case 'Span':
      return {
        t: item.name,
        c: [attrToJson(item.attr), arrayToJson(item.content)],
      };
    case 'Figure':
      return {
        t: item.name,
        c: [
          attrToJson(item.attr),
          captionToJson(item.caption),
          arrayToJson(item.content),
        ],
      };
    case 'CodeBlock':
    case 'Code':
      return {
        t: item.name,
        c: [attrToJson(item.attr), item.text],
      };
    case 'LineBlock':
      return {
        t: item.name,
        c: (item as LineBlock).lines.map((line) => arrayToJson(line)),
      };
    case 'OrderedList': {
      const la = item.listAttributes;
      return {
        t: item.name,
        c: [
          [la.startNumber, { t: la.numberStyle }, { t: la.numberDelim }],
          (item as OrderedList).items.map((listItem) => arrayToJson(listItem)),
        ],
      };
    }
    case 'BulletList':
      return {
        t: item.name,
        c: (item as BulletList).items.map((listItem) => arrayToJson(listItem)),
      };
    case 'DefinitionList':
      return {
        t: item.name,
        c: (item as DefinitionList).items.map((listItem) => [
          arrayToJson(listItem.term),
          listItem.definitions.map((d) => arrayToJson(d)),
        ]),
      };
    case 'RawBlock':
    case 'RawInline':
      return {
        t: item.name,
        c: [item.format, item.text],
      };
    case 'Header':
      return {
        t: item.name,
        c: [item.level, attrToJson(item.attr), arrayToJson(item.content)],
      };
    case 'Quoted':
      return {
        t: item.name,
        c: [{ t: item.quoteType }, arrayToJson(item.content)],
      };
    case 'Math':
      return {
        t: item.name,
        c: [{ t: item.mathType }, item.text],
      };
    case 'Link':
    case 'Image':
      return {
        t: item.name,
        c: [
          attrToJson(item.attr),
          arrayToJson(item.alt),
          [item.target.url, item.target.title],
        ],
      };
    case 'Table':
      return {
        t: item.name,
        c: [
          attrToJson(item.attr),
          captionToJson(item.caption),
          (item as Table).cols.map((cs) => [
            { t: cs.alignment },
            cs.colWidth === 0
              ? { t: 'ColWidthDefault' }
              : { t: 'ColWidth', c: cs.colWidth },
          ]),
          tableBlockToJson(item.head),
          (item as Table).body.map((b) => tableBodyToJson(b)),
          tableBlockToJson(item.foot),
        ],
      };
    case 'Cite':
      return {
        t: item.name,
        c: [
          (item as Cite).citations.map((c) => citationToJson(c)),
          arrayToJson(item.content),
        ],
      };
    case 'MetaBool':
      return {
        t: item.name,
        c: item.value ? true : false,
      };
    case 'MetaList':
      return {
        t: item.name,
        c: (item.items as MetaValue[]).map((i) => toJson(i)),
      };
    case 'MetaMap':
      return {
        t: item.name,
        c: {
          [item.key]: toJson((item as MetaMap).metaValue),
        },
      };
    default:
  }
  throw new Error(`Object ${JSON.stringify(item)} not known`);
}

export function toJsonString(pdoc: PandocItem, apiVersion?: number[]): string {
  return JSON.stringify(
    isPandocDocument(pdoc)
      ? pandocToJson(pdoc as Pandoc, apiVersion)
      : toJson(pdoc)
  );
}

function arrayToJson(items: PandocItem[]): PandocJson[] {
  return items.map((i) => toJson(i) as PandocJson);
}

function metadataToJson(meta: Meta): Record<string, PandocJson> {
  const entries = meta.metadata.map((m) => [m.key, toJson(m.metaValue)]);
  return Object.fromEntries(entries);
}

function itemWithOnlyContentToJson(item: PandocItem): PandocJson {
  const i = item as PandocItemWithContent;
  return {
    t: i.name,
    c: arrayToJson(i.content),
  };
}

function attrToJson(attr: Attr) {
  return [
    attr.id || '',
    attr.classes || [],
    Object.entries(attr.attributes || {}),
  ];
}

function citationToJson(c: Citation) {
  return {
    citationId: c.citationId,
    citationPrefix: arrayToJson(c.citationPrefix),
    citationSuffix: arrayToJson(c.citationSuffix),
    citationMode: { t: c.citationMode },
    citationNoteNum: c.citationNoteNum,
    citationHash: c.citationHash,
  };
}

function captionToJson(caption: Caption) {
  return [
    caption.short ? arrayToJson(caption.short) : null,
    arrayToJson(caption.content),
  ];
}

function tableBlockToJson(block: TableHead | TableFoot) {
  return [attrToJson(block.attr), block.rows.map((r) => tableRowToJson(r))];
}

function tableBodyToJson(body: TableBody) {
  return [
    attrToJson(body.attr),
    body.rowHeadColumns,
    body.headers.map((r) => tableRowToJson(r)),
    body.rows.map((r) => tableRowToJson(r)),
  ];
}

function tableRowToJson(row: Row) {
  return [attrToJson(row.attr), row.cells.map((c) => tableCellToJson(c))];
}

function tableCellToJson(cell: Cell) {
  return [
    attrToJson(cell.attr),
    { t: cell.alignment },
    cell.rowspan,
    cell.colspan,
    arrayToJson(cell.content),
  ];
}
