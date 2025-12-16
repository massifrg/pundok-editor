import type { Node, Mark, NodeType, MarkType, Schema } from '@tiptap/pm/model';
import {
  CustomStyleDef,
  DEFAULT_RAW_BLOCK_FORMAT,
  DEFAULT_RAW_INLINE_FORMAT,
  INDEX_NAME_ATTR,
  MARK_NAME_CITE,
  MARK_NAME_CODE,
  MARK_NAME_DOUBLE_QUOTED,
  MARK_NAME_EMPH,
  MARK_NAME_LINK,
  MARK_NAME_MATH,
  MARK_NAME_SINGLE_QUOTED,
  MARK_NAME_SMALLCAPS,
  MARK_NAME_SPAN,
  MARK_NAME_STRIKEOUT,
  MARK_NAME_STRONG,
  MARK_NAME_SUBSCRIPT,
  MARK_NAME_SUPERSCRIPT,
  MARK_NAME_UNDERLINE,
  NODE_NAME_BLOCKQUOTE,
  NODE_NAME_BREAK,
  NODE_NAME_BULLET_LIST,
  NODE_NAME_CODE_BLOCK,
  NODE_NAME_DEFINITION_LIST,
  NODE_NAME_DIV,
  NODE_NAME_EMPTY_SPAN,
  NODE_NAME_FIGURE,
  NODE_NAME_HEADING,
  NODE_NAME_HORIZONTAL_RULE,
  NODE_NAME_IMAGE,
  NODE_NAME_LINE_BLOCK,
  NODE_NAME_NOTE,
  NODE_NAME_ORDERED_LIST,
  NODE_NAME_PANDOC_TABLE,
  NODE_NAME_PARAGRAPH,
  NODE_NAME_PLAIN,
  NODE_NAME_RAW_BLOCK,
  NODE_NAME_RAW_INLINE,
  PundokEditorConfig,
} from '../../common';
import { isString } from 'lodash';
import { Heading, RawBlock, RawInline } from '..';

function ucfirst(s: string): string {
  return s.substring(0, 1).toUpperCase() + s.substring(1);
}

const BLOCKS_TO_PM: Record<string, string> = {
  Plain: NODE_NAME_PLAIN,
  Para: NODE_NAME_PARAGRAPH,
  LineBlock: NODE_NAME_LINE_BLOCK,
  CodeBlock: NODE_NAME_CODE_BLOCK,
  RawBlock: NODE_NAME_RAW_BLOCK,
  BlockQuote: NODE_NAME_BLOCKQUOTE,
  OrderedList: NODE_NAME_ORDERED_LIST,
  BulletList: NODE_NAME_BULLET_LIST,
  DefinitionList: NODE_NAME_DEFINITION_LIST,
  Header: NODE_NAME_HEADING,
  HorizontalRule: NODE_NAME_HORIZONTAL_RULE,
  Table: NODE_NAME_PANDOC_TABLE,
  Div: NODE_NAME_DIV,
  Figure: NODE_NAME_FIGURE,
}

const INLINES_TO_PM: Record<string, string> = {
  Emph: MARK_NAME_EMPH,
  Underline: MARK_NAME_UNDERLINE,
  Strong: MARK_NAME_STRONG,
  Strikeout: MARK_NAME_STRIKEOUT,
  Superscript: MARK_NAME_SUPERSCRIPT,
  Subscript: MARK_NAME_SUBSCRIPT,
  SmallCaps: MARK_NAME_SMALLCAPS,
  Quoted: MARK_NAME_DOUBLE_QUOTED,
  Cite: MARK_NAME_CITE,
  Code: MARK_NAME_CODE,
  SoftBreak: NODE_NAME_BREAK,
  LineBreak: NODE_NAME_BREAK,
  Math: MARK_NAME_MATH,
  RawInline: NODE_NAME_RAW_INLINE,
  Link: MARK_NAME_LINK,
  Image: NODE_NAME_IMAGE,
  Note: NODE_NAME_NOTE,
  Span: MARK_NAME_SPAN,
}

const BLOCKS = Object.keys(BLOCKS_TO_PM)
const INLINES = Object.keys(INLINES_TO_PM);

