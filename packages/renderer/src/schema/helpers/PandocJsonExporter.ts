import {
  type ListAttributes,
  type PandocItem,
  type Block,
  type Inline,
  type BlockContainer,
  type InlineContainer,
  CitationMode,
  MetaMap,
  MetaMapEntry,
  MetaBool,
  MetaString,
  MetaInlines,
  MetaBlocks,
  MetaList,
  MetaValue,
  Attr,
  BlockQuote,
  BulletList,
  Caption,
  Citation,
  Code,
  CodeBlock,
  DefinitionList,
  Div,
  Header,
  HorizontalRule,
  Image,
  LineBlock,
  LineBreak,
  Math,
  Note,
  Null,
  OrderedList,
  Pandoc,
  Para,
  Plain,
  RawBlock,
  RawInline,
  SoftBreak,
  textToInlines,
  createEmptyInlineContainer,
  Target,
  DefinitionListItem,
  Cell,
  Row,
  Span,
  Table,
  TableHead,
  TableBody,
  TableFoot,
  Figure,
  ColSpec,
  Alignment,
} from '../../pandoc';
import type { Node, Schema } from '@tiptap/pm/model';
import { toJsonString } from '../../pandoc';
import { schema } from './PandocSchema';
import { flatten, isArray, isEqual, uniq } from 'lodash';
import { textAlignToPandocAlignment } from './alignments';
import { colAlignmentsFromSections, PmColSpec } from './colSpec';
import {
  DEFAULT_INDEX_NAME,
  DEFAULT_INDEX_REF_CLASS,
  DEFAULT_NOTE_TYPE,
  INDEXED_TEXT_ATTR,
  INDEX_CLASS,
  INDEX_NAME_ATTR,
  INDEX_PUT_INDEX_REF_ATTR,
  INDEX_RANGE_ATTR,
  INDEX_REF_CLASS_ATTR,
  INDEX_SORT_KEY_ATTR,
  INDEX_TERM_CLASS,
  Index,
  MARK_NAME_CITE,
  NODE_NAME_AUTO_DELIMITER,
  NODE_NAME_SHORT_CAPTION,
  NOTE_TYPE_ATTRIBUTE,
} from '../../common';
import {
  INDEX_RANGE_START,
  INDEX_RANGE_START_CLASS,
  INDEX_RANGE_STOP,
  INDEX_RANGE_STOP_CLASS,
} from '../nodes/IndexRef';
import { AutoDelimiter } from '../extensions/AutoDelimitersExtension';
import { ShortCaption } from '../nodes';
import { PundokCitation } from './citation';
import { Cite } from '../marks';

type PmAttrs = Record<string, any>;

interface PmJsonNode {
  type: string;
  attrs?: PmAttrs;
  marks?: PmJsonMark[];
  content?: PmJsonNode[];
  text?: string;
}

interface PmJsonTextNode extends PmJsonNode {
  text: string;
}

export interface PmJsonMark extends Record<string, any> {
  type: string;
  pandoc: string;
  attrs?: PmAttrs;
}

const BASE_MARKS: PmJsonMark[] = [
  { type: 'emph', pandoc: 'Emph' },
  { type: 'underline', pandoc: 'Underline' },
  { type: 'strong', pandoc: 'Strong' },
  { type: 'strikeout', pandoc: 'Strikeout' },
  { type: 'superscript', pandoc: 'Superscript' },
  { type: 'subscript', pandoc: 'Subscript' },
  { type: 'smallcaps', pandoc: 'SmallCaps' },
  { type: 'singleQuoted', pandoc: 'Quoted' },
  { type: 'doubleQuoted', pandoc: 'Quoted' },
  { type: 'math', pandoc: 'Math', attrs: { mathType: 'DisplayMath' } },
  { type: 'math', pandoc: 'Math', attrs: { mathType: 'InlineMath' } },
  { type: 'code', pandoc: 'Code', attrs: {} },
  { type: 'span', pandoc: 'Span', attrs: {} },
  { type: 'link', pandoc: 'Link', attrs: {} },
  { type: 'cite', pandoc: 'Cite', attrs: { citations: [] } },
];

const HIGHER_PRIORITY_TAGS = ['_', 'math', 'span', 'link', 'code', 'cite'];
export type CompareMarksFunction = (m1: PmJsonMark, m2: PmJsonMark) => number;

function markRangesComparator(
  knownMarks: PmJsonMark[],
  compareMarksFunction: CompareMarksFunction,
) {
  return (
    [markIndex1, start1, stop1]: number[],
    [markIndex2, start2, stop2]: number[],
  ) => {
    const markComparison = compareMarksFunction(
      knownMarks[markIndex2],
      knownMarks[markIndex1],
    );
    if (start1 === start2) {
      return stop2 === stop1 ? markComparison : stop2 - stop1;
    } else {
      return start1 - start2;
    }
  };
}

