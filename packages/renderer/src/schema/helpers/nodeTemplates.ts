import { Attrs, Node, NodeType, ResolvedPos, Schema } from '@tiptap/pm/model';
import {
  Blockquote,
  BulletList,
  CodeBlock,
  DefinitionData,
  DefinitionList,
  DefinitionTerm,
  Div,
  Figure,
  FigureCaption,
  Heading,
  HorizontalRule,
  IndexDiv,
  IndexTerm,
  Line,
  LineBlock,
  ListItem,
  Metadata,
  MetaBlocks,
  MetaBool,
  MetaInlines,
  MetaList,
  MetaMap,
  MetaString,
  OrderedList,
  PandocTable,
  Paragraph,
  Plain,
  RawBlock,
  ShortCaption,
  RawInline,
  EmptySpan,
  Note,
} from '..';
import {
  DEFAULT_INDEX_NAME,
  DEFAULT_RAW_BLOCK_FORMAT,
  INDEX_CLASS,
  INDEX_NAME_ATTR,
  INDEX_TERM_CLASS,
  PundokEditorConfig,
} from '../../common';
import { createPandocTable, innerNodeDepth } from '.';
import { isString } from 'lodash';
import { EditorState } from '@tiptap/pm/state';

export function nodesWithTemplate(): string[] {
  return [
    Paragraph.name,
    Div.name,
    RawBlock.name,
    HorizontalRule.name,
    DefinitionList.name,
    DefinitionTerm.name,
    DefinitionData.name,
    BulletList.name,
    OrderedList.name,
    ListItem.name,
    Plain.name,
    LineBlock.name,
    Line.name,
    CodeBlock.name,
    Blockquote.name,
    PandocTable.name,
    Figure.name,
    FigureCaption.name,
    ShortCaption.name,
    IndexTerm.name,
    IndexDiv.name,
    MetaBlocks.name,
    MetaBool.name,
    MetaInlines.name,
    MetaList.name,
    MetaMap.name,
  ];
}

let COMPATIBLE_BLOCKS: string[][] = [];

function para(schema: Schema, text?: string): Node | null {
  return schema.nodes.paragraph.create(
    null,
    text && text.length > 0 ? schema.text(text) : null,
  );
}

interface TemplateNodeContext {
  state: EditorState;
  pos: number;
  $pos: ResolvedPos;
}