function customStyleClasses(
  classes: string[] | null | undefined,
  nameToCustomStyle?: Record<string, CustomStyleDef>
) {
  if (classes && nameToCustomStyle) {
    return classes.filter((c) => !!nameToCustomStyle[c]);
  }
  return [];
}

function firstToUpperWithClasses(
  name: string,
  classes: string[],
  nameToCustomStyle?: Record<string, CustomStyleDef>
): string {
  return (
    ucfirst(name) +
    customStyleClasses(classes, nameToCustomStyle)
      .map((c) => `.${c}`)
      .join('')
  );
}

export function nodeOrMarkToPandocName(
  nom: Node | Mark | NodeType | MarkType | string,
  nameToCustomStyle?: Record<string, CustomStyleDef>,
  config?: PundokEditorConfig
): string {
  const name: string | undefined = isString(nom)
    ? nom
    : (nom as Node | Mark)?.type?.name || (nom as NodeType | MarkType).name;
  const attrs = isString(nom) ? {} : (nom as Node | Mark)?.attrs || {};
  const customStyle: string | undefined =
    (attrs && attrs.customStyle) || (attrs.kv && attrs.kv['custom-style']);
  switch (name) {
    case NODE_NAME_DIV:
    case NODE_NAME_FIGURE:
    case NODE_NAME_PANDOC_TABLE:
      return firstToUpperWithClasses(name, attrs.classes, nameToCustomStyle);
    case NODE_NAME_PARAGRAPH:
      return customStyle ? `Para(${customStyle})` : 'Para';
    case NODE_NAME_BREAK:
      return attrs.soft ? 'SoftBreak' : 'LineBreak';
    case MARK_NAME_SMALLCAPS:
      return 'SmallCaps';
    case NODE_NAME_BLOCKQUOTE:
      return 'BlockQuote';
    case MARK_NAME_DOUBLE_QUOTED:
      return 'Quoted(Double)';
    case MARK_NAME_SINGLE_QUOTED:
      return 'Quoted(Single)';
    case MARK_NAME_SPAN:
      if (customStyle) return `Span(${customStyle})`;
      return spanToLabel(nom);
    case NODE_NAME_EMPTY_SPAN:
      return spanToLabel(nom);
    case NODE_NAME_HEADING:
      return firstToUpperWithClasses(
        `Header(${attrs.level || Heading.options.levels[0]}${customStyle ? ',' + customStyle : ''})`,
        attrs.classes,
        nameToCustomStyle
      );
    case 'text':
      return 'text';
    case 'pandocNull':
      return 'Null';
    case NODE_NAME_RAW_INLINE:
      return `RawInline(${attrs.format
        || config?.defaultRawFormat
        || RawInline.options.defaultFormat
        || DEFAULT_RAW_INLINE_FORMAT
        })`;
    case NODE_NAME_RAW_BLOCK:
      return `RawBlock(${attrs.format
        || config?.defaultRawFormat
        || RawBlock.options.defaultFormat
        || DEFAULT_RAW_BLOCK_FORMAT
        })`;
    case NODE_NAME_PANDOC_TABLE:
      return `Table`;
    // case 'pandocTableSection':
    //   return attrs.section;
    default:
      return name ? ucfirst(name) : '?';
  }
}

export function nodeOrMarkToPandocType(nom: Node | Mark): string {
  const name = nodeOrMarkToPandocName(nom).replace(/\W.*$/, '');
  if (BLOCKS.find((b) => b == name)) return 'Block';
  if (INLINES.find((i) => i == name)) return 'Inline';
  return name;
}

export function pandocNameToProsemirrorType(schema: Schema, pandocType: string, quoteType?: string): NodeType | MarkType | undefined {
  let typeName = BLOCKS_TO_PM[pandocType] || INLINES_TO_PM[pandocType]
  if (typeName === MARK_NAME_DOUBLE_QUOTED && quoteType === 'SingleQuote')
    typeName = MARK_NAME_SINGLE_QUOTED
  return schema.nodes[typeName] || schema.marks[typeName]
}

function spanToLabel(nom: Node | Mark | NodeType | MarkType | string): string {
  if (!isString(nom)) {
    const indexName = (nom as Node | Mark)?.attrs?.kv[INDEX_NAME_ATTR];
    if (indexName) return `Span(${indexName} ref)`;
  }
  return 'Span';
}