const MARK_INDEX = 0;
const RANGE_START = 1;
const RANGE_STOP = 2;

const logMarkRanges = (
  knownMarks: PmJsonMark[],
  ranges: number[][],
  title?: string,
) => {
  console.log(title || `MARK RANGES:`);
  ranges.forEach(([mi, start, stop]) => {
    console.log(`${knownMarks[mi].type}, ${start}, ${stop}`);
  });
};

export interface PandocJsonExporterOptions {
  /** The API version number to be written in Pandoc JSON file. */
  apiVersion?: number[];
  /** The indices defined for the document. */
  indices?: Index[];
  /** A function that compares Marks precedence. */
  compareMarks?: CompareMarksFunction;
  /** The third argument of JSON.stringify, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#syntax */
  space?: number | string;
}

/**
 * Default comparison function between two marks, to be used in an {@link Array.sort()}.
 * When two marks spans overlap, the one with higher priority is kept together
 * and the other is broken.
 * These are the default rules:
 * - Pandoc Inlines without attributes (Emph, Strong, Underline,
 *   Strikeout, Superscript, Subscript, SmallCaps) have the lowest priority
 * - a Span with only the attribute 'custom-style' (an inline "custom style")
 *   has a higher priority than the latter
 * - then there are Quote < Math < Span (no id, no custom style) < Link (no id) < Code (no id) < Cite
 * - marks with an __id__ attribute set have an even higher priority:
 *   Cite < Span (with id) < Link (with id) < Code (with id)
 */
export const defaultCompareMarks: CompareMarksFunction = (
  m1: PmJsonMark,
  m2: PmJsonMark,
) => {
  const hpt = [m1, m2].map((m) => {
    if (m.type == 'doubleQuoted') return 2000;
    if (m.type == 'singleQuoted') return 1000;
    let v = HIGHER_PRIORITY_TAGS.indexOf(m.type);
    if (v >= 0 && m.attrs?.id) v += 100;
    if (m.type !== 'span') return v;
    const ma = m.attrs || {};
    const k = Object.keys(ma.kv || {});
    return !ma.id &&
      !ma.classes &&
      (k.length === 0 || isEqual(k, ['custom-style']))
      ? 0
      : v;
  });
  const diff = hpt[0] - hpt[1];
  if (diff !== 0) return diff; // < 0 ? -1 : 1
  if (m1.attrs && !m2.attrs) return 1;
  if (m2.attrs && !m1.attrs) return -1;
  return 0;
};

export function nodeToPandocJsonString(
  node: Node,
  options?: PandocJsonExporterOptions,
): string {
  const exporter = new PandocJsonExporter(schema, options);
  const pandoc = exporter.nodeToPandoc(node);
  return toJsonString(pandoc, exporter.options?.apiVersion, options?.space);
}

export function nodeToPandocFragment(
  node: Node,
  options?: PandocJsonExporterOptions,
): PandocItem {
  const exporter = new PandocJsonExporter(schema, options);
  return exporter.nodeToPandocFragment(node);
}

export function nodeContentToPandocInlines(
  node: Node,
  options?: PandocJsonExporterOptions,
): Inline[] {
  const exporter = new PandocJsonExporter(schema, options);
  const inlineContainer = exporter.nodeToPandocFragment(node) as InlineContainer
  return inlineContainer.content || []
}

export class PandocJsonExporter {
  private knownMarks: PmJsonMark[] = [...BASE_MARKS];
  private knownMarksDict: Record<string, number[]> = {};
  private compareMarks: CompareMarksFunction = defaultCompareMarks;
  private indices: Index[] = [];
  private citationCount: number = 0;

  constructor(
    public readonly schema: Schema,
    public readonly options?: PandocJsonExporterOptions,
  ) {
    this.compareMarks = options?.compareMarks || this.compareMarks;
    this.indices = options?.indices || this.indices;
    this.knownMarks.forEach((m, i) => {
      this.knownMarksDict[m.type] = [i];
    });
  }

  private indexRefClass(indexName: string): string {
    const index =
      indexName && this.indices.find((index) => index.indexName == indexName);
    return (index && index.refClass) || DEFAULT_INDEX_REF_CLASS;
  }

  nodeToPandoc(node: Node): Pandoc {
    let pandoc = Pandoc.empty();
    if (node.type.name === 'doc') {
      const nodeJson = node.toJSON();
      const content = nodeJson.content as PmJsonNode[];
      const metadata = content.filter((c) => c.type === 'metadata')[0];
      if (metadata)
        pandoc = Pandoc.withMetadata(this.nodeToMetaMap(metadata).entries)
      const blocks = content.filter((c) => c.type !== 'metadata');
      this.appendBlocks(pandoc, blocks);
    }
    return pandoc;
  }