export function templateNode(
  schema: Schema,
  typename: string,
  config?: PundokEditorConfig,
  context?: TemplateNodeContext,
): { node: Node; attrs?: Attrs } | null {
  const nodes = schema.nodes;
  const nodeType = nodes[typename];
  if (!nodeType) return null;
  let node: Node | null = null;
  let attrs: Attrs | undefined = undefined;
  switch (typename) {
    case Paragraph.name:
      node = para(schema, '');
      break;
    case Div.name:
      node = (para && nodeType.create(null, para(schema, ''))) || null;
      break;
    case DefinitionList.name:
      {
        const term = nodes.definitionTerm.create(null, schema.text('term'));
        const data = nodes.definitionData.create(null, para(schema, 'data'));
        node = nodeType.create(null, [term, data]);
      }
      break;
    case DefinitionTerm.name:
      node = nodeType.create(null, schema.text('term'));
      break;
    case DefinitionData.name:
      node = nodeType.create(null, para(schema, 'data')) || null;
      break;
    case BulletList.name:
    case OrderedList.name:
      {
        const item = nodes.listItem.create(null, para(schema, 'item'));
        node = nodeType.create(null, item);
      }
      node = node;
      break;
    case ListItem.name:
      node = nodeType.create(null, para(schema, 'item')) || null;
      break;
    case HorizontalRule.name:
      node = nodeType.create();
      break;
    case RawBlock.name:
      node = nodeType.create({
        format: config?.defaultRawFormat || DEFAULT_RAW_BLOCK_FORMAT,
        text: '',
      });
      break;
    case Plain.name:
      node = nodeType.create(null, schema.text('plain'));
      break;
    case LineBlock.name:
      {
        const line = nodes.line.create(null, schema.text(' '));
        node = nodeType.create(null, line);
      }
      node = node;
      break;
    case Line.name:
      node = nodeType.create(null, schema.text('line'));
      break;
    case CodeBlock.name:
      node = nodeType.create(null, schema.text('code'));
      break;
    case PandocTable.name:
      node = createPandocTable(schema, 3, 3, {
        cellContainer: 'plain',
        enumerateCells: true,
      });
      break;
    case Blockquote.name:
      node = nodeType.create(null, para(schema));
      break;
    case FigureCaption.name:
      node = nodeType.create(null, para(schema, 'caption'));
      break;
    case ShortCaption.name:
      node = nodeType.create(null, schema.text('short caption'));
      break;
    case Figure.name:
      node = nodeType.create(null, para(schema));
      break;
    case IndexTerm.name:
      node = nodeType.create(null, para(schema, 'index term'));
      let indexName = DEFAULT_INDEX_NAME;
      const { state, $pos, pos } = context || {};
      if (state && ($pos || pos)) {
        const rpos: ResolvedPos = $pos || state.doc.resolve(pos!);
        const depth = innerNodeDepth(
          rpos,
          (n) => n.type.name === IndexDiv.name,
        );
        if (depth)
          indexName = rpos.node(depth).attrs.kv[INDEX_NAME_ATTR] || indexName;
      }
      attrs = {
        classes: [INDEX_TERM_CLASS],
        kv: { 'index-name': indexName },
      };
      break;
    case IndexDiv.name: {
      const kv = { 'index-name': DEFAULT_INDEX_NAME };
      const term = nodes.indexTerm.create(
        { classes: [INDEX_TERM_CLASS], kv },
        para(schema, 'index term'),
      );
      node = nodeType.create({ classes: [INDEX_CLASS], kv }, term);
      break;
    }
    case Metadata.name:
      node = nodeType.create(
        null,
        nodes.metaInlines.create(null, schema.text('meta inlines')),
      );
      break;
    case MetaBlocks.name:
      node = nodeType.create(null, para(schema, 'meta blocks'));
      break;
    case MetaInlines.name:
      node = nodeType.create(null, schema.text('meta inlines'));
      break;
    case MetaBool.name:
      node = nodeType.create();
      break;
    case MetaString.name:
      node = nodeType.create(null, schema.text('meta string'));
      break;
    case MetaMap.name: {
      const meta = nodes.metaInlines.create(null, schema.text('meta inlines'));
      node = nodeType.create({ text: 'key' }, meta);
      break;
    }
    case MetaList.name: {
      const meta1 = nodes.metaInlines.create(null, schema.text('meta item'));
      const meta2 = nodes.metaInlines.create(null, schema.text('meta item'));
      node = nodeType.create(null, [meta1, meta2]);
      break;
    }
    default:
      return null;
  }
  return node ? { node, attrs } : null;
}

