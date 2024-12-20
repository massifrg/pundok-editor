import {
  isArray,
  times,
  isObjectLike,
  isBoolean,
  isString,
  isNumber,
} from 'lodash';

export const PANDOC_BLOCKS = [
  'Plain',
  'Para',
  'LineBlock',
  'CodeBlock',
  'RawBlock',
  'BlockQuote',
  'OrderedList',
  'BulletList',
  'DefinitionList',
  'Header',
  'HorizontalRule',
  'Table',
  'Div',
  'Null',
];
export const PANDOC_INLINES = [
  'Str',
  'Emph',
  'Underline',
  'Strong',
  'Strikeout',
  'Superscript',
  'Subscript',
  'SmallCaps',
  'Quoted',
  'Cite',
  'Code',
  'Space',
  'SoftBreak',
  'LineBreak',
  'Math',
  'RawInline',
  'Link',
  'Image',
  'Note',
  'Span',
];

export interface PandocItem extends Record<string, any> {
  properties: string[];
  toNative?: (buffer: string[]) => string[];
  isBetweenParentheses?: boolean;
  commaSeparatedProps?: boolean;
}

export function isPandocItem(item: any) {
  return 'toNative' in item;
}

export function isPandocDocument(item: PandocItem) {
  const p = item.properties;
  return p.includes('meta') && p.includes('content');
}