  nodeToPandocFragment(node: Node): PandocItem {
    return this.nodeToPandocItem(node.toJSON()) as PandocItem;
  }

  nodeToPandocInlines(node: Node): Inline[] {
    const container: PandocItem = this.nodeToPandocFragment(node);
    if ((container as InlineContainer).appendInline) return container.content;
    return [];
  }

  private paraToPandocItem(node: PmJsonNode): Para {
    return new Para(this.inlineContentToInlines(node.content || []));
  }

  private definitionListToPandocItem(node: PmJsonNode): PandocItem {
    const dlItems: DefinitionListItem[] = [];
    let dt: Inline[] = [];
    let dds: Block[][] = [];

    const closeListItem = () => {
      if (dt.length > 0 && dds.length > 0) {
        dlItems.push(new DefinitionListItem(dt, dds));
        dt = [];
        dds = [];
      } else if (dt.length > 0 && dds.length === 0) {
        throw new Error("found a definition term without definitions' data");
      } else if (dt.length === 0 && dds.length > 0) {
        throw new Error(
          'found a definition data without a definition term before',
        );
      }
    };

    node.content?.forEach((item) => {
      let blocks: Block[];
      switch (item.type) {
        case 'definitionTerm':
          closeListItem();
          dt = this.inlineContentToInlines(item.content || []);
          break;
        case 'definitionData':
          blocks = (item.content?.map(
            (subitem) => this.nodeToPandocItem(subitem) as PandocItem,
          ) || []) as Block[];
          dds.push(blocks);
          break;
        default:
          throw new Error(
            `found a ${item.type}, but only definitionTerm and definitionData allowed here`,
          );
      }
    });
    closeListItem();
    return new DefinitionList(dlItems);
  }

  private tableRowToPandocItem(jsonRow: PmJsonNode): Row {
    const cells: Cell[] | undefined = jsonRow.content?.map((cell) => {
      if (cell.type === 'tableCell' || cell.type === 'tableHeader') {
        return this.nodeToPandocItem(cell) as Cell;
      } else {
        throw new Error(
          `Found a ${cell.type}, only tableCell and tableHeader allowed here`,
        );
      }
    });
    return new Row(this.attrFrom(jsonRow), cells || []);
  }

  private tableBodyToPandocItem(jsonBody: PmJsonNode): TableBody {
    const rows: Row[] | undefined = jsonBody.content?.map((row) => {
      if (row.type === 'tableRow') {
        return this.tableRowToPandocItem(row);
      } else {
        throw new Error(`Found a ${row.type}, only tableRow allowed here`);
      }
    });
    let headRows = jsonBody.attrs?.headRows || 0;
    const headerRows = rows?.slice(0, headRows) || [];
    const dataRows = rows?.slice(headRows) || [];
    headRows = headerRows.length;
    return new TableBody(
      this.attrFrom(jsonBody),
      jsonBody.attrs?.rowHeadColumns,
      headerRows,
      dataRows,
    );
  }

  private captionToPandocItem(jsonCaption: PmJsonNode): Caption {
    const content: PmJsonNode[] = jsonCaption.content || [];
    const maybeShortCaption =
      (content[0].type === NODE_NAME_SHORT_CAPTION && content[0]) || undefined;
    const scInlines = maybeShortCaption
      ? this.inlineContentToInlines(maybeShortCaption.content || [])
      : undefined;
    const captionContent = maybeShortCaption
      ? jsonCaption.content?.slice(1)
      : jsonCaption.content;
    return new Caption(
      scInlines,
      (captionContent || []).map((c) => this.nodeToPandocItem(c) as Block),
    );
  }

  private tableToPandocItem(jsonTable: PmJsonNode): Table {
    let caption: Caption = Caption.empty();
    let head: TableHead = TableHead.empty();
    const bodies: TableBody[] = [];
    let foot: TableFoot = TableFoot.empty();
    let rows: Row[];

    jsonTable.content?.forEach((tableSection) => {
      switch (tableSection.type) {
        case 'caption':
          caption = this.captionToPandocItem(tableSection);
          break;
        case 'tableHead':
          rows =
            tableSection.content?.map((r) => this.tableRowToPandocItem(r)) ||
            [];
          head =
            rows.length > 0
              ? new TableHead(this.attrFrom(tableSection), rows)
              : TableHead.empty();
          break;
        case 'tableBody':
          bodies.push(this.tableBodyToPandocItem(tableSection));
          break;
        case 'tableFoot':
          rows =
            tableSection.content?.map((r) => this.tableRowToPandocItem(r)) ||
            [];
          foot =
            rows.length > 0
              ? new TableFoot(this.attrFrom(tableSection), rows)
              : TableFoot.empty();
          break;
        default:
          console.log(tableSection);
          throw new Error(
            `Type ${tableSection} can't be a direct child of a table`,
          );
      }
    });

    let alignments = colAlignmentsFromSections(bodies, head, foot);
    const columnsCount = alignments.length;
    const tableColSpec: PmColSpec[] = jsonTable.attrs?.colSpec || [];
    let colSpec: ColSpec[] = Array(columnsCount);
    for (let i = 0; i < columnsCount; i++) {
      const colWidth = tableColSpec[i]?.colWidth;
      colSpec[i] = new ColSpec(
        (tableColSpec[i]?.align || 'AlignDefault') as Alignment,
        !colWidth ? 0 : colWidth,
      );
    }

    return new Table(
      this.attrFrom(jsonTable),
      caption,
      colSpec,
      head,
      bodies,
      foot,
    );
  }

