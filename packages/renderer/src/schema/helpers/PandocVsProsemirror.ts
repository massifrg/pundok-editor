import type { Node, Mark, NodeType, MarkType } from '@tiptap/pm/model';
import {
  CustomStyleDef,
  INDEX_NAME_ATTR,
  PandocEditorConfig,
} from '../../common';
import { isString } from 'lodash';
import { Heading, RawBlock, RawInline } from '..';

function ucfirst(s: string): string {
  return s.substring(0, 1).toUpperCase() + s.substring(1);
}

const BLOCKS = [
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
  'Figure',
];
const INLINES = [
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
  'SoftBreak',
  'LineBreak',
  'Math',
  'RawInline',
  'Link',
  'Image',
  'Note',
  'Span',
];

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
  config?: PandocEditorConfig
): string {
  const name: string | undefined = isString(nom)
    ? nom
    : (nom as Node | Mark)?.type?.name || (nom as NodeType | MarkType).name;
  const attrs = isString(nom) ? {} : (nom as Node | Mark)?.attrs || {};
  const customStyle: string | undefined =
    (attrs && attrs.customStyle) || (attrs.kv && attrs.kv['custom-style']);
  switch (name) {
    case 'div':
    case 'figure':
      return firstToUpperWithClasses(name, attrs.classes, nameToCustomStyle);
    case 'paragraph':
      return customStyle ? `Para(${customStyle})` : 'Para';
    case 'hardBreak':
      return attrs.soft ? 'SoftBreak' : 'LineBreak';
    case 'smallcaps':
      return 'SmallCaps';
    case 'blockquote':
      return 'BlockQuote';
    case 'doubleQuoted':
      return 'Quoted(Double)';
    case 'singleQuoted':
      return 'Quoted(Single)';
    case 'span':
      if (customStyle) return `Span(${customStyle})`;
      return spanToLabel(nom);
    case 'emptySpan':
      return spanToLabel(nom);
    case 'heading':
      return firstToUpperWithClasses(
        `Header(${attrs.level || Heading.options.levels[0]})`,
        attrs.classes,
        nameToCustomStyle
      );
    case 'text':
      return 'text';
    case 'pandocNull':
      return 'Null';
    case 'rawInline':
      return `RawInline(${
        attrs.format ||
        config?.defaultRawFormat ||
        RawInline.options.defaultFormat
      })`;
    case 'rawBlock':
      return `RawBlock(${
        attrs.format ||
        config?.defaultRawFormat ||
        RawBlock.options.defaultFormat
      })`;
    case 'pandocTable':
      return `Table`;
    case 'pandocTableSection':
      return attrs.section;
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

function spanToLabel(nom: Node | Mark | NodeType | MarkType | string): string {
  if (!isString(nom)) {
    const indexName = (nom as Node | Mark)?.attrs?.kv[INDEX_NAME_ATTR];
    if (indexName) return `Span(${indexName} ref)`;
  }
  return 'Span';
}
