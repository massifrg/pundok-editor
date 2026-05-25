import { Attrs, Mark, Node, NodeType, ResolvedPos, Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
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
  NODE_NAME_FIGURE_CAPTION,
  NODE_NAME_FIGURE,
  NODE_NAME_HEADING,
  NODE_NAME_HORIZONTAL_RULE,
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
  NODE_NAME_ORDERED_LIST,
  NODE_NAME_PANDOC_TABLE,
  NODE_NAME_PARAGRAPH,
  NODE_NAME_PLAIN,
  NODE_NAME_RAW_BLOCK,
  NODE_NAME_SHORT_CAPTION,
  PundokEditorConfig,
} from '../../common';
import { isString } from 'lodash-es';
import { RawBlock } from '../nodes';
import { createPandocTable } from './pandocTable';
import { innerNodeDepth } from './nodeDepth';
import { icons } from '../../components/helpers';

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

/**
 * Create a text node from a string, only if the string is non empty, otherwise return `null`.
 * @param schema
 * @param text The string of the text node.
 * @param marks The optional marks of the text node.
 * @returns
 */
export function textNode(schema: Schema, text?: string, marks?: readonly Mark[] | null): Node | null {
  if (isString(text) && text.length > 0)
    return schema.text(text, marks)
  return null
}

/**
 * Create a paragraph node from a string.
 * @param schema
 * @param text The text of the paragraph.
 * @param textMarks The marks of the text node.
 * @returns 
 */
export function paragraphNode(
  schema: Schema,
  text?: string,
  textMarks?: readonly Mark[] | null
): Node | null {
  const paragraphType = schema.nodes[NODE_NAME_PARAGRAPH]
  if (paragraphType)
    return paragraphType.create(null, textNode(schema, text, textMarks));
  return null
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
      node = paragraphNode(schema, '');
      break;
    case NODE_NAME_DIV:
      node = (paragraphNode && nodeType.create(null, paragraphNode(schema, ''))) || null;
      break;
    case NODE_NAME_DEFINITION_LIST:
      {
        const term = nodes[NODE_NAME_DEFINITION_TERM].create(null, textNode(schema, 'term'));
        const data = nodes[NODE_NAME_DEFINITION_DATA].create(null, paragraphNode(schema, 'data'));
        node = nodeType.create(null, [term, data]);
      }
      break;
    case NODE_NAME_DEFINITION_TERM:
      node = nodeType.create(null, schema.text('term'));
      break;
    case NODE_NAME_DEFINITION_DATA:
      node = nodeType.create(null, paragraphNode(schema, 'data')) || null;
      break;
    case NODE_NAME_BULLET_LIST:
    case NODE_NAME_ORDERED_LIST:
      {
        const item = nodes[NODE_NAME_LIST_ITEM].create(null, paragraphNode(schema, 'item'));
        node = nodeType.create(null, item);
      }
      node = node;
      break;
    case NODE_NAME_LIST_ITEM:
      node = nodeType.create(null, paragraphNode(schema, 'item')) || null;
      break;
    case NODE_NAME_HORIZONTAL_RULE:
      node = nodeType.create();
      break;
    case NODE_NAME_RAW_BLOCK:
      node = nodeType.create({
        format: config?.defaultRawFormat
          || RawBlock.options?.defaultFormat
          || DEFAULT_RAW_BLOCK_FORMAT,
        text: '',
      });
      break;
    case NODE_NAME_PLAIN:
      node = nodeType.create(null, schema.text('plain'));
      break;
    case NODE_NAME_LINE_BLOCK:
      {
        const line = nodes[NODE_NAME_LINE].create(null, schema.text(' '));
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
      node = nodeType.create(null, paragraphNode(schema));
      break;
    case NODE_NAME_FIGURE_CAPTION:
      node = nodeType.create(null, paragraphNode(schema, 'caption'));
      break;
    case NODE_NAME_SHORT_CAPTION:
      node = nodeType.create(null, schema.text('short caption'));
      break;
    case NODE_NAME_FIGURE:
      node = nodeType.create(null, paragraphNode(schema));
      break;
    case NODE_NAME_INDEX_TERM:
      node = nodeType.create(null, paragraphNode(schema, 'index term'));
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
      const term = nodes[NODE_NAME_INDEX_TERM].create(
        { classes: [INDEX_TERM_CLASS], kv },
        paragraphNode(schema, 'index term'),
      );
      node = nodeType.create({ classes: [INDEX_CLASS], kv }, term);
      break;
    }
    case NODE_NAME_METADATA:
      node = nodeType.create(
        null,
        nodes[NODE_NAME_META_INLINES].create(null, schema.text('meta inlines')),
      );
      break;
    case NODE_NAME_META_BLOCKS:
      node = nodeType.create(null, paragraphNode(schema, 'meta blocks'));
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
        const metaInlines = nodes[NODE_NAME_META_INLINES].create(null, schema.text('meta inlines'));
        node = nodeType.create({ text: 'key' }, metaInlines);
      }
      break;
    case NODE_NAME_META_MAP:
      {
        const metaInlines = nodes[NODE_NAME_META_INLINES].create(null, schema.text('meta inlines'));
        const entry = nodes[NODE_NAME_META_MAP_ENTRY].create({ text: 'key' }, metaInlines);
        node = nodeType.create({ text: 'key' }, entry);
      }
      break;
    case NODE_NAME_META_LIST: {
      const meta1 = nodes[NODE_NAME_META_INLINES].create(null, schema.text('meta item'));
      const meta2 = nodes[NODE_NAME_META_INLINES].create(null, schema.text('meta item'));
      node = nodeType.create(null, [meta1, meta2]);
      break;
    }
    default:
      return null;
  }
  return node ? { node, attrs } : null;
}

export function nodeIcon(typename?: string) {
  return typename && icons[typename] || 'node_unknown';
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
        : config?.defaultRawFormat || RawBlock.options?.defaultFormat || DEFAULT_RAW_BLOCK_FORMAT;
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