  private nodeToCodeBlock(node: PmJsonNode): CodeBlock {
    const content = node.content && node.content[0];
    // const { classes, language } = node.attrs!
    // if (language)
    //   node.attrs!.classes = classes.indexOf(language) < 0 ? [language, ...classes] : classes
    return new CodeBlock(this.attrFrom(node), (content && content.text) || '');
  }

  private nodeToLineBlock(node: PmJsonNode): LineBlock | undefined {
    const content = node.content;
    const lines =
      content?.map((item) => this.nodeToPandocItem(item) as PandocItem[]) || [];
    return lines.length > 0 ? new LineBlock(lines) : undefined;
  }

  private nodeToBlockQuote(node: PmJsonNode): BlockQuote | undefined {
    const blocks =
      node.content?.map((b) => this.nodeToPandocItem(b) as PandocItem) || [];
    return blocks.length > 0 ? new BlockQuote(blocks) : undefined;
  }

  private nodeToBulletList(node: PmJsonNode): BulletList | undefined {
    const listItems =
      node.content?.map(
        (item) => this.nodeToPandocItem(item) as PandocItem[],
      ) || [];
    return listItems.length > 0 ? new BulletList(listItems) : undefined;
  }

  private nodeToOrderedList(node: PmJsonNode): OrderedList | undefined {
    const olItems =
      node.content?.map(
        (item) => this.nodeToPandocItem(item) as PandocItem[],
      ) || [];
    const attrs = node.attrs || {};
    const listAttrs: ListAttributes = {
      startNumber: attrs.start,
      numberStyle: attrs.numberStyle,
      numberDelim: attrs.numberDelim,
    };
    return olItems.length > 0 ? new OrderedList(listAttrs, olItems) : undefined;
  }

  private nodeToCell(node: PmJsonNode): Cell {
    const attrs = node.attrs || {};
    const align = textAlignToPandocAlignment(attrs.textAlign);
    const attr = this.attrFrom(node);
    const verticalAlign = node.attrs?.verticalAlign;
    if (verticalAlign) attr.attributes['vertical-align'] = verticalAlign;
    const cell = new Cell(attr, align, attrs.rowspan, attrs.colspan, []);
    this.appendBlocks(cell, node.content);
    return cell;
  }

  private nodeToListItem(node: PmJsonNode): Block[] {
    const utilDiv = new Div(Attr.empty(), []);
    this.appendBlocks(utilDiv, node.content);
    return utilDiv.content;
  }

  private nodeToRawInline(node: PmJsonNode): RawInline {
    return new RawInline(node.attrs?.format, node.attrs?.text);
  }

  private nodeToImage(node: PmJsonNode): Image {
    const alt: Inline[] = this.inlineContentToInlines(node?.content || []);
    const target: Target = new Target(node.attrs?.src, node.attrs?.title);
    return new Image(this.attrFrom(node), alt, target);
  }

  private nodeToNote(node: PmJsonNode): Note | Span {
    const attrs = node.attrs || {};
    const noteType = attrs.noteType || DEFAULT_NOTE_TYPE;
    let noteContent: Block[] = (node.content || []).map(
      (b) => this.nodeToPandocItem(b) as Block,
    );
    if (isPlainFootnote(node))
      return new Note(noteContent)
    const { id, classes, kv } = attrs;
    const noteSpan = new Span(
      Attr.from({
        id,
        classes,
        attributes: { ...kv, [NOTE_TYPE_ATTRIBUTE]: noteType },
      }),
      [new Note(noteContent)]
    )
    return noteSpan

    // OLD WAY
    // if (!isFootnoteWithoutAttr(node)) {
    //   const { id, classes, kv } = attrs;
    //   noteContent = [
    //     new Div(
    //       Attr.from({
    //         id,
    //         classes,
    //         attributes: { ...kv, 'note-type': noteType },
    //       }),
    //       noteContent,
    //     ),
    //   ];
    // }
    // return new Note(noteContent);
  }