export function escapeDoubleQuotes(text: string): string {
  if (text === null) return 'NULL';
  if (text === undefined) return 'UNDEFINED';
  return text.replace(/(^|[^\\])"/g, '$1\\"');
}

function toNative(item: PandocItem | any[], buffer?: string[]): string[] {
  let buf: string[] = buffer || [];
  if (isArray(item)) {
    buf.push('[');
    item.forEach((e, i) => {
      if (i > 0) buf.push(',');
      buf = toNative(e, buf);
    });
    buf.push(']');
  } else {
    const parentheses = item.isBetweenParentheses;
    if (parentheses) buf.push('(');
    if (item.toNative) {
      buf = item.toNative(buf);
    } else {
      const separator = item.commaSeparatedProps ? ',' : ' ';
      item.properties.forEach((pname, i) => {
        if (i > 0) buf.push(separator);
        const pvalue: any = item[pname];
        if (isObjectLike(pvalue) && pvalue.toNative) {
          buf = pvalue.toNative(buf);
        } else {
          switch (pname) {
            case 'name':
            case 'alignment':
            case 'quoteType':
            case 'mathType':
              buf.push(pvalue);
              break;
            case 'content':
            case 'lines':
            case 'items':
            case 'alt':
            case 'caption':
            case 'rows':
            case 'cols':
            case 'headers':
            case 'cells':
            case 'head':
            case 'foot':
            case 'body':
            case 'citations':
            case 'term':
            case 'definitions':
            case 'target':
            case 'metaValue':
              buf = toNative(pvalue, buf);
              break;
            case 'format':
              buf.push(`(Format "${escapeDoubleQuotes(pvalue)}")`);
              break;
            case 'text':
            case 'url':
            case 'title':
            case 'key':
              buf.push(`"${escapeDoubleQuotes(pvalue)}"`);
              break;
            case 'listAttributes':
              {
                const la = pvalue as ListAttributes;
                buf = tupleToNative(
                  [la.startNumber, la.numberStyle, la.numberDelim],
                  buf
                );
              }
              break;
            case 'level':
              buf.push(pvalue.toString());
              break;
            case 'colspan':
              buf.push(`(ColSpan ${pvalue})`);
              break;
            case 'rowspan':
              buf.push(`(RowSpan ${pvalue})`);
              break;
            case 'rowHeadColumns':
              buf.push(`(RowHeadColumns ${pvalue})`);
              break;
            case 'colAlignments':
            case 'colWidths':
              buf.push(`[${pvalue.join(',')}]`);
              break;
            case 'colWidth':
              buf.push(pvalue === 0 ? 'ColWidthDefault' : pvalue);
              break;
            default:
              throw new Error(
                `Don't know what to do with property "${pname}" not recognized`
              );
          }
        }
      });
    }
    if (parentheses) buf.push(')');
  }
  return buf;
}

function tupleToNative(props: any[], buffer: string[]): string[] {
  buffer.push('(');
  props.forEach((p, i) => {
    if (i > 0) buffer.push(',');
    switch (typeof p) {
      case 'number':
        buffer.push(p.toString());
        break;
      case 'string':
        buffer.push(p);
        break;
    }
  });
  buffer.push(')');
  return buffer;
}

function mapToNative(
  mapentries: [k: string, item: PandocItem][],
  buffer: string[]
): string[] {
  buffer.push('fromList [');
  mapentries.forEach(([key, item]) => {
    buffer.push(`("${key}"`);
    toNative(item, buffer);
    buffer.push(')');
  });
  buffer.push(']');
  return buffer;
}

export function toNativeString(item: PandocItem | PandocItem[]): string {
  return toNative(item).join('');
}

export function textToInlines(text: string): Inline[] {
  const inlines: Inline[] = [];
  text.split(/ +/).forEach((token, i) => {
    if (i > 0) inlines.push(new Space());
    if (token.length > 0) inlines.push(new Str(token));
  });
  return inlines;
}

const MARKDOWN_MARKERS = ['__', '**', '~~', '_', '*', '^', '~'];
export function simpleMarkdownToInlines(md: string): Inline[] {
  let inlines: Inline[] = [];
  let anchor = 0,
    marker: string | null = null,
    head = -1;
  const nextMarker = () => {
    marker = null;
    head = md.length;
    MARKDOWN_MARKERS.forEach((m) => {
      const h = md.indexOf(m, anchor);
      if (h >= 0 && h < head) {
        marker = m;
        head = h;
      }
    });
  };

  do {
    nextMarker();
    if (marker) {
      if (head > anchor) {
        const textBefore = md.substring(anchor, head);
        inlines = inlines.concat(textToInlines(textBefore));
      }
      const markerSize = (marker as string).length;
      const markedStart = head + markerSize;
      const markedEnd = md.indexOf(marker, markedStart);
      if (markedEnd < 0) {
        throw new Error(
          `Marker "${marker}" at position ${head} is unmatched in "${md}"`
        );
      }
      const markedText = md.substring(markedStart, markedEnd);
      const markedInlines = simpleMarkdownToInlines(markedText);
      switch (marker) {
        case '__':
        case '**':
          inlines.push(new Strong(markedInlines));
          break;
        case '_':
        case '*':
          inlines.push(new Emph(markedInlines));
          break;
        case '~~':
          inlines.push(new Strikeout(markedInlines));
          break;
        case '^':
          inlines.push(new Superscript(markedInlines));
          break;
        case '~':
          inlines.push(new Subscript(markedInlines));
          break;
        default:
          inlines = inlines.concat(markedInlines);
      }
      anchor = markedEnd + markerSize;
    } else {
      if (anchor < md.length) {
        inlines = inlines.concat(textToInlines(md.substring(anchor)));
      }
    }
  } while (marker);
  return inlines;
}

export interface PandocContainer extends PandocItem {
  appendBlock?: (block: Block) => void;
  appendInline?: (inline: Inline) => void;
  content: any[];
}

export interface BlockContainer extends PandocContainer {
  appendBlock(block: Block): void;
  content: Block[];
}

export interface InlineContainer extends PandocContainer {
  appendInline(inline: Inline): void;
  content: Inline[];
}

export class Pandoc implements BlockContainer {
  properties = ['meta', 'content'];

  constructor(
    public readonly meta: Meta,
    public readonly content: Block[],
    public isStandalone: boolean = false
  ) { }

  static empty() {
    return new Pandoc(Meta.empty(), []);
  }

  static withMetadata(metadata: MetaMapEntry[]) {
    return new Pandoc(new Meta(metadata), [])
  }

  appendMeta(metaMap: MetaMapEntry) {
    this.meta.append(metaMap);
  }

  appendBlock(block: Block) {
    this.content.push(block);
  }

  toNative(buffer: string[]): string[] {
    if (this.isStandalone) {
      buffer.push('Pandoc ');
      buffer = this.meta.toNative(buffer);
    }
    buffer = toNative(this.content, buffer);
    return buffer;
  }

  toNativeString() {
    return toNativeString(this);
  }
}

export class Meta implements PandocItem {
  name = 'Meta';
  properties = ['name', 'metadata'];

  constructor(public readonly metadata: MetaMapEntry[]) { }

  static empty(): Meta {
    return new Meta([]);
  }

  append(entry: MetaMapEntry) {
    this.metadata.push(entry);
  }

  toNative(buffer: string[]): string[] {
    buffer.push(`${this.name} {unMeta = `);
    mapToNative(
      this.metadata.map((mm) => [mm.key, mm.metaValue]),
      buffer
    );
    buffer.push('} ');
    return buffer;
  }
}

export abstract class Block implements PandocItem {
  properties: string[] = [];
}

export abstract class Inline implements PandocItem {
  properties: string[] = [];
}

export class MetaBlocks implements BlockContainer {
  name = 'MetaBlocks';
  properties = ['name', 'content'];

  constructor(public readonly content: Block[]) { }

  static from(paras: string[]): MetaBlocks {
    return new MetaBlocks(paras.map((p) => Para.from(p)));
  }

  appendBlock(block: Block): void {
    this.content.push(block);
  }
}

export class MetaInlines implements InlineContainer {
  name = 'MetaInlines';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) { }

  static from(text: string): MetaInlines {
    return new MetaInlines(simpleMarkdownToInlines(text));
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class MetaBool implements PandocItem {
  name = 'MetaBool';
  properties = ['name', 'value'];

  constructor(public readonly value: boolean) { }

  toNative(buffer: string[]): string[] {
    buffer.push(`${this.name} ${this.value ? 'True' : 'False'}`);
    return buffer;
  }
}

export class MetaString implements PandocItem {
  name = 'MetaString';
  properties = ['name', 'text'];

  constructor(public readonly text: string) { }

  toNative(buffer: string[]): string[] {
    buffer.push(`${this.name} "${escapeDoubleQuotes(this.text)}"`);
    return buffer;
  }
}

export class MetaMapEntry implements PandocItem {
  properties = ['key', 'metaValue'];
  isBetweenParentheses = true;
  commaSeparatedProps = true;

  constructor(
    public readonly key: string,
    public readonly metaValue: MetaValue
  ) { }

  static from(key: string, value: any): MetaMapEntry {
    if (!key)
      throw new Error(
        `${JSON.stringify(key)} is not a valid key for a MetaMap entry`
      );
    return new MetaMapEntry(key, valueToMetaValue(value));
  }

  toNative(buffer: string[]): string[] {
    buffer.push(`(`);
    buffer.push(this.key)
    buffer.push(', ')
    toNative(this.metaValue, buffer)
    buffer.push(')');
    return buffer;
  }
}

export class MetaMap implements PandocItem {
  name = 'MetaMap'
  properties: string[] = ['name', 'entries'];

  constructor(
    public readonly entries: MetaMapEntry[]
  ) { }

  toNative(buffer: string[]): string[] {
    buffer.push('MetaMap (')
    mapToNative(this.entries.map(e => [e.key, e.metaValue]), buffer)
    buffer.push(')')
    return buffer
  }
}

type MetaAtomConvertible = boolean | string | number;
type MetaMapConvertible = [k: string, v: MetaAtomConvertible];

function valueToMetaValue(
  v: MetaValue | MetaAtomConvertible | string[] | MetaMapConvertible
): MetaValue {
  let value: MetaValue | undefined = undefined;
  if (
    v instanceof MetaBool ||
    v instanceof MetaString ||
    v instanceof MetaInlines ||
    v instanceof MetaBlocks ||
    v instanceof MetaList ||
    v instanceof MetaMapEntry
  ) {
    return v;
  }
  if (isBoolean(v)) {
    value = new MetaBool(v);
  } else if (isString(v)) {
    if (v.indexOf('\n') >= 0) {
      value = new MetaBlocks(
        v
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => textToInlines(s))
          .map((l) => Para.from(l))
      );
    } else if (v.indexOf(' ') < 0) {
      value = new MetaString(v);
    } else {
      value = MetaInlines.from(v);
    }
  } else if (isNumber(v)) {
    value = new MetaString(v.toString());
  } else if (isArray(v)) {
    if (v.length === 2 && isString(v[0])) {
      try {
        value = valueToMetaValue(v[1]);
      } catch (err) {
        value = undefined;
      }
    }
    if (!value && v.every((i) => isString(i))) {
      value = MetaBlocks.from(v as string[]);
    } else {
      try {
        value = new MetaList(v.map((i) => valueToMetaValue(i)));
      } catch (e) {
        value = undefined;
      }
    }
  }
  if (!value)
    throw new Error(`Can't derive a MetaValue from "${JSON.stringify(v)}"`);
  return value;
}

export type MetaValue =
  | MetaBool
  | MetaString
  | MetaInlines
  | MetaBlocks
  | MetaList
  | MetaMapEntry;

export class MetaList implements PandocItem {
  name = 'MetaList';
  properties = ['name', 'items'];

  constructor(public readonly items: MetaValue[]) { }
}

export interface AttrInitObject {
  id?: string;
  classes?: string[];
  attributes?: Record<string, string>;
}

export class Attr implements PandocItem {
  properties = ['id', 'classes', 'attributes'];

  constructor(
    public readonly id: string,
    public readonly classes: string[],
    public readonly attributes: Record<string, string>
  ) { }

  static from(obj: Partial<AttrInitObject> | Attr): Attr {
    if (obj instanceof Attr) return obj;
    return new Attr(obj.id || '', obj.classes || [], obj.attributes || {});
  }

  static empty() {
    return Attr.from({});
  }

  toNative(buffer: string[]): string[] {
    const id = escapeDoubleQuotes(this.id);
    const classes = this.classes
      .map((c) => `"${escapeDoubleQuotes(c)}"`)
      .join(',');
    const attributes = Object.entries(this.attributes)
      .map(
        ([k, v]) =>
          `("${escapeDoubleQuotes(k)}","${escapeDoubleQuotes(
            v ? v : JSON.stringify(v)
          )}")`
      )
      .join(',');
    buffer.push(`("${id}",[${classes}],[${attributes}])`);
    return buffer;
  }

  hasClass(cname: string): boolean {
    return this.classes.includes(cname);
  }

  hasAttribute(aname: string): boolean {
    return !!this.attributes[aname];
  }
}

export class Plain extends Block implements InlineContainer {
  name = 'Plain';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  static empty(): Plain {
    return new Plain([]);
  }

  static from(content: string): Plain {
    return new Plain(simpleMarkdownToInlines(content));
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class Para extends Block implements InlineContainer {
  name = 'Para';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  static empty(): Para {
    return new Para([]);
  }

  static from(content: string | Inline[]): Para {
    if (typeof content === 'string')
      return new Para(simpleMarkdownToInlines(content));
    return new Para(content);
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class LineBlock extends Block {
  name = 'LineBlock';
  properties = ['name', 'lines'];

  constructor(public readonly lines: Inline[][]) {
    super();
  }
}

export class CodeBlock extends Block {
  name = 'CodeBlock';
  properties = ['name', 'attr', 'text'];

  constructor(public readonly attr: Attr, public readonly text: string) {
    super();
  }
}

export class RawBlock extends Block {
  name = 'RawBlock';
  properties = ['name', 'format', 'text'];

  constructor(public readonly format: string, public readonly text: string) {
    super();
  }
}

export class BlockQuote extends Block implements BlockContainer {
  name = 'BlockQuote';
  properties = ['name', 'content'];

  constructor(public readonly content: Block[]) {
    super();
  }

  appendBlock(block: Block): void {
    this.content.push(block);
  }
}

export type ListNumberStyle =
  | 'DefaultStyle'
  | 'Example'
  | 'Decimal'
  | 'LowerRoman'
  | 'UpperRoman'
  | 'LowerAlpha'
  | 'UpperAlpha';

export type ListNumberDelim =
  | 'DefaultDelim'
  | 'Period'
  | 'OneParen'
  | 'TwoParens';

export interface ListAttributes {
  startNumber: number;
  numberStyle: ListNumberStyle;
  numberDelim: ListNumberDelim;
}

export class OrderedList extends Block {
  name = 'OrderedList';
  properties = ['name', 'listAttributes', 'items'];

  constructor(
    public readonly listAttributes: ListAttributes,
    public readonly items: Block[][]
  ) {
    super();
  }

  static from(la: Partial<ListAttributes>, items: Block[][]): OrderedList {
    return new OrderedList(
      {
        startNumber: la.startNumber || 1,
        numberStyle: la.numberStyle || 'DefaultStyle',
        numberDelim: la.numberDelim || 'DefaultDelim',
      },
      items
    );
  }
}

export class BulletList extends Block {
  name = 'BulletList';
  properties = ['name', 'items'];

  constructor(public readonly items: Block[][]) {
    super();
  }
}

export class DefinitionListItem implements PandocItem {
  isBetweenParentheses = true;
  commaSeparatedProps = true;
  properties = ['term', 'definitions'];

  constructor(
    public readonly term: Inline[],
    public readonly definitions: Block[][]
  ) { }
}

export class DefinitionList extends Block {
  name = 'DefinitionList';
  properties = ['name', 'items'];

  constructor(public readonly items: DefinitionListItem[]) {
    super();
  }
}

export class Header extends Block implements InlineContainer {
  name = 'Header';
  properties = ['name', 'level', 'attr', 'content'];

  constructor(
    public readonly level: number,
    public readonly attr: Attr,
    public readonly content: Inline[]
  ) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class HorizontalRule extends Block {
  name = 'HorizontalRule';
  properties = ['name'];
}

export const PANDOC_ALIGNMENTS = [
  'AlignDefault',
  'AlignLeft',
  'AlignRight',
  'AlignCenter',
];
export type Alignment =
  | 'AlignLeft'
  | 'AlignRight'
  | 'AlignCenter'
  | 'AlignDefault';
export function isAlignment(align: string): boolean {
  return PANDOC_ALIGNMENTS.includes(align);
}

export class Div extends Block implements BlockContainer {
  name = 'Div';
  properties = ['name', 'attr', 'content'];

  constructor(public readonly attr: Attr, public readonly content: Block[]) {
    super();
  }

  appendBlock(block: Block): void {
    this.content.push(block);
  }

  get customStyle(): string | undefined {
    return this.attr.attributes['custom-style'];
  }

  isCustomStyle(): boolean {
    return this.attr.hasAttribute('custom-style');
  }

  hasClass(cname: string): boolean {
    return this.attr.hasClass(cname);
  }
}

export class Null extends Block {
  name = 'Null';
  properties = ['name'];
}

export class Str extends Inline {
  name = 'Str';
  properties = ['name', 'text'];

  constructor(public readonly text: string) {
    super();
  }
}

export class Emph extends Inline implements InlineContainer {
  name = 'Emph';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class Strong extends Inline implements InlineContainer {
  name = 'Strong';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class Strikeout extends Inline implements InlineContainer {
  name = 'Strikeout';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class Superscript extends Inline implements InlineContainer {
  name = 'Superscript';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class Subscript extends Inline implements InlineContainer {
  name = 'Subscript';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class SmallCaps extends Inline implements InlineContainer {
  name = 'SmallCaps';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export type QuoteType = 'SingleQuote' | 'DoubleQuote';

export class Quoted extends Inline implements InlineContainer {
  name = 'Quoted';
  properties = ['name', 'quoteType', 'content'];

  constructor(
    public readonly quoteType: QuoteType,
    public readonly content: Inline[]
  ) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export type CitationMode = 'AuthorInText' | 'SuppressAuthor' | 'NormalCitation';

export interface CitationProperties {
  id: string;
  prefix: Inline[] | string;
  suffix: Inline[] | string;
  mode: CitationMode;
  noteNum: number;
  hash: number;
}

export class Citation implements PandocItem {
  properties = [
    'citationId',
    'citationPrefix',
    'citationSuffix',
    'citationMode',
    'citationNoteNum',
    'citationHash',
  ];

  constructor(
    public readonly citationId: string,
    public readonly citationPrefix: Inline[],
    public readonly citationSuffix: Inline[],
    public readonly citationMode: CitationMode,
    public readonly citationNoteNum: number,
    public readonly citationHash: number
  ) { }

  static from(init: Partial<CitationProperties>): Citation {
    const prefix = isArray(init.prefix)
      ? init.prefix
      : simpleMarkdownToInlines(init.prefix || '');
    const suffix = isArray(init.suffix)
      ? init.suffix
      : simpleMarkdownToInlines(init.suffix || '');
    return new Citation(
      init.id || '',
      prefix,
      suffix,
      init.mode || 'NormalCitation',
      init.noteNum || 1,
      init.hash || 0
    );
  }

  toNative(buffer: string[]): string[] {
    buffer.push(
      'Citation {' +
      [
        `citationId = "${escapeDoubleQuotes(this.citationId)}"`,
        `citationPrefix = ${toNativeString(this.citationPrefix)}`,
        `citationSuffix = ${toNativeString(this.citationSuffix)}`,
        `citationMode = ${this.citationMode}`,
        `citationNoteNum = ${this.citationNoteNum}`,
        `citationHash = ${this.citationHash}`,
      ].join(', ') +
      '}'
    );
    return buffer;
  }
}

export class Cite extends Inline implements InlineContainer {
  name = 'Cite';
  properties = ['name', 'citations', 'content'];

  constructor(
    public readonly citations: Citation[],
    public readonly content: Inline[]
  ) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export class Code extends Inline {
  name = 'Code';
  properties = ['name', 'attr', 'text'];

  constructor(public readonly attr: Attr, public readonly text: string) {
    super();
  }
}

export class Space extends Inline {
  name = 'Space';
  properties = ['name'];
}

export class SoftBreak extends Inline {
  name = 'SoftBreak';
  properties = ['name'];
}

export class LineBreak extends Inline {
  name = 'LineBreak';
  properties = ['name'];
}

export type MathType = 'InlineMath' | 'DisplayMath';

export class Math extends Inline {
  name = 'Math';
  properties = ['name', 'mathType', 'text'];

  constructor(
    public readonly mathType: MathType,
    public readonly text: string
  ) {
    super();
  }
}

export class RawInline extends Inline {
  name = 'RawInline';
  properties = ['name', 'format', 'text'];

  constructor(public readonly format: string, public readonly text: string) {
    super();
  }
}

export interface TargetInitObject extends Record<string, any> {
  url?: string;
  title?: string;
}

export class Target implements PandocItem {
  isBetweenParentheses = true;
  commaSeparatedProps = true;
  properties = ['url', 'title'];

  constructor(public readonly url: string, public readonly title: string) { }

  static from(init: TargetInitObject): Target {
    return new Target(init.url || '', init.title || '');
  }
}

export class Link extends Inline implements InlineContainer {
  name = 'Link';
  properties = ['name', 'attr', 'alt', 'target'];

  constructor(
    public readonly attr: Attr,
    public readonly alt: Inline[],
    public readonly target: Target
  ) {
    super();
  }

  get content() {
    return this.alt;
  }

  appendInline(inline: Inline): void {
    this.alt.push(inline);
  }
}

export class Image extends Inline implements InlineContainer {
  name = 'Image';
  properties = ['name', 'attr', 'alt', 'target'];

  constructor(
    public readonly attr: Attr,
    public readonly alt: Inline[],
    public readonly target: Target
  ) {
    super();
  }

  get content() {
    return this.alt;
  }

  appendInline(inline: Inline): void {
    this.alt.push(inline);
  }
}

export class Note extends Inline implements BlockContainer {
  name = 'Note';
  properties = ['name', 'content'];

  constructor(public readonly content: Block[]) {
    super();
  }

  appendBlock(block: Block): void {
    this.content.push(block);
  }
}

export class Span extends Inline implements InlineContainer {
  name = 'Span';
  properties = ['name', 'attr', 'content'];

  constructor(public readonly attr: Attr, public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }

  get customStyle(): string | undefined {
    return this.attr.attributes['custom-style'];
  }

  isCustomStyle(): boolean {
    return this.attr.hasAttribute('custom-style');
  }
}

export class Caption implements BlockContainer {
  name = 'Caption';
  properties = ['name', 'short', 'content'];

  constructor(
    public readonly short: Inline[] | undefined,
    public readonly content: Block[]
  ) { }

  static empty(): Caption {
    return new Caption(undefined, []);
  }

  static from(init: Caption | string): Caption {
    if (init instanceof Caption) return init;
    return new Caption(undefined, [Plain.from(init)]);
  }

  toNative(buffer: string[]): string[] {
    const short = this.short;
    const short2native =
      short && short.length > 0 ? `(Just ${toNativeString(short)})` : 'Nothing';
    buffer.push(
      `(${this.name} ${short2native} ${toNativeString(this.content)})`
    );
    return buffer;
  }

  appendBlock(block: Block): void {
    this.content.push(block);
  }
}

export class ColSpec implements PandocItem {
  isBetweenParentheses = true;
  commaSeparatedProps = true;
  properties = ['alignment', 'colWidth'];

  constructor(
    public readonly alignment: Alignment,
    public readonly colWidth: number
  ) { }

  static readonly default = new ColSpec('AlignDefault', 0);
}

export interface TablePartProperties {
  attr: Attr | AttrInitObject;
  rowHeadColumns: number;
  headers: Row[];
  rows: Row[];
}

export class TableHead implements PandocItem {
  name = 'TableHead';
  isBetweenParentheses = true;
  properties = ['name', 'attr', 'rows'];

  constructor(public readonly attr: Attr, public readonly rows: Row[]) { }

  columns() {
    return this.rows.reduce((c, r) => {
      const rc = r.columns();
      return rc > c ? rc : c;
    }, 0);
  }

  static empty(): TableHead {
    return new TableHead(Attr.empty(), []);
  }

  static from(
    init:
      | TableHead
      | Partial<TablePartProperties>
      | (Cell | CellProperties | string)[][]
  ): TableHead {
    if (init instanceof TableHead) return init;
    if (isArray(init)) {
      const rows = init.map((r) => Row.from(r));
      return new TableHead(Attr.empty(), rows);
    }
    return new TableHead(Attr.from(init.attr || {}), init.rows || []);
  }
}

export class TableBody implements PandocItem {
  name = 'TableBody';
  properties = ['name', 'attr', 'rowHeadColumns', 'headers', 'rows'];

  constructor(
    public readonly attr: Attr,
    public readonly rowHeadColumns: number,
    public readonly headers: Row[],
    public readonly rows: Row[]
  ) { }

  static from(
    init:
      | TableBody
      | Partial<TablePartProperties>
      | (Cell | CellProperties | string)[][]
  ): TableBody {
    if (init instanceof TableBody) return init;
    if (isArray(init)) {
      const rows = init.map((r) => Row.from(r));
      return new TableBody(Attr.empty(), 0, [], rows);
    }
    return new TableBody(
      Attr.from(init.attr || {}),
      init.rowHeadColumns || 0,
      init.headers || [],
      init.rows || []
    );
  }

  columns() {
    return this.rows.reduce((c, r) => {
      const rc = r.columns();
      return rc > c ? rc : c;
    }, 0);
  }
}

export class TableFoot implements PandocItem {
  name = 'TableFoot';
  isBetweenParentheses = true;
  properties = ['name', 'attr', 'rows'];

  constructor(public readonly attr: Attr, public readonly rows: Row[]) { }

  columns() {
    return this.rows.reduce((c, r) => {
      const rc = r.columns();
      return rc > c ? rc : c;
    }, 0);
  }

  static empty(): TableFoot {
    return new TableFoot(Attr.empty(), []);
  }

  static from(
    init:
      | TableFoot
      | Partial<TablePartProperties>
      | (Cell | CellProperties | string)[][]
  ): TableFoot {
    if (init instanceof TableFoot) return init;
    if (isArray(init)) {
      const rows = init.map((r) => Row.from(r));
      return new TableFoot(Attr.empty(), rows);
    }
    return new TableFoot(Attr.from(init.attr || {}), init.rows || []);
  }
}

export interface RowProperties {
  attr: Attr;
  cells: (Cell | CellProperties | string)[];
}
export class Row implements PandocItem {
  name = 'Row';
  properties = ['name', 'attr', 'cells'];

  constructor(public readonly attr: Attr, public readonly cells: Cell[]) { }

  static from(
    init: Partial<RowProperties> | (Cell | CellProperties | string)[]
  ): Row {
    let attr: Attr;
    let cells: Cell[];
    if (isArray(init)) {
      attr = Attr.empty();
      cells = init.map((c) => Cell.from(c));
    } else {
      attr = init.attr || Attr.empty();
      cells = (init.cells || []).map((c) => Cell.from(c));
    }
    return new Row(attr, cells);
  }

  columns() {
    return this.cells.reduce((tot, c) => tot + c.colspan, 0);
  }
}

export interface CellProperties {
  attr: Attr;
  alignment: Alignment;
  rowspan: number;
  colspan: number;
  content: Block[] | string;
}

export class Cell implements BlockContainer {
  name = 'Cell';
  properties = ['name', 'attr', 'alignment', 'rowspan', 'colspan', 'content'];

  constructor(
    public readonly attr: Attr,
    public readonly alignment: Alignment,
    public readonly rowspan: number,
    public readonly colspan: number,
    public readonly content: Block[]
  ) { }

  static from(init: Partial<CellProperties> | Cell | string): Cell {
    if (init instanceof Cell) return init;
    let content: Block[];
    let props: Partial<CellProperties>;
    if (typeof init === 'string') {
      props = {};
      content = [new Plain(simpleMarkdownToInlines(init))];
    } else {
      props = init;
      content =
        typeof init.content === 'string'
          ? [new Plain(simpleMarkdownToInlines(init.content))]
          : init.content || [];
    }
    return new Cell(
      props.attr || Attr.empty(),
      props.alignment || 'AlignDefault',
      props.rowspan || 1,
      props.colspan || 1,
      content
    );
  }

  appendBlock(block: Block): void {
    this.content.push(block);
  }
}

export interface TableProperties {
  attr: Attr | AttrInitObject;
  caption: Caption | string;
  cols: ColSpec[];
  head: TableHead | (Cell | CellProperties | string)[][];
  body: (TableBody | (Cell | CellProperties | string)[][])[];
  foot: TableFoot | (Cell | CellProperties | string)[][];
}
export class Table extends Block {
  name = 'Table';
  properties = ['name', 'attr', 'caption', 'cols', 'head', 'body', 'foot'];

  constructor(
    public readonly attr: Attr,
    public readonly caption: Caption,
    public readonly cols: ColSpec[],
    public readonly head: TableHead,
    public readonly body: TableBody[],
    public readonly foot: TableFoot
  ) {
    super();
  }

  static from(
    init: Partial<TableProperties> | (Cell | CellProperties | string)[][]
  ): Table {
    if (isArray(init)) {
      const bodydata = init as (Cell | CellProperties | string)[][];
      const body = [TableBody.from(bodydata)];
      const columnCount = body.reduce((cc, body) => {
        const cols = body.columns();
        return cols > cc ? cols : cc;
      }, 0);

      const cols: ColSpec[] = times(columnCount).map((_) => ColSpec.default);
      return new Table(
        Attr.empty(),
        Caption.empty(),
        cols,
        TableHead.from({}),
        body,
        TableFoot.from({})
      );
    }
    return new Table(
      Attr.from(init.attr || {}),
      Caption.from(init.caption || Caption.empty()),
      init.cols || [],
      TableHead.from(init.head || []),
      (init.body || []).map((tb) => TableBody.from(tb)),
      TableFoot.from(init.foot || [])
    );
  }
}

export class Underline extends Inline implements InlineContainer {
  name = 'Underline';
  properties = ['name', 'content'];

  constructor(public readonly content: Inline[]) {
    super();
  }

  appendInline(inline: Inline): void {
    this.content.push(inline);
  }
}

export interface FigureProperties {
  attr: Attr | AttrInitObject;
  caption: Caption | string;
  content: Block[];
}
export class Figure extends Block implements BlockContainer {
  name = 'Figure';
  properties = ['name', 'attr', 'caption', 'content'];

  constructor(
    public readonly attr: Attr,
    public readonly caption: Caption,
    public readonly content: Block[]
  ) {
    super();
  }

  static from(init: Partial<FigureProperties>) {
    return new Figure(
      init.attr ? Attr.from(init.attr) : Attr.empty(),
      init.caption ? Caption.from(init.caption) : Caption.empty(),
      init.content || []
    );
  }

  static empty() {
    return new Figure(Attr.empty(), Caption.empty(), []);
  }

  appendBlock(block: Block): void {
    this.content.push(block);
  }
}

export function createEmptyInlineContainer(
  name: string,
  attrs?: Record<string, any>
): InlineContainer | undefined {
  switch (name) {
    case 'Emph':
      return new Emph([]);
    case 'Underline':
      return new Underline([]);
    case 'Strong':
      return new Strong([]);
    case 'Strikeout':
      return new Strikeout([]);
    case 'Superscript':
      return new Superscript([]);
    case 'Subscript':
      return new Subscript([]);
    case 'SmallCaps':
      return new SmallCaps([]);
    case 'Quoted':
      return new Quoted(attrs?.quoteType || 'DoubleQuote', []);
    case 'Cite':
      return new Cite(attrs?.citations || [], []);
    case 'Link':
      return new Link(Attr.from(attrs || {}), [], Target.from(attrs || {}));
    case 'Span':
      return new Span(Attr.from(attrs || {}), []);
    case 'Image':
      return new Image(Attr.from(attrs || {}), [], Target.from(attrs || {}));
    case 'Plain':
      return Plain.empty();
    case 'Para':
      return Para.empty();
    case 'Header':
      return new Header(attrs?.level | 1, Attr.from(attrs || {}), []);
  }
}

export function isBlock(item?: PandocItem): boolean {
  return item ? PANDOC_BLOCKS.includes(item?.name) : false;
}

export function isInline(item?: PandocItem): boolean {
  return item ? PANDOC_INLINES.includes(item?.name) : false;
}
