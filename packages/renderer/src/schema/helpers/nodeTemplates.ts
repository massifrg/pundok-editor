import { Attrs, Node, NodeType, ResolvedPos, Schema } from '@tiptap/pm/model';
import {
  DEFAULT_INDEX_NAME,
  DEFAULT_RAW_BLOCK_FORMAT,
  INDEX_CLASS,
  INDEX_NAME_ATTR,
  INDEX_TERM_CLASS,
  NODE_NAME_BLOCKQUOTE,
  NODE_NAME_BULLET_LIST,
  NODE_NAME_CODE_BLOCK,
  NODE_NAME_DEFINITION_DATA,
  NODE_NAME_DEFINITION_LIST,
  NODE_NAME_DEFINITION_TERM,
  NODE_NAME_DIV,
  NODE_NAME_EMPTY_SPAN,
  NODE_NAME_FIGURE,
  NODE_NAME_FIGURE_CAPTION,
  NODE_NAME_HEADING,
  NODE_NAME_HORIZONTAL_RULE,
  NODE_NAME_IMAGE,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_INDEX_TERM,
  NODE_NAME_LINE,
  NODE_NAME_LINE_BLOCK,
  NODE_NAME_LIST_ITEM,
  NODE_NAME_META_BLOCKS,
  NODE_NAME_META_BOOL,
  NODE_NAME_META_INLINES,
  NODE_NAME_META_LIST,
  NODE_NAME_META_MAP,
  NODE_NAME_META_MAP_ENTRY,
  NODE_NAME_META_STRING,
  NODE_NAME_METADATA,
  NODE_NAME_NOTE,
  NODE_NAME_ORDERED_LIST,
  NODE_NAME_PANDOC_TABLE,
  NODE_NAME_PARAGRAPH,
  NODE_NAME_PLAIN,
  NODE_NAME_RAW_BLOCK,
  NODE_NAME_RAW_INLINE,
  NODE_NAME_SHORT_CAPTION,
  PundokEditorConfig,
} from '../../common';
import { createPandocTable, innerNodeDepth } from '.';
import { isString } from 'lodash';
import { EditorState } from '@tiptap/pm/state';