  private nodeToFigure(node: PmJsonNode): Figure {
    const attr = this.attrFrom(node);
    let caption: Caption | undefined = undefined;
    let content: PandocItem[] = [];
    node.content?.forEach((c) => {
      if (c.type === 'figureCaption') {
        caption = this.captionToPandocItem(c);
      } else {
        const i = this.nodeToPandocItem(c);
        content = content.concat(isArray(i) ? i : [i]);
      }
    });
    return new Figure(attr, caption || Caption.empty(), content);
  }

  private nodeToIndexDiv(node: PmJsonNode): Div {
    const attributes: Record<string, string> = {};
    const { indexName, refClass, putIndexRef } = node.attrs || {};
    if (indexName) attributes[INDEX_NAME_ATTR] = indexName;
    if (refClass) attributes[INDEX_REF_CLASS_ATTR] = refClass;
    if (putIndexRef) attributes[INDEX_PUT_INDEX_REF_ATTR] = putIndexRef;
    const div = new Div(new Attr('', [INDEX_CLASS], attributes), []);
    this.appendBlocks(div, node.content);
    return div;
  }

  private nodeToIndexTerm(node: PmJsonNode): Div {
    const attributes: Record<string, string> = {};
    const { indexName, sortKey } = node.attrs || {};
    if (indexName) attributes[INDEX_NAME_ATTR] = indexName;
    if (sortKey) attributes[INDEX_SORT_KEY_ATTR] = sortKey;
    const div = new Div(
      new Attr(node.attrs?.id || '', [INDEX_TERM_CLASS], attributes),
      [],
    );
    this.appendBlocks(div, node.content);
    return div;
  }

  private nodeToIndexRef(node: PmJsonNode): Span {
    const attrs = node.attrs || {};
    const kv = attrs.kv;
    const indexName = kv[INDEX_NAME_ATTR] || DEFAULT_INDEX_NAME;
    const {
      idref,
      [INDEXED_TEXT_ATTR]: indexedText,
      [INDEX_RANGE_ATTR]: indexRange,
    } = kv;
    const classes = [this.indexRefClass(indexName)];
    if (indexRange === INDEX_RANGE_START) classes.push(INDEX_RANGE_START_CLASS);
    if (indexRange === INDEX_RANGE_STOP) classes.push(INDEX_RANGE_STOP_CLASS);
    const attributes: Record<string, string> = { ...kv };
    if (indexName) attributes[INDEX_NAME_ATTR] = indexName;
    if (idref) attributes.idref = idref;
    if (indexedText) attributes[INDEXED_TEXT_ATTR] = indexedText;
    return new Span(Attr.from({ id: '', classes, attributes }), []);
  }

  private nodeToMetaList(node: PmJsonNode): MetaList {
    const metaValues = flatten(
      node.content?.map((c) => this.nodeToPandocItem(c)),
    ) as MetaValue[];
    return new MetaList(metaValues);
  }

  private nodeToMetaMap(node: PmJsonNode): MetaMap {
    const entries: MetaMapEntry[] = []
    node.content?.forEach(mapEntry => {
      const key = mapEntry.attrs?.text || 'unknown';
      const value = mapEntry.content && mapEntry.content[0];
      const pandocItem = key && value && this.nodeToPandocItem(value) as PandocItem
      if (pandocItem)
        entries.push(new MetaMapEntry(key, pandocItem))
      else
        console.log(`error converting MetaMapEntry, key=${JSON.stringify(key)}, value=${JSON.stringify(value)}`)
    })
    return new MetaMap(entries);
  }