export function nodeIcon(typename?: string) {
  switch (typename) {
    // blocks
    case Paragraph.name:
      return 'mdi-format-paragraph';
    case Div.name:
      return 'mdi-alpha-d-circle-outline';
    case DefinitionList.name:
      return 'mdi-format-list-text';
    case DefinitionTerm.name:
      return 'mdi-alpha-t-box-outline';
    case DefinitionData.name:
      return 'mdi-alpha-d-box-outline';
    case BulletList.name:
      return 'mdi-format-list-bulleted';
    case OrderedList.name:
      return 'mdi-format-list-numbered';
    case ListItem.name:
      return 'mdi-playlist-plus';
    case HorizontalRule.name:
      return 'mdi-minus';
    case RawBlock.name:
      return 'mdi-code-tags';
    case Plain.name:
      return 'mdi-alpha-p-box-outline';
    case LineBlock.name:
      return 'mdi-format-list-group';
    case Line.name:
      return 'mdi-playlist-plus';
    case CodeBlock.name:
      return 'mdi-code-braces';
    case Blockquote.name:
      return 'mdi-format-quote-close';
    case PandocTable.name:
      return 'mdi-table';
    case Figure.name:
      return 'mdi-image-frame';
    case FigureCaption.name:
      return 'mdi-image-text';
    case ShortCaption.name:
      return 'mdi-tag-text-outline';
    case IndexTerm.name:
      return 'mdi-cursor-pointer';
    case IndexDiv.name:
      return 'mdi-book-alphabet';
    // inlines
    case EmptySpan.name:
      return 'mdi-map-marker-outline';
    case Image.name:
      return 'mdi-image-outline';
    case Note.name:
      return 'mdi-note';
    case RawInline.name:
      return 'mdi-code-tags';
    // metadata
    case Metadata.name:
      return 'mdi-alpha-m-box';
    case MetaBlocks.name:
      return 'mdi-alpha-b-circle';
    case MetaInlines.name:
      return 'mdi-alpha-i-circle';
    case MetaMap.name:
      return 'mdi-alpha-m-circle';
    case MetaList.name:
      return 'mdi-alpha-l-circle';
    case MetaString.name:
      return 'mdi-alpha-s-circle';
    case MetaBool.name:
      return 'mdi-checkbox-marked-circle';
    default:
      return 'mdi-square-rounded-outline';
  }
}

export function compatibleNodes(typename: string): string[] {
  if (!COMPATIBLE_BLOCKS || COMPATIBLE_BLOCKS.length === 0) {
    COMPATIBLE_BLOCKS = [
      [Paragraph.name, Plain.name, Heading.name],
      [Div.name, Blockquote.name, Figure.name, IndexTerm.name, IndexDiv.name],
      [BulletList.name, OrderedList.name],
      [RawBlock.name, CodeBlock.name],
    ];
  }
  const compatibles = COMPATIBLE_BLOCKS.find((cb) => cb.includes(typename));
  return compatibles ? compatibles.filter((cb) => cb != typename) : [];
}

export function areCompatible(typename1: string, typename2: string) {
  return (
    typename1 == typename2 || compatibleNodes(typename1).includes(typename2)
  );
}

export function attrsForConversionTo(
  fromNode: Node,
  toType: NodeType | string,
  config?: PundokEditorConfig,
): Record<string, any> {
  const fromTypeName = fromNode.type.name;
  const toTypeName = isString(toType) ? toType : toType.name;
  if (fromTypeName == toTypeName) return fromNode.attrs;
  if (toTypeName === RawBlock.name) {
    const format =
      fromTypeName === CodeBlock.name
        ? fromNode.attrs.classes[0]
        : config?.defaultRawFormat;
    if (format) return { format };
  } else if (fromTypeName === RawBlock.name && toTypeName === CodeBlock.name) {
    return { classes: [fromNode.attrs.format] };
  } else if (fromTypeName === IndexTerm.name) {
    return {
      ...fromNode.attrs,
      classes: removeClass(fromNode.attrs.classes, INDEX_TERM_CLASS),
    };
  } else if (toTypeName === IndexTerm.name) {
    return {
      ...fromNode.attrs,
      classes: setClass(fromNode.attrs.classes, INDEX_TERM_CLASS),
    };
  } else if (fromTypeName === IndexDiv.name) {
    return {
      ...fromNode.attrs,
      classes: removeClass(fromNode.attrs.classes, INDEX_CLASS),
    };
  } else if (toTypeName === IndexDiv.name) {
    return {
      ...fromNode.attrs,
      classes: setClass(fromNode.attrs.classes, INDEX_CLASS),
    };
  }
  return {};
}

function removeClass(classes: string[], className: string): string[] {
  return classes.filter((c) => c === className);
}

function setClass(classes: string[], className: string): string[] {
  const newClasses = removeClass(classes, className);
  newClasses.push(className);
  return newClasses;
}
