import { isObject } from 'lodash';
import {
  PandocJson,
  PandocJsonDocument,
  DEFAULT_PANDOC_API_VERSION,
} from './PandocJson';

type TagsPair = [open: string, close: string];

type Attr = [
  id: string,
  classes: string[],
  attributes: [key: string, value: string][]
];

const escapeAmpersandLtGt = (text: string) =>
  text.replace(/\&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeDblquotes = (text: string) => text.replace(/"/g, '&quot;');

function tagName(pandocName: string): string {
  return pandocName;
}

function tagsPair(
  tag: string,
  attrs?: Record<string, string> | undefined,
  empty?: boolean
): TagsPair {
  const attrsString =
    (attrs &&
      Object.entries(attrs)
        .map(([name, value]) => {
          return ` ${name}="${escapeDblquotes(
            escapeAmpersandLtGt(value.toString())
          )}"`;
        })
        .join('')) ||
    '';
  const renamedTag = tagName(tag);
  const openTagContents = `${renamedTag}${attrsString}`;
  return empty
    ? [`<${openTagContents} />`, '']
    : [`<${openTagContents}>`, `</${renamedTag}>`];
}

function addTagsPair(pair: TagsPair, before: string[], after: string[]): void {
  before.push(pair[0]);
  after.push(pair[1]);
}

function addPandocJsonMeta(
  meta: Record<string, PandocJson>,
  buffer: string[]
): string[] {
  const [openMeta, closeMeta] = tagsPair(tagName('Meta'));
  buffer.push(openMeta);
  convertMetaMapToXml(meta, buffer);
  buffer.push(closeMeta);
  return buffer;
}

function appendBeforeAndAfter(
  buffer: string[],
  before: string[],
  after: string[]
): string[] {
  before.forEach((b) => {
    buffer.push(b);
  });
  let index = after.length;
  while (--index >= 0) {
    buffer.push(after[index]);
  }
  return buffer;
}

function addPandocJsonContents(
  children: PandocJson[],
  buffer: string[]
): string[] {
  children.forEach((c) => {
    const b: string[] = [];
    const a: string[] = [];
    convertJsonToXml(c, b, a);
    appendBeforeAndAfter(buffer, b, a);
  });
  return buffer;
}

function addArrayOfPandocJsonContents(
  children: PandocJson[],
  buffer: string[],
  name?: string
): string[] {
  children.forEach((c) => {
    const b: string[] = [];
    const a: string[] = [];
    if (name) {
      convertJsonToXml({ t: name, c }, b, a);
      appendBeforeAndAfter(buffer, b, a);
    } else {
      addPandocJsonContents(c.c, buffer);
    }
  });
  return buffer;
}

function attrToRecord(
  attr: Attr,
  options?: Record<string, any>
): Record<string, string> {
  const record: Record<string, string> = {};
  const id = attr[0];
  if (id && id.length > 0) record.id = id;
  const classes = attr[1];
  if (classes && classes.length > 0) {
    if (options && options.sortClasses) classes.sort();
    record.class = classes.join(' ');
  }
  attr[2].forEach(([key, value]) => {
    if (record[key] === undefined) record[key] = value;
  });
  return record;
}

export function pandocJsonDocumentToXml(json: PandocJsonDocument): string {
  const apiVersion = (
    json['pandoc-api-version'] || DEFAULT_PANDOC_API_VERSION
  ).join('.');
  const [openPandoc, closePandoc] = tagsPair('Pandoc', {
    'pandoc-api-version': apiVersion,
  });
  const buffer: string[] = [openPandoc];
  addPandocJsonMeta(json.meta, buffer);
  buffer.push('<Blocks>');
  addPandocJsonContents(json.blocks, buffer);
  buffer.push('</Blocks>');
  buffer.push(closePandoc);
  return buffer.join('');
}

export function pandocJsonToXml(json: PandocJson | PandocJsonDocument): string {
  if ((json as PandocJsonDocument).blocks) {
    return pandocJsonDocumentToXml(json as PandocJsonDocument);
  }
  const buffer: string[] = [];
  const before: string[] = [];
  const after: string[] = [];
  convertJsonToXml(json as PandocJson, before, after);
  appendBeforeAndAfter(buffer, before, after);
  return buffer.join('');
}

function convertMetaMapToXml(
  metaMap: Record<string, PandocJson>,
  buffer: string[]
): string[] {
  Object.entries(metaMap).forEach(([text, metaValue]) => {
    const before: string[] = [],
      after: string[] = [];
    addTagsPair(tagsPair('MetaMap', { text }), before, after);
    convertJsonToXml(metaValue, before, after);
    appendBeforeAndAfter(buffer, before, after);
  });
  return buffer;
}

function convertJsonToXml(
  json: PandocJson,
  before: string[],
  after: string[]
): void {
  switch (json.t) {
    case 'Str':
      before.push(escapeAmpersandLtGt(json.c));
      break;
    case 'Space':
      before.push(' ');
      break;
    case 'HorizontalRule':
    case 'Null':
    case 'SoftBreak':
    case 'LineBreak':
      before.push(tagsPair(json.t, {}, true)[0]);
      break;
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
    case 'Line':
    case 'ListItem':
    case 'Prefix':
    case 'Suffix':
    case 'MetaInlines':
    case 'MetaBlocks':
      addTagsPair(tagsPair(json.t), before, after);
      addPandocJsonContents(json.c, before);
      break;
    case 'Header':
      addTagsPair(
        tagsPair(json.t, { ...attrToRecord(json.c[1]), level: json.c[0] }),
        before,
        after
      );
      addPandocJsonContents(json.c[2], before);
      break;
    case 'Div':
    case 'Span':
      addTagsPair(tagsPair(json.t, attrToRecord(json.c[0])), before, after);
      addPandocJsonContents(json.c[1], before);
      break;
    case 'LineBlock':
      addTagsPair(tagsPair(json.t), before, after);
      addArrayOfPandocJsonContents(json.c, before, 'Line');
      break;
    case 'BulletList':
      addTagsPair(tagsPair(json.t), before, after);
      addArrayOfPandocJsonContents(json.c, before, 'ListItem');
      break;
    case 'CodeBlock':
    case 'Code':
      addTagsPair(tagsPair(json.t, attrToRecord(json.c[0])), before, after);
      before.push(escapeAmpersandLtGt(json.c[1]));
      break;
    case 'RawBlock':
    case 'RawInline':
      addTagsPair(tagsPair(json.t, { format: json.c[0] }), before, after);
      before.push(escapeAmpersandLtGt(json.c[1]));
      break;
    case 'OrderedList':
      addTagsPair(
        tagsPair(json.t, {
          start: json.c[0][0],
          'number-style': json.c[0][1].t,
          'number-delim': json.c[0][2].t,
        }),
        before,
        after
      );
      addArrayOfPandocJsonContents(json.c[1], before, 'ListItem');
      break;
    case 'DefinitionList':
      addTagsPair(tagsPair(json.t), before, after);
      addArrayOfPandocJsonContents(json.c, before, 'DefinitionItem');
      break;
    case 'DefinitionItem':
      addTagsPair(tagsPair(json.t), before, after);
      before.push(pandocJsonToXml({ t: 'DefinitionTerm', c: json.c[0] }));
      addArrayOfPandocJsonContents(json.c[1], before, 'DefinitionData');
      break;
    case 'DefinitionTerm':
      addTagsPair(tagsPair(json.t), before, after);
      addPandocJsonContents(json.c, before);
      break;
    case 'DefinitionData':
      addTagsPair(tagsPair(json.t), before, after);
      addPandocJsonContents(json.c, before);
      break;
    case 'Quoted':
      addTagsPair(
        tagsPair(json.t, { 'quote-type': json.c[0].t }),
        before,
        after
      );
      addPandocJsonContents(json.c[1], before);
      break;
    case 'Cite':
      addTagsPair(tagsPair(json.t), before, after);
      addArrayOfPandocJsonContents(json.c[0], before, 'Citation');
      addPandocJsonContents(json.c[1], before);
      break;
    case 'Citation':
      addTagsPair(
        tagsPair(json.t, {
          id: json.c.citationId,
          mode: json.c.citationMode.t,
          'note-num': json.c.citationNoteNum,
          hash: json.c.citationHash,
        }),
        before,
        after
      );
      before.push(pandocJsonToXml({ t: 'Prefix', c: json.c.citationPrefix }));
      before.push(pandocJsonToXml({ t: 'Suffix', c: json.c.citationSuffix }));
      break;
    case 'Math':
      addTagsPair(
        tagsPair(json.t, { 'math-type': json.c[0].t }),
        before,
        after
      );
      before.push(escapeAmpersandLtGt(json.c[1]));
      break;
    case 'Link':
    case 'Image':
      addTagsPair(
        tagsPair(json.t, {
          ...attrToRecord(json.c[0]),
          url: json.c[2][0],
          title: json.c[2][1],
        }),
        before,
        after
      );
      addPandocJsonContents(json.c[1], before);
      break;
    case 'Table':
      addTagsPair(tagsPair(json.t, attrToRecord(json.c[0])), before, after);
      addPandocJsonContents(
        [
          { t: 'Caption', c: json.c[1] },
          { t: 'ColSpecs', c: json.c[2] },
          { t: 'TableHead', c: json.c[3] },
          { t: 'TableBodies', c: json.c[4] },
          { t: 'TableFoot', c: json.c[5] },
        ],
        before
      );
      break;
    case 'TableHead':
    case 'TableFoot':
      if (json.c[1].length > 0) {
        addTagsPair(tagsPair(json.t, attrToRecord(json.c[0])), before, after);
        addPandocJsonContents(json.c[1], before);
      }
      break;
    case 'TableBodies':
      addArrayOfPandocJsonContents(json.c, before, 'TableBody');
      break;
    case 'TableBody':
      addTagsPair(
        tagsPair(json.t, {
          ...attrToRecord(json.c[0]),
          'row-head-columns': json.c[1],
        }),
        before,
        after
      );
      addArrayOfPandocJsonContents(json.c[2], before, 'RowOfHeadCells');
      addArrayOfPandocJsonContents(json.c[3], before, 'RowOfDataCells');
      break;
    case 'RowOfHeadCells':
      addTagsPair(tagsPair('Row', attrToRecord(json.c[0])), before, after);
      addArrayOfPandocJsonContents(json.c[1], before, 'HeadCell');
      break;
    case 'RowOfDataCells':
      addTagsPair(tagsPair('Row', attrToRecord(json.c[0])), before, after);
      addArrayOfPandocJsonContents(json.c[1], before, 'DataCell');
      break;
    case 'HeadCell':
    case 'DataCell':
      addTagsPair(
        tagsPair('Cell', {
          ...attrToRecord(json.c[0]),
          alignment: json.c[1].t,
          rowspan: json.c[2],
          colspan: json.c[3],
          'cell-type': json.t === 'HeadCell' ? 'header' : 'data',
        }),
        before,
        after
      );
      addPandocJsonContents(json.c[4], before);
      break;
    case 'Caption':
      if (json.c[0] !== null || json.c[1].length > 0) {
        addTagsPair(tagsPair(json.t), before, after);
        if (json.c[0] !== null)
          before.push(pandocJsonToXml({ t: 'ShortCaption', c: json.c[1] }));
        addPandocJsonContents(json.c[1], before);
      }
      break;
    case 'ShortCaption':
      addTagsPair(tagsPair(json.t), before, after);
      addPandocJsonContents(json.c, before);
      break;
    case 'ColSpecs':
      addTagsPair(tagsPair(json.t), before, after);
      addArrayOfPandocJsonContents(json.c, before, 'ColSpec');
      break;
    case 'ColSpec':
      addTagsPair(
        tagsPair(
          json.t,
          {
            alignment: json.c[0].t,
            'col-width': isObject(json.c[1])
              ? (json.c[1] as PandocJson).t
              : json.c[1],
          },
          true
        ),
        before,
        after
      );
      break;
    case 'MetaMap':
      convertMetaMapToXml(json.c, before);
      break;
    case 'MetaList':
      addTagsPair(tagsPair(json.t), before, after);
      addPandocJsonContents(json.c, before);
      break;
    case 'MetaBool':
      addTagsPair(
        tagsPair(json.t, { value: json.c.toString() }, true),
        before,
        after
      );
      break;
    case 'MetaString':
      addTagsPair(tagsPair(json.t, { text: json.c }, true), before, after);
      break;
  }
}