  private nodeToPandocItem(node: PmJsonNode): PandocItem | PandocItem[] {
    const attrs = node.attrs || {};
    const nodeType = node.type;
    if (!nodeType)
      throw new Error(
        `nodeToPandocItem: node ${JSON.stringify(node)} has no type`,
      );
    switch (nodeType) {
      case 'blockquote':
        return this.nodeToBlockQuote(node) || new Null();
      case 'bulletList':
        return this.nodeToBulletList(node) || new Null();
      case 'hardBreak':
        return attrs.soft ? new SoftBreak() : new LineBreak();
      case 'caption':
        return this.appendBlocks(new Caption(undefined, []), node.content);
      case 'codeBlock':
        return this.nodeToCodeBlock(node);
      case 'definitionList':
        return this.definitionListToPandocItem(node);
      case 'div':
      case 'indexDiv':
      case 'indexTerm':
        return this.appendBlocks(
          new Div(this.attrFrom(node), []),
          node.content,
        );
      case 'figure':
        return this.nodeToFigure(node);
      case 'heading':
        return new Header(
          attrs.level,
          this.attrFrom(node),
          this.inlineContentToInlines(node.content || []),
        );
      case 'horizontalRule':
        return new HorizontalRule();
      // case 'indexDiv':
      //   return this.nodeToIndexDiv(node);
      // case 'indexTerm':
      //   return this.nodeToIndexTerm(node);
      case 'line':
        return this.inlineContentToInlines(node.content || []);
      case 'lineBlock':
        return this.nodeToLineBlock(node) || new Null();
      case 'listItem':
        return this.nodeToListItem(node);
      case 'orderedList':
        return this.nodeToOrderedList(node) || new Null();
      case 'pandocNull':
        return new Null();
      case 'paragraph':
        return this.paraToPandocItem(node);
      case 'plain':
        return new Plain(this.inlineContentToInlines(node.content || []));
      case 'rawBlock':
        return new RawBlock(
          attrs.format,
          (node.content || []).map((t) => t.text).join(''),
        );
      case 'table':
      case 'pandocTable':
        return this.tableToPandocItem(node);
      case 'tableCell':
      case 'tableHeader':
        return this.nodeToCell(node);
      case 'metaBool':
        return new MetaBool(attrs.value === 'True');
      case 'metaString':
        return new MetaString(node.content?.map((c) => c.text).join('') || '');
      case 'metaInlines':
        return new MetaInlines(this.inlineContentToInlines(node.content || []));
      case 'metaBlocks':
        return this.appendBlocks(new MetaBlocks([]), node.content);
      case 'metaList':
        return this.nodeToMetaList(node);
      case 'metaMap':
        return this.nodeToMetaMap(node) || [];
      default:
    }
    throw new Error(`Unknown type: ${nodeType}`);
  }

  private appendBlocks(container: BlockContainer, content?: PmJsonNode[]) {
    if (content) {
      let currentParaStyle: string | null = null;
      let customStyleDiv: Div | null = null;
      content.forEach((child) => {
        if (child.type === 'paragraph' && child.attrs?.customStyle) {
          const paraStyle = child.attrs?.customStyle;
          if (currentParaStyle !== paraStyle) {
            currentParaStyle = paraStyle;
            customStyleDiv = new Div(
              Attr.from({ attributes: { 'custom-style': paraStyle } }),
              [],
            );
            container.appendBlock(customStyleDiv);
          }
          if (customStyleDiv)
            customStyleDiv.appendBlock(
              this.nodeToPandocItem(child) as PandocItem,
            );
        } else {
          currentParaStyle = null;
          customStyleDiv = null;
          container.appendBlock(this.nodeToPandocItem(child) as PandocItem);
        }
      });
    }
    return container;
  }

  private attrFrom(nodeOrMark: PmJsonNode | PmJsonMark): Attr {
    const attrs = nodeOrMark.attrs;
    return attrs
      ? Attr.from({
        id: attrs.id,
        classes: attrs.classes,
        attributes: attrs.kv,
      })
      : Attr.empty();
  }

  /**
   * Compute the hash of a citation (TODO: currently always returns 0)
   */
  private citationHash() {
    return 0
  }

  private markToIndex(mark: PmJsonMark): number {
    const knownMarks = this.knownMarks;
    let indices = this.knownMarksDict[mark.type];
    if (indices) {
      if (!mark.attrs) return indices[0];
      const knownIndex = indices.find((i) =>
        isEqual(mark.attrs, knownMarks[i].attrs),
      );
      if (knownIndex) return knownIndex;
    } else {
      indices = this.knownMarksDict[mark.type] = [];
    }
    const newIndex = knownMarks.length;
    indices.push(newIndex);
    const newMark = { ...mark };
    const found = BASE_MARKS.find((bm) => bm.type === mark.type);
    if (found) {
      newMark.pandoc = found.pandoc;
      if (found.type === MARK_NAME_CITE) {
        const pundokCitations: PundokCitation[] = newMark.attrs?.citations || [];
        if (pundokCitations.length > 0)
          this.citationCount++
        const citations: Citation[] = pundokCitations.map((c) => {
          return Citation.from({
            id: c.citationId,
            prefix: c.citationPrefix || [],
            suffix: c.citationSuffix || [],
            mode: c.citationMode as CitationMode,
            noteNum: this.citationCount,
            hash: this.citationHash(),
          });
        });
        newMark.attrs = { ...newMark.attrs, citations };
      }
    } else {
      newMark.attrs = {
        'custom-style': newMark.type,
      };
      newMark.type = 'span';
      newMark.pandoc = 'Span';
    }
    knownMarks.push(newMark);
    return newIndex;
  }