export function nodesWithTemplate(): string[] {
  return [
    NODE_NAME_PARAGRAPH,
    NODE_NAME_DIV,
    NODE_NAME_RAW_BLOCK,
    NODE_NAME_HORIZONTAL_RULE,
    NODE_NAME_DEFINITION_LIST,
    NODE_NAME_DEFINITION_TERM,
    NODE_NAME_DEFINITION_DATA,
    NODE_NAME_BULLET_LIST,
    NODE_NAME_ORDERED_LIST,
    NODE_NAME_LIST_ITEM,
    NODE_NAME_PLAIN,
    NODE_NAME_LINE_BLOCK,
    NODE_NAME_LINE,
    NODE_NAME_CODE_BLOCK,
    NODE_NAME_BLOCKQUOTE,
    NODE_NAME_PANDOC_TABLE,
    NODE_NAME_FIGURE,
    NODE_NAME_FIGURE_CAPTION,
    NODE_NAME_SHORT_CAPTION,
    NODE_NAME_INDEX_TERM,
    NODE_NAME_INDEX_DIV,
    NODE_NAME_META_BLOCKS,
    NODE_NAME_META_BOOL,
    NODE_NAME_META_INLINES,
    NODE_NAME_META_LIST,
    NODE_NAME_META_MAP,
    NODE_NAME_META_MAP_ENTRY,
    NODE_NAME_META_STRING,
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
    case NODE_NAME_PARAGRAPH:
      node = para(schema, '');
      break;
    case NODE_NAME_DIV:
      node = (para && nodeType.create(null, para(schema, ''))) || null;
      break;
    case NODE_NAME_DEFINITION_LIST:
      {
        const term = nodes.definitionTerm.create(null, schema.text('term'));
        const data = nodes.definitionData.create(null, para(schema, 'data'));
        node = nodeType.create(null, [term, data]);
      }
      break;
    case NODE_NAME_DEFINITION_TERM:
      node = nodeType.create(null, schema.text('term'));
      break;
    case NODE_NAME_DEFINITION_DATA:
      node = nodeType.create(null, para(schema, 'data')) || null;
      break;
    case NODE_NAME_BULLET_LIST:
    case NODE_NAME_ORDERED_LIST:
      {
        const item = nodes.listItem.create(null, para(schema, 'item'));
        node = nodeType.create(null, item);
      }
      node = node;
      break;
    case NODE_NAME_LIST_ITEM:
      node = nodeType.create(null, para(schema, 'item')) || null;
      break;
    case NODE_NAME_HORIZONTAL_RULE:
      node = nodeType.create();
      break;
    case NODE_NAME_RAW_BLOCK:
      node = nodeType.create({
        format: config?.defaultRawFormat || DEFAULT_RAW_BLOCK_FORMAT,
        text: '',
      });
      break;
    case NODE_NAME_PLAIN:
      node = nodeType.create(null, schema.text('plain'));
      break;
    case NODE_NAME_LINE_BLOCK:
      {
        const line = nodes.line.create(null, schema.text(' '));
        node = nodeType.create(null, line);
      }
      node = node;
      break;
    case NODE_NAME_LINE:
      node = nodeType.create(null, schema.text('line'));
      break;
    case NODE_NAME_CODE_BLOCK:
      node = nodeType.create(null, schema.text('code'));
      break;
    case NODE_NAME_PANDOC_TABLE:
      node = createPandocTable(schema, 3, 3, {
        cellContainer: 'plain',
        enumerateCells: true,
      });
      break;
    case NODE_NAME_BLOCKQUOTE:
      node = nodeType.create(null, para(schema));
      break;
    case NODE_NAME_FIGURE_CAPTION:
      node = nodeType.create(null, para(schema, 'caption'));
      break;
    case NODE_NAME_SHORT_CAPTION:
      node = nodeType.create(null, schema.text('short caption'));
      break;
    case NODE_NAME_FIGURE:
      node = nodeType.create(null, para(schema));
      break;
    case NODE_NAME_INDEX_TERM:
      node = nodeType.create(null, para(schema, 'index term'));
      let indexName = DEFAULT_INDEX_NAME;
      const { state, $pos, pos } = context || {};
      if (state && ($pos || pos)) {
        const rpos: ResolvedPos = $pos || state.doc.resolve(pos!);
        const depth = innerNodeDepth(
          rpos,
          (n) => n.type.name === NODE_NAME_INDEX_DIV,
        );
        if (depth)
          indexName = rpos.node(depth).attrs.kv[INDEX_NAME_ATTR] || indexName;
      }
      attrs = {
        classes: [INDEX_TERM_CLASS],
        kv: { [INDEX_NAME_ATTR]: indexName },
      };
      break;
    case NODE_NAME_INDEX_DIV: {
      const kv = { [INDEX_NAME_ATTR]: DEFAULT_INDEX_NAME };
      const term = nodes.indexTerm.create(
        { classes: [INDEX_TERM_CLASS], kv },
        para(schema, 'index term'),
      );
      node = nodeType.create({ classes: [INDEX_CLASS], kv }, term);
      break;
    }
    case NODE_NAME_METADATA:
      node = nodeType.create(
        null,
        nodes.metaInlines.create(null, schema.text('meta inlines')),
      );
      break;
    case NODE_NAME_META_BLOCKS:
      node = nodeType.create(null, para(schema, 'meta blocks'));
      break;
    case NODE_NAME_META_INLINES:
      node = nodeType.create(null, schema.text('meta inlines'));
      break;
    case NODE_NAME_META_BOOL:
      node = nodeType.create();
      break;
    case NODE_NAME_META_STRING:
      node = nodeType.create(null, schema.text('meta string'));
      break;
    case NODE_NAME_META_MAP_ENTRY:
      {
        const metaInlines = nodes.metaInlines.create(null, schema.text('meta inlines'));
        node = nodeType.create({ text: 'key' }, metaInlines);
      }
      break;
    case NODE_NAME_META_MAP:
      {
        const metaInlines = nodes.metaInlines.create(null, schema.text('meta inlines'));
        const entry = nodes.metaMapEntry.create({ text: 'key' }, metaInlines);
        node = nodeType.create({ text: 'key' }, entry);
      }
      break;
    case NODE_NAME_META_LIST: {
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
    case NODE_NAME_PARAGRAPH:
      return 'mdi-format-paragraph';
    case NODE_NAME_DIV:
      return 'mdi-alpha-d-circle-outline';
    case NODE_NAME_DEFINITION_LIST:
      return 'mdi-format-list-text';
    case NODE_NAME_DEFINITION_TERM:
      return 'mdi-alpha-t-box-outline';
    case NODE_NAME_DEFINITION_DATA:
      return 'mdi-alpha-d-box-outline';
    case NODE_NAME_BULLET_LIST:
      return 'mdi-format-list-bulleted';
    case NODE_NAME_ORDERED_LIST:
      return 'mdi-format-list-numbered';
    case NODE_NAME_LIST_ITEM:
      return 'mdi-playlist-plus';
    case NODE_NAME_HORIZONTAL_RULE:
      return 'mdi-minus';
    case NODE_NAME_RAW_BLOCK:
      return 'mdi-code-tags';
    case NODE_NAME_PLAIN:
      return 'mdi-alpha-p-box-outline';
    case NODE_NAME_LINE_BLOCK:
      return 'mdi-format-list-group';
    case NODE_NAME_LINE:
      return 'mdi-playlist-plus';
    case NODE_NAME_CODE_BLOCK:
      return 'mdi-code-braces';
    case NODE_NAME_BLOCKQUOTE:
      return 'mdi-format-quote-close';
    case NODE_NAME_PANDOC_TABLE:
      return 'mdi-table';
    case NODE_NAME_FIGURE:
      return 'mdi-image-frame';
    case NODE_NAME_FIGURE_CAPTION:
      return 'mdi-image-text';
    case NODE_NAME_SHORT_CAPTION:
      return 'mdi-tag-text-outline';
    case NODE_NAME_INDEX_TERM:
      return 'mdi-cursor-pointer';
    case NODE_NAME_INDEX_DIV:
      return 'mdi-book-alphabet';
    // inlines
    case NODE_NAME_EMPTY_SPAN:
      return 'mdi-map-marker-outline';
    case NODE_NAME_IMAGE:
      return 'mdi-image-outline';
    case NODE_NAME_NOTE:
      return 'mdi-note';
    case NODE_NAME_RAW_INLINE:
      return 'mdi-code-tags';
    // metadata
    case NODE_NAME_METADATA:
      return 'mdi-alpha-m-box';
    case NODE_NAME_META_BLOCKS:
      return 'mdi-alpha-b-circle';
    case NODE_NAME_META_INLINES:
      return 'mdi-alpha-i-circle';
    case NODE_NAME_META_MAP:
      return 'mdi-view-list';
    case NODE_NAME_META_LIST:
      return 'mdi-format-align-justify';
    // return 'mdi-view-list-outline';
    case NODE_NAME_META_STRING:
      return 'mdi-alpha-s-circle';
    case NODE_NAME_META_BOOL:
      return 'mdi-checkbox-marked-circle';
    default:
      return 'mdi-square-rounded-outline';
  }
}

export function compatibleNodes(typename: string): string[] {
  if (!COMPATIBLE_BLOCKS || COMPATIBLE_BLOCKS.length === 0) {
    COMPATIBLE_BLOCKS = [
      [NODE_NAME_PARAGRAPH, NODE_NAME_PLAIN, NODE_NAME_HEADING],
      [NODE_NAME_DIV, NODE_NAME_BLOCKQUOTE, NODE_NAME_FIGURE, NODE_NAME_INDEX_TERM, NODE_NAME_INDEX_DIV],
      [NODE_NAME_BULLET_LIST, NODE_NAME_ORDERED_LIST],
      [NODE_NAME_RAW_BLOCK, NODE_NAME_CODE_BLOCK]
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
  if (toTypeName === NODE_NAME_RAW_BLOCK) {
    const format =
      fromTypeName === NODE_NAME_CODE_BLOCK
        ? fromNode.attrs.classes[0]
        : config?.defaultRawFormat;
    if (format) return { format };
  } else if (fromTypeName === NODE_NAME_RAW_BLOCK && toTypeName === NODE_NAME_CODE_BLOCK) {
    return { classes: [fromNode.attrs.format] };
  } else if (fromTypeName === NODE_NAME_INDEX_TERM) {
    return {
      ...fromNode.attrs,
      classes: removeClass(fromNode.attrs.classes, INDEX_TERM_CLASS),
    };
  } else if (toTypeName === NODE_NAME_INDEX_TERM) {
    return {
      ...fromNode.attrs,
      classes: setClass(fromNode.attrs.classes, INDEX_TERM_CLASS),
    };
  } else if (fromTypeName === NODE_NAME_INDEX_DIV) {
    return {
      ...fromNode.attrs,
      classes: removeClass(fromNode.attrs.classes, INDEX_CLASS),
    };
  } else if (toTypeName === NODE_NAME_INDEX_DIV) {
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