  private createMarkAtIndex(index: number): InlineContainer | undefined {
    const mark = this.knownMarks[index];
    if (mark) {
      const mAttrs: Record<string, any> = { ...mark.attrs };
      const pAttrs = { ...mAttrs };
      if (mark.pandoc === 'Quoted') {
        pAttrs.quoteType =
          mark.type === 'singleQuoted' ? 'SingleQuote' : 'DoubleQuote';
      }
      if (mAttrs.kv) pAttrs.attributes = mAttrs.kv;
      if (mAttrs.href) pAttrs.url = mAttrs.href;
      return createEmptyInlineContainer(mark.pandoc, pAttrs);
    }
  }

  private markIndices(marks?: PmJsonMark[]): number[] {
    return marks ? marks.map((mark) => this.markToIndex(mark)) : [];
  }

  private inlineContentToInlines(
    content: PmJsonNode[],
    acc?: Inline[],
  ): Inline[] {
    let inlines: Inline[] = [];
    let chunks: Inline[] = [];
    let marksRanges: number[][] = [];
    const knownMarks = this.knownMarks;
    const compareMarks = this.compareMarks;
    const comparator = markRangesComparator(knownMarks, compareMarks);

    const addMarkRange = (markIndex: number, start: number, stop: number) => {
      let markRangeIndex = marksRanges.findIndex(
        ([index, mstart, mstop]) => index === markIndex && mstop == start,
      );
      if (markRangeIndex < 0) {
        marksRanges.push([markIndex, start, stop]);
      } else {
        marksRanges[markRangeIndex][RANGE_STOP] = stop;
      }
      return marksRanges;
    };

    const untangleRanges = () => {
      marksRanges.sort(comparator);
      // logMarkRanges(knownMarks, marksRanges, "BEFORE UNTANGLE")
      const rangesCount = marksRanges.length;
      let intersectionFound = false;
      for (let i = 0; i < rangesCount; i++) {
        const [mi1, start1, stop1] = marksRanges[i];
        for (let j = i; j < rangesCount; j++) {
          const [mi2, start2, stop2] = marksRanges[j];
          if (start2 < stop1 && stop2 > stop1) {
            const comparison = compareMarks(knownMarks[mi1], knownMarks[mi2]);
            // console.log(`comparing ${knownMarks[mi1].type} with ${knownMarks[mi2].type}, result: ${comparison}`)
            if (comparison < 0) {
              marksRanges[i] = [mi1, start1, start2];
              marksRanges.push([mi1, start2, stop1]);
            } else {
              marksRanges[j] = [mi2, start2, stop1];
              marksRanges.push([mi2, stop1, stop2]);
            }
            intersectionFound = true;
            break;
          }
        }
        if (intersectionFound) untangleRanges();
      }
      // logMarkRanges(knownMarks, marksRanges, 'UNTANGLED')
    };

    const processAccumulatedChunks = () => {
      if (chunks.length > 0) {
        // console.log('CHUNKS:')
        // console.log(chunks)
        const stack: InlineContainer[] = [Plain.empty()];
        const stops: number[] = [chunks.length];
        if (marksRanges.length > 0) {
          untangleRanges();
          marksRanges.sort(comparator);
        }
        let rangeIndex = 0;
        let stackIndex = 0;
        // @ts-ignore
        let mi, mstart, mstop;
        let inlineContainer = stack[0];
        for (let i = 0; i < chunks.length; i++) {
          // console.log(`CHUNK #${i}, ${chunks[i].text || ''}, stackIndex=${stackIndex}`)
          // console.log(`stops: ${stops.join()}`)
          while (stackIndex > 0 && stops[stackIndex] == i) {
            // console.log(`stops: ${stops.join()}`)
            // console.log(`CLOSE CONTAINER @ stack index=${stackIndex}`)
            stops.pop();
            stack.pop();
            stackIndex--;
          }
          while (
            rangeIndex < marksRanges.length &&
            i === marksRanges[rangeIndex][RANGE_START]
          ) {
            [mi, mstart, mstop] = marksRanges[rangeIndex];
            const container = this.createMarkAtIndex(mi);
            if (container) {
              stack[stackIndex].appendInline(container);
              // console.log(`CREATED ${container.name}, appended to stack @ ${stackIndex}`)
              stack.push(container);
              stops.push(mstop);
              stackIndex++;
              rangeIndex++;
              // console.log(`stack index=${stackIndex}`)
            }
          }
          inlineContainer = stack[stackIndex];
          inlineContainer.appendInline(chunks[i]);
          // console.log(`APPENDED ${chunks[i].name} to stack @ ${stackIndex}`)
        }
        stack[0].content.forEach((inline) => {
          inlines.push(inline);
        });
        // logMarkRanges(this.knownMarks, marksRanges, 'marks ranges')
        chunks = [];
        marksRanges = [];
      }
    };

    let text: string;
    if (content) {
      let addedChunks: Inline[] = [];
      content.forEach((child, index) => {
        // console.log(`#${index}, ${child.type}, ${child.text}`)
        let markIndices: number[] = [];
        let extendCurrentRanges = false;

        const mathMark = child.marks?.find((m) => m.type === 'math');
        const codeMark = child.marks?.find((m) => m.type === 'code');

        if (codeMark) {
          text = (child as PmJsonTextNode).text;
          // const { classes, language } = codeMark.attrs!
          // if (language)
          //   codeMark.attrs!.classes = classes.indexOf(language) < 0 ? [language, ...classes] : classes
          addedChunks = [new Code(this.attrFrom(codeMark), text)];
        } else if (mathMark) {
          text = (child as PmJsonTextNode).text;
          addedChunks = [new Math(mathMark.attrs?.mathType, text)];
        } else {
          markIndices = this.markIndices(child.marks);
          switch (child.type) {
            case 'text':
              addedChunks = textToInlines((child as PmJsonTextNode).text);
              break;
            case 'hardBreak':
              addedChunks = [
                child.attrs?.soft ? new SoftBreak() : new LineBreak(),
              ];
              extendCurrentRanges = true;
              break;
            case 'rawInline':
              addedChunks = [this.nodeToRawInline(child)];
              break;
            case 'image':
              addedChunks = [this.nodeToImage(child)];
              break;
            case 'note':
              addedChunks = [this.nodeToNote(child)];
              extendCurrentRanges = true;
              break;
            case 'indexRef':
              addedChunks = [this.nodeToIndexRef(child)];
              extendCurrentRanges = true;
              break;
            case 'emptySpan':
              addedChunks = [
                new Span(
                  Attr.from({
                    id: child.attrs?.id,
                    classes: child.attrs?.classes,
                    attributes: child.attrs?.kv,
                  }),
                  [],
                ),
              ];
              extendCurrentRanges = true;
              break;
            case NODE_NAME_AUTO_DELIMITER:
              addedChunks = [];
              extendCurrentRanges = true;
              break;
            default:
              throw new Error(`type ${child.type} not supported`);
          }
        }

        // console.log(`CURRENT MARK INDICES: ${currentMarkIndices.join()}`)
        // console.log(`MARK INDICES: ${markIndices.join()}`)

        const start = chunks.length;
        const stop = start + addedChunks.length;
        chunks = chunks.concat(addedChunks);
        if (extendCurrentRanges) {
          markIndices = markIndices.concat(
            marksRanges
              .filter(([mi, _, mstop]) => mstop === start)
              .map(([mi]) => mi),
          );
          markIndices = uniq(markIndices);
        }
        if (
          markIndices.length ===
          0 /* || intersection(markIndices, currentMarkIndices).length === 0*/
        ) {
          processAccumulatedChunks();
          chunks = [];
          marksRanges = [];
        }
        markIndices.forEach((mi) => {
          addMarkRange(mi, start, stop);
        });
        // console.log(marksRanges)
        if (extendCurrentRanges) {
          marksRanges = marksRanges.map(([mi, mstart, mstop]) =>
            mstop === start ? [mi, mstart, stop] : [mi, mstart, mstop],
          );
        }
        // logMarkRanges(knownMarks, marksRanges, 'STEP')
        // console.log(`Inlines: ${inlines.map(i => (i as Record<string, any>).name).join()}`)
      });
      // logMarkRanges(knownMarks, marksRanges, 'STEP')
      // console.log(addedChunks)
    }
    processAccumulatedChunks();

    // console.log(`Inlines: ${inlines.map(i => (i as Record<string, any>).name).join()}`)

    return inlines;
  }
}

// function logInline(inline: Inline | InlineContainer): string {
//   const i = inline as any
//   if (i.name == 'Str') {
//     return `"${i.text}"`
//   } else if (i.content) {
//     return (i.name || '') + '(' +
//       ((i as InlineContainer).content.map(c => logInline(c)).join(' '))
//       + ')'
//   } else if (i.name === 'Space') {
//     return 'Space'
//   }
//   return 'Inline?'
// }

/**
 * Check whether a note is a plain footnote without any extra information.
 * @param note
 * @returns 
 */
export function isPlainFootnote(note: PmJsonNode): boolean {
  const attrs = note.attrs;
  if (!attrs) return true;
  const { noteType, id, classes, kv } = attrs;
  if (noteType && noteType !== DEFAULT_NOTE_TYPE) return false;
  const keys = Object.keys(kv || {})
  console.log(`id=${JSON.stringify(id)}, classes=${JSON.stringify(classes)}, keys=${JSON.stringify(keys)}`)
  return (!id || id === '')
    && (!classes || classes.length === 0)
    && (keys.length === 0 || (keys.length === 1 && keys[0] === NOTE_TYPE_ATTRIBUTE))
}
