// adapted from https://github.com/ProseMirror/prosemirror-markdown/blob/master/src/from_markdown.ts
import { isArray, isString } from 'lodash';
import type { Attrs, Schema, NodeType } from '@tiptap/pm/model';
import { Mark, Node } from '@tiptap/pm/model';
import { pandocColSpecToPmColSpec } from './colSpec';
import { listAttributesToPMAttrs } from './listAttributes';
import { schema } from './PandocSchema';
import {
  pandocTargetToImagePMAttrs,
  pandocTargetToLinkPMAttrs,
} from './target';

import type { PandocJson, PandocJsonDocument } from '../../pandoc';
import { DEFAULT_PANDOC_API_VERSION, isPandocJsonInline } from '../../pandoc';
import { pandocAlignmentToTextAlign } from './alignments';
import {
  isCustomStyleOnly,
  PandocAttr,
  pandocAttrAsPmAttrs,
} from './pandocAttr';
import { Div, IndexDiv, IndexTerm } from '..';
import {
  DEFAULT_NOTE_TYPE,
  INDEX_CLASS,
  INDEX_TERM_CLASS,
  Index,
  NOTE_TYPE_ATTRIBUTE,
  NoteStyle,
} from '../../common';

function maybeMerge(a: Node, b: Node): Node | undefined {
  if (a.isText && b.isText && Mark.sameSet(a.marks, b.marks))
    return (a as any).withText(a.text! + b.text!);
}

// Object used to track the context of a running parse.
class PandocJsonParseState {
  stack: {
    type: NodeType;
    attrs: Attrs | null;
    content: Node[];
    marks: readonly Mark[];
  }[];
  indexRefClasses: Record<string, Index> = {};
  currentParaCustomStyle?: string;
  defaultNoteType: string = DEFAULT_NOTE_TYPE;
  currentNoteType?: string;
  currentNoteAttrs?: Record<string, any>;

  constructor(
    readonly schema: Schema,
    readonly pandocHandlers: {
      [pandocItem: string]: (
        state: PandocJsonParseState,
        pandocItem: PandocJson,
      ) => void;
    },
    readonly options?: PandocJsonParserOptions,
  ) {
    this.stack = [
      { type: schema.topNodeType, attrs: null, content: [], marks: Mark.none },
    ];
    if (options?.indices)
      options.indices.forEach((i) => {
        this.indexRefClasses[i.refClass] = i;
      });
    if (options?.noteStyles) {
      this.defaultNoteType =
        options.noteStyles.find((ns) => ns.default === true)?.noteType ||
        DEFAULT_NOTE_TYPE;
    }
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  push(elt: Node) {
    if (this.stack.length) this.top().content.push(elt);
  }

  // Adds the given text to the current position in the document,
  // using the current marks as styling.
  addText(text: string) {
    if (!text) return;
    const top = this.top(),
      nodes = top.content,
      last = nodes[nodes.length - 1];
    const node = this.schema.text(text, top.marks);
    let merged;
    if (last && (merged = maybeMerge(last, node)))
      nodes[nodes.length - 1] = merged;
    else nodes.push(node);
  }

  // Adds the given mark to the set of active marks.
  openMark(mark: Mark) {
    const top = this.top();
    top.marks = mark.addToSet(top.marks);
  }

  // Removes the given mark from the set of active marks.
  closeMark(mark: Mark) {
    const top = this.top();
    top.marks = mark.removeFromSet(top.marks);
  }

  transformMetaMapContents(metamap: Record<string, PandocJson>): PandocJson[] {
    return Object.entries(metamap || {}).map(([mname, mvalue]) => ({
      t: 'MetaMapEntry',
      c: [mname, [mvalue]],
    }))
  }

  parseContents(primaryItems: PandocJson[], alternativeItems?: PandocJson[]) {
    // console.log(`parseContents: ${items.map(i => i.t)}`)
    // if (alternativeItems) console.log(JSON.stringify(alternativeItems))
    const items =
      alternativeItems && primaryItems.length == 0
        ? alternativeItems
        : primaryItems;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const handler = this.pandocHandlers[item.t];
      if (!handler)
        throw new Error('Type `' + item.t + '` not supported by Pandoc parser');
      handler(this, item);
    }
  }

  // Add a node at the current position.
  addNode(type: NodeType, attrs: Attrs | null, content?: readonly Node[]) {
    const top = this.top();
    const node = type.createAndFill(attrs, content, top ? top.marks : []);
    if (!node) return null;
    this.push(node);
    return node;
  }

  // Wrap subsequent content in a node of the given type.
  openNode(type: NodeType, attrs: Attrs | null) {
    this.stack.push({
      type: type,
      attrs: attrs,
      content: [],
      marks: Mark.none,
    });
  }

  // Close and return the node that is currently on top of the stack.
  closeNode() {
    const info = this.stack.pop()!;
    return this.addNode(info.type, info.attrs, info.content);
  }
}

function attrs(
  spec: ParseSpec,
  pandocItem: PandocJson,
  state: PandocJsonParseState,
) {
  if (spec.getAttrs) return spec.getAttrs(pandocItem, state);
  // For backwards compatibility when `attrs` is a Function
  else if (spec.attrs instanceof Function) return spec.attrs(pandocItem);
  else return spec.attrs;
}

function noOp() {
  /* eslint-disable no-empty-function */
}

function withParent(parent: PandocJson, children: PandocJson[]): PandocJson[] {
  children.forEach((c) => {
    c.p = parent;
  });
  return children;
}

function parseChildren(
  state: PandocJsonParseState,
  spec: ParseSpec,
  pandocItem: PandocJson,
): void {
  if (spec.parseChildren) {
    spec.parseChildren.forEach((child) => {
      if (child.isText) {
        state.addText(pandocItem.c[child.index]);
      } else if (child.blessAs) {
        if (pandocItem.c) {
          state.parseContents(
            [
              {
                t: child.blessAs,
                c: pandocItem.c[child.index],
                p: pandocItem,
              },
            ],
            spec.contentsIfEmpty,
          );
        }
      } else if (child.blessArrayAs) {
        const name: string = child.blessArrayAs;
        // console.log(pandocItem.c[child.index])
        const contents: PandocJson[] = (
          pandocItem.c[child.index] as PandocJson[]
        ).map((c) => ({
          t: name,
          c: c,
          // p: pandocItem
        }));
        // console.log(`contents: ${JSON.stringify(contents)}`)
        state.parseContents(contents, spec.contentsIfEmpty);
      } else {
        // console.log(`children: ${JSON.stringify(pandocItem.c[child.index])}`)
        state.parseContents(
          withParent(pandocItem, pandocItem.c[child.index] as PandocJson[]),
          spec.contentsIfEmpty,
        );
      }
    });
  } else if (pandocItem.c) {
    if (isArray(pandocItem.c)) {
      const contents = spec.blessContentsAs
        ? pandocItem.c.map((i) => ({ t: spec.blessContentsAs, c: i }))
        : pandocItem.c;
      state.parseContents(contents, spec.contentsIfEmpty);
    }
  }
}

function countChildren(spec: ParseSpec, pandocItem: PandocJson): number {
  let count = 0;
  if (spec.parseChildren) {
    let childItem: any;
    spec.parseChildren.forEach((child) => {
      childItem = pandocItem.c[child.index];
      // childItem can be null in short captions
      count += childItem ? childItem.length : 0;
    });
  } else if (pandocItem.c) {
    if (isArray(pandocItem.c)) count += pandocItem.c.length;
    else count += 1;
  }
  return count;
}

function pandocHandlers(
  schema: Schema,
  pandocItems: { [pandocItem: string]: ParseSpec },
) {
  const handlers: {
    [pandocItem: string]: (
      state: PandocJsonParseState,
      pandocItem: PandocJson,
    ) => void;
  } = Object.create(null);
  for (const type in pandocItems) {
    const spec = pandocItems[type];
    if (spec.handler) {
      handlers[type] = spec.handler(spec, schema);
    } else if (spec.block) {
      const nodeType = schema.nodes[spec.block];
      handlers[type] = (state, pandocItem) => {
        if (spec.debug) {
          console.log(`type: ${type}, spec: ${JSON.stringify(spec)}`);
          // if (type.startsWith('Table')) console.log(`children: ${JSON.stringify(pandocItem.c)}`)
        }
        const dontCreateBecauseEmpty =
          spec.dontCreateIfEmpty && countChildren(spec, pandocItem) == 0;
        if (!dontCreateBecauseEmpty) {
          state.openNode(nodeType, attrs(spec, pandocItem, state));
          parseChildren(state, spec, pandocItem);
          state.closeNode();
        }
      };
    } else if (spec.node) {
      const nodeType = schema.nodes[spec.node];
      handlers[type] = (state, pandocItem) => {
        if (spec.debug)
          console.log(
            `"node" spec, type: ${type}, spec: ${JSON.stringify(spec)}`,
          );
        return state.addNode(nodeType, attrs(spec, pandocItem, state));
      };
    } else if (spec.mark) {
      const markType = schema.marks[spec.mark];
      handlers[type] = (state, pandocItem) => {
        if (spec.debug)
          console.log(
            `"mark" spec, type: ${type}, spec: ${JSON.stringify(spec)}`,
          );
        const mark = markType.create(attrs(spec, pandocItem, state));
        state.openMark(mark);
        parseChildren(state, spec, pandocItem);
        state.closeMark(mark);
      };
    } else if (spec.justParseContents) {
      handlers[type] = (state, pandocItem) => {
        // console.log(`type: ${type}, spec: ${JSON.stringify(spec)}`)
        parseChildren(state, spec, pandocItem);
      };
    } else if (spec.ignore) {
      handlers[type] = noOp;
    } else {
      throw new RangeError('Unrecognized parsing spec ' + JSON.stringify(spec));
    }
  }

  handlers.Str = (state, pandocItem) => state.addText(pandocItem.c);
  handlers.Space = (state) => state.addText(' ');

  return handlers;
}

interface ParseChild {
  /// Child's index in pandocItem.c
  index: number;
  /// When true, the content is text, so no need to parse children
  isText?: boolean;
  /// Wrap a child in a PandocJSON when it has no 't' and 'c': childContent => { t: blessName, c: childContent }
  blessAs?: string;
  /// Like blessAs, but for arrays
  blessArrayAs?: string;
}

interface ParseSpec {
  /// A custom handler
  handler?: (
    spec: ParseSpec,
    schema: Schema,
  ) => (state: PandocJsonParseState, pandocItem: PandocJson) => void;

  /// This pandoc item maps to a single node, whose type can be looked up
  /// in the schema under the given name. Exactly one of `node`,
  /// `block`, or `mark` must be set.
  node?: string;

  /// This pandoc item (unless `noCloseToken` is true) comes in `_open`
  /// and `_close` variants (which are appended to the base item
  /// name provides a the object property), and wraps a block of
  /// content. The block should be wrapped in a node of the type
  /// named to by the property's value. If the item does not have
  /// `_open` or `_close`, use the `noCloseToken` option.
  block?: string;

  /// This pandoc item (again, unless `noCloseToken` is true) also comes
  /// in `_open` and `_close` variants, but should add a mark
  /// (named by the value) to its content, rather than wrapping it
  /// in a node.
  mark?: string;

  /// Attributes for the node or mark. When `getAttrs` is provided,
  /// it takes precedence.
  attrs?: Attrs | null;

  /// A function used to compute the attributes for the node or mark
  /// that takes a pandoc item (Inline or Block) and
  /// returns an attribute object.
  getAttrs?: (json: PandocJson, state: PandocJsonParseState) => Attrs | null;

  /// Indicates that the pandoc item has no `_open` or `_close` for the nodes.
  /// This defaults to `true` for `code_inline`, `code_block` and `fence`.
  // noCloseToken?: boolean

  /// When true, parse contents without creating any node or mark
  justParseContents?: boolean;

  /// When true, ignore content for the matched pandoc item.
  ignore?: boolean;

  /// Specify how to parse children
  parseChildren?: ParseChild[];

  /// Wrap every item in contents in a type:
  /// { t: 'BulletList', c: [ [...], [...] ] } =>
  /// { t: 'BulletList', c: [ { t: 'ListItem', c: [...] }, { t: 'ListItem', c: [...] } ] }
  blessContentsAs?: string;

  /// log debug info when true
  debug?: boolean;

  /// if it has no contents, don't create (for caption, table head and foot)
  dontCreateIfEmpty?: boolean;

  /// if it has no contents, fill with this
  contentsIfEmpty?: PandocJson[];
}

export interface PandocJsonParserOptions extends Record<string, any> {
  indices?: Index[];
  noteStyles?: NoteStyle[];
}

/// A configuration of a Pandoc parser.
/// Such a parser runs the custom rules it is given over
/// the pandoc items to create a ProseMirror document tree.
export class PandocJsonParser {
  /// @internal
  pandocHandlers: {
    [pandocItem: string]: (
      state: PandocJsonParseState,
      pandocItem: PandocJson,
    ) => void;
  };

  /// Create a parser with the given configuration.
  constructor(
    /// The parser's document schema.
    readonly schema: Schema,
    /// The value of the `pandocItems` object used to construct this parser.
    readonly pandocItems: { [name: string]: ParseSpec },
    /// Options to modify parsing (i.e. indices)
    readonly options?: PandocJsonParserOptions,
  ) {
    this.pandocHandlers = pandocHandlers(schema, pandocItems);
  }

  /// Parse the contents of a JSON Pandoc file,
  /// and create a ProseMirror document as prescribed by this parser's
  /// rules.
  parse(pandocDoc: string | PandocJsonDocument): Node | null {
    const pdoc: PandocJsonDocument = isString(pandocDoc)
      ? JSON.parse(pandocDoc)
      : pandocDoc;
    const state = new PandocJsonParseState(
      this.schema,
      this.pandocHandlers,
      this.options,
    );
    let doc;
    const metaBlock = {
      t: 'metadata',
      c: state.transformMetaMapContents(pdoc.meta)
    };
    state.parseContents([metaBlock, ...pdoc.blocks]);
    do {
      doc = state.closeNode();
    } while (state.stack.length);
    return doc || this.schema.topNodeType.createAndFill();
  }
}

export function pandocJsonToPMNode(
  json: string | PandocJsonDocument,
  options?: PandocJsonParserOptions,
): Node {
  const parser = new PandocJsonParser(
    schema,
    PANDOC_JSON_PARSER_RULES,
    options,
  );
  const doc = parser.parse(json);
  return Node.fromJSON(schema, JSON.parse(JSON.stringify(doc)));
}

export function parseJsonFragmentToPMJson(
  pandocFragment: PandocJson | PandocJson[],
  options?: PandocJsonParserOptions,
): Node | null {
  const items: PandocJson[] = isArray(pandocFragment)
    ? pandocFragment
    : [pandocFragment];
  const blocks: PandocJson[] =
    items.length === 0 || (items.length > 0 && isPandocJsonInline(items[0]))
      ? [{ t: 'Plain', c: items }]
      : items;
  const pdoc: PandocJsonDocument = {
    'pandoc-api-version': DEFAULT_PANDOC_API_VERSION,
    meta: {},
    blocks,
  };
  const parser = new PandocJsonParser(
    schema,
    PANDOC_JSON_PARSER_RULES,
    options,
  );
  const doc = parser.parse(pdoc);
  const json = Node.fromJSON(schema, JSON.parse(JSON.stringify(doc)));
  return json.lastChild;
}

export const getPandocAttrs = ([id, classes, attributes]: [
  id: string,
  classes: string[],
  attributes: [key: string, value: string][],
]) => {
  const kv: Record<string, string> = {};
  attributes.forEach(([k, v]) => {
    kv[k] = v;
  });
  return { id, classes, kv } as PandocAttr;
};

export function getNoteAttrsOld(
  noteJson: PandocJson,
  defaultNoteType?: string,
): PandocAttr {
  const noteContents = noteJson.t === 'Note' && noteJson.c;
  const onlyOneDiv =
    noteContents.length === 1 &&
    noteContents[0].t === 'Div' &&
    (noteContents[0] as PandocJson);
  const attrs = (onlyOneDiv && getPandocAttrs(onlyOneDiv.c[0])) || {
    id: '',
    classes: [],
    kv: {},
  };
  attrs.kv[NOTE_TYPE_ATTRIBUTE] =
    attrs.kv[NOTE_TYPE_ATTRIBUTE] || defaultNoteType || DEFAULT_NOTE_TYPE;
  return attrs;
}

function getCellAttrs(
  json: PandocJson,
  state: PandocJsonParseState,
): Attrs | null {
  const pattrs = getPandocAttrs(json.c[0]);
  const verticalAlign = (pattrs.kv && pattrs.kv['vertical-align']) || 'top';
  const rowspan = parseInt(json.c[2]) || 1;
  const colspan = parseInt(json.c[3]) || 1;
  // const stack = state.stack;
  // const table = stack[stack.length - 3];
  // const row = stack[stack.length - 1];

  // column widths are set by fixTable!

  return {
    ...getPandocAttrs(json.c[0]),
    textAlign: pandocAlignmentToTextAlign(json.c[1].t),
    verticalAlign,
    rowspan,
    colspan,
    colwidth: Array(colspan).fill(0),
  };
}

/// A parser parsing Pandoc JSON
export const PANDOC_JSON_PARSER_RULES: Record<string, ParseSpec> = {
  metadata: {
    block: 'metadata',
  },

  MetaMap: {
    // block: 'metaMap',
    handler: (spec, schema) => (state, metaMap) => {
      // console.log(metaMap)
      state.openNode(schema.nodes.metaMap, null);
      // console.log(`MetaValue: ${text} => ${JSON.stringify(metaValue)}`)
      state.parseContents(state.transformMetaMapContents(metaMap.c));
      state.closeNode();
    },
  },

  MetaMapEntry: {
    block: 'metaMapEntry',
    getAttrs(json, state) {
      return {
        text: json.c[0]
      }
    },
    parseChildren: [{ index: 1 }],
  },

  MetaList: {
    block: 'metaList',
  },

  MetaBlocks: {
    block: 'metaBlocks',
  },

  MetaInlines: {
    block: 'metaInlines',
  },

  MetaString: {
    handler: (spec, schema) => (state, pandocItem) => {
      state.openNode(schema.nodes.metaString, null);
      state.addText(pandocItem.c);
      state.closeNode();
    },
  },

  MetaBool: {
    node: 'metaBool',
    getAttrs: (json) => ({
      value: json.c === true ? 'True' : 'False',
    }),
  },

  Plain: { block: 'plain' },
  Para: {
    // block: 'paragraph'
    handler: (spec, schema) => (state, pandocItem) => {
      const attr = state.currentParaCustomStyle
        ? { customStyle: state.currentParaCustomStyle }
        : {};
      state.openNode(schema.nodes.paragraph, attr);
      parseChildren(state, spec, pandocItem);
      state.closeNode();
    },
  },
  LineBlock: {
    block: 'lineBlock',
    blessContentsAs: 'Line',
  },
  Line: { block: 'line' },
  CodeBlock: {
    block: 'codeBlock',
    getAttrs: (json) => {
      const pa = getPandocAttrs(json.c[0]);
      const language =
        pa.kv.language || (pa.classes.length > 0 ? pa.classes[0] : 'text');
      return { ...pa, language };
    },
    parseChildren: [{ index: 1, isText: true }],
  },
  RawBlock: {
    block: 'rawBlock',
    getAttrs: (json) => ({ format: json.c[0] }),
    parseChildren: [{ index: 1, isText: true }],
  },
  BlockQuote: { block: 'blockquote' },
  ListItem: { block: 'listItem' },
  OrderedList: {
    block: 'orderedList',
    getAttrs: (json) => listAttributesToPMAttrs(json.c[0]),
    parseChildren: [{ index: 1, blessArrayAs: 'ListItem' }],
  },
  BulletList: {
    block: 'bulletList',
    blessContentsAs: 'ListItem',
  },
  DefinitionTerm: { block: 'definitionTerm' },
  DefinitionData: { block: 'definitionData' },
  DefinitionItem: {
    justParseContents: true,
    parseChildren: [
      { index: 0, blessAs: 'DefinitionTerm' },
      { index: 1, blessArrayAs: 'DefinitionData' },
    ],
  },
  DefinitionList: {
    block: 'definitionList',
    blessContentsAs: 'DefinitionItem',
  },
  Header: {
    block: 'heading',
    getAttrs: (json) => ({
      level: parseInt(json.c[0]),
      ...getPandocAttrs(json.c[1]),
    }),
    parseChildren: [{ index: 2 }],
  },
  HorizontalRule: { node: 'horizontalRule' },
  Figure: {
    block: 'figure',
    getAttrs: (json) => ({
      ...getPandocAttrs(json.c[0]),
    }),
    parseChildren: [{ index: 1, blessAs: 'Caption' }, { index: 2 }],
  },
  Table: {
    block: 'pandocTable',
    getAttrs: (json) => ({
      ...getPandocAttrs(json.c[0]),
      ...pandocColSpecToPmColSpec(json.c[2]),
    }),
    parseChildren: [
      { index: 1, blessAs: 'Caption' },
      { index: 3, blessAs: 'TableHead' },
      { index: 4, blessArrayAs: 'TableBody' },
      { index: 5, blessAs: 'TableFoot' },
    ],
  },
  TableHead: {
    attrs: pandocAttrAsPmAttrs,
    block: 'tableHead',
    getAttrs: (json) => getPandocAttrs(json.c[0]),
    parseChildren: [{ index: 1, blessArrayAs: 'TableRow' }],
    dontCreateIfEmpty: true,
  },
  TableBody: {
    block: 'tableBody',
    attrs: {
      ...pandocAttrAsPmAttrs,
      headRows: 0,
      rowHeadColumns: 0,
    },
    getAttrs: (json) => ({
      ...getPandocAttrs(json.c[0]),
      headRows: json.c[2].length,
      rowHeadColumns: parseInt(json.c[1]),
    }),
    parseChildren: [
      { index: 2, blessArrayAs: 'TableRow' },
      { index: 3, blessArrayAs: 'TableRow' },
    ],
  },
  TableFoot: {
    block: 'tableFoot',
    attrs: pandocAttrAsPmAttrs,
    getAttrs: (json) => getPandocAttrs(json.c[0]),
    parseChildren: [{ index: 1, blessArrayAs: 'TableRow' }],
    dontCreateIfEmpty: true,
  },
  TableRow: {
    block: 'tableRow',
    getAttrs: (json) => getPandocAttrs(json.c[0]),
    parseChildren: [{ index: 1, blessArrayAs: 'TableCell' }],
  },
  TableCell: {
    block: 'tableCell',
    getAttrs: getCellAttrs,
    parseChildren: [{ index: 4 }],
    contentsIfEmpty: [{ t: 'Plain', c: [] }],
  },
  TableHeader: {
    block: 'tableHeader',
    getAttrs: getCellAttrs,
    parseChildren: [{ index: 4 }],
    contentsIfEmpty: [{ t: 'Plain', c: [] }],
  },
  Div: {
    handler: (spec, schema) => (state, pandocItem) => {
      const attrs = getPandocAttrs(pandocItem.c[0]);
      const customStyle = attrs.kv['custom-style'];
      const prevParaCustomStyle = state.currentParaCustomStyle;
      const customStyleOnly = isCustomStyleOnly(attrs);
      const noteWrapper = !!(
        state.currentNoteType &&
        attrs &&
        attrs.kv[NOTE_TYPE_ATTRIBUTE]
      );
      const isIndex = attrs.classes.includes(INDEX_CLASS);
      const isIndexTerm = attrs.classes.includes(INDEX_TERM_CLASS);
      if (customStyle) state.currentParaCustomStyle = customStyle;
      const createDiv = !customStyleOnly && !noteWrapper;
      const nodeTypeName = isIndex
        ? IndexDiv.name
        : isIndexTerm
          ? IndexTerm.name
          : Div.name;
      if (createDiv) state.openNode(schema.nodes[nodeTypeName], attrs);
      parseChildren(state, spec, pandocItem);
      if (createDiv) state.closeNode();
      if (customStyle) state.currentParaCustomStyle = prevParaCustomStyle;
    },
    getAttrs: (json) => getPandocAttrs(json.c[0]),
    parseChildren: [{ index: 1 }],
  },
  Null: { node: 'pandocNull' },
  Caption: {
    // block: 'caption',
    handler: (spec, schema) => (state, pandocItem) => {
      const parentTypeName = state.top().type.name;
      if (countChildren(spec, pandocItem) > 0) {
        if (parentTypeName === 'figure') {
          state.openNode(schema.nodes.figureCaption, null);
          parseChildren(state, spec, pandocItem);
          state.closeNode();
        } else if (parentTypeName === 'pandocTable') {
          state.openNode(schema.nodes.caption, null);
          parseChildren(state, spec, pandocItem);
          state.closeNode();
        }
      }
    },
    parseChildren: [{ index: 0, blessAs: 'ShortCaption' }, { index: 1 }],
    dontCreateIfEmpty: true,
  },
  ShortCaption: {
    block: 'shortCaption',
    // parseChildren: [{ index: 0 }]
  },

  Emph: { mark: 'emph' },
  Underline: { mark: 'underline' },
  Strong: { mark: 'strong' },
  Strikeout: { mark: 'strikeout' },
  Superscript: { mark: 'superscript' },
  Subscript: { mark: 'subscript' },
  SmallCaps: { mark: 'smallcaps' },
  Quoted: {
    // mark: 'quoted',
    handler: (spec, schema) => (state, pandocItem) => {
      let quoteMarkType;
      const quoteType = pandocItem.c[0].t;
      switch (quoteType) {
        case 'SingleQuote':
          quoteMarkType = schema.marks.singleQuoted;
          break;
        case 'DoubleQuote':
        default:
          quoteMarkType = schema.marks.doubleQuoted;
      }
      const quoted = quoteMarkType.create();
      state.openMark(quoted);
      parseChildren(state, spec, pandocItem);
      state.closeMark(quoted);
    },
    parseChildren: [{ index: 1 }],
  },
  Cite: {
    mark: 'cite',
    getAttrs: (json) => ({ citations: [] }),
    parseChildren: [{ index: 1 }],
  },
  Code: {
    mark: 'code',
    getAttrs: (json) => {
      const pa = getPandocAttrs(json.c[0]);
      const language =
        pa.kv.language || (pa.classes.length > 0 ? pa.classes[0] : 'text');
      return { ...pa, language };
    },
    parseChildren: [{ index: 1, isText: true }],
  },
  SoftBreak: { node: 'hardBreak', attrs: { soft: true } },
  LineBreak: { node: 'hardBreak', attrs: { soft: false } },
  Math: {
    mark: 'math',
    getAttrs: (json) => ({ mathType: json.c[0].t }),
    parseChildren: [{ index: 1, isText: true }],
  },
  RawInline: {
    node: 'rawInline',
    getAttrs: (json) => ({
      format: json.c[0],
      text: json.c[1],
    }),
    // parseChildren: [{ index: 1, isText: true }],
  },
  Link: {
    mark: 'link',
    getAttrs: (json) => ({
      ...getPandocAttrs(json.c[0]),
      ...pandocTargetToLinkPMAttrs(json.c[2]),
    }),
    parseChildren: [{ index: 1 }],
  },
  Image: {
    handler: (spec, schema) => (state, pandocItem) => {
      const attrs = spec.getAttrs ? spec.getAttrs(pandocItem, state) : null;
      state.openNode(schema.nodes.image, attrs);
      parseChildren(state, spec, pandocItem);
      state.closeNode();
    },
    getAttrs: (json) => {
      return {
        ...getPandocAttrs(json.c[0]),
        ...pandocTargetToImagePMAttrs(json.c[2]),
      };
    },
    parseChildren: [{ index: 1 }],
  },
  Note: {
    // block: 'note',
    handler: (spec, schema) => (state, pandocItem) => {
      // note type set by a surronding Span
      if (state.currentNoteType) {
        state.openNode(schema.nodes.note, state.currentNoteAttrs!);
        parseChildren(state, spec, pandocItem);
        state.closeNode();
      } else {
        // OLD WAY (left here for compatibility):
        // Note contents embedded in a single Div with the note-type attribute
        const attrs: Record<string, any> = getNoteAttrsOld(
          pandocItem,
          state.defaultNoteType,
        );
        attrs.noteType = attrs.kv[NOTE_TYPE_ATTRIBUTE];
        state.currentNoteType = attrs.noteType;
        state.openNode(schema.nodes.note, attrs);
        parseChildren(state, spec, pandocItem);
        state.closeNode();
      }
      state.currentNoteType = undefined;
      state.currentNoteAttrs = undefined;
    },
    // getAttrs: (json, state) => {
    //   let attrs: Record<string, any>
    //   const noteType = state.currentNoteType
    //   if (noteType) {
    //     attrs = state.currentNoteAttrs!
    //   } else {
    //     attrs = getNoteAttrsOld(json, state.defaultNoteType);
    //     attrs.noteType = attrs.kv[NOTE_TYPE_ATTRIBUTE];
    //   }
    //   return attrs;
    // },
  },
  Span: {
    // mark: 'span',
    handler: (spec, schema) => (state, pandocItem) => {
      const children = pandocItem.c[1];
      const attrs = getPandocAttrs(pandocItem.c[0]);
      if (children.length === 0) {
        const indexRefClasses = state.indexRefClasses;
        const refClass = attrs.classes.find((c) => indexRefClasses[c]);
        if (refClass) {
          const index = indexRefClasses[refClass];
          if (!attrs.kv.indexName && index)
            attrs.kv['index-name'] = index.indexName;
          state.openNode(schema.nodes.indexRef, attrs);
        } else {
          state.openNode(schema.nodes.emptySpan, attrs);
        }
        state.closeNode();
        return
      }
      let noteType = attrs.kv[NOTE_TYPE_ATTRIBUTE]
      if (noteType) {
        state.currentNoteType = noteType
        state.currentNoteAttrs = { ...attrs, noteType }
        parseChildren(state, spec, pandocItem);
      } else {
        const spanMarkType = schema.marks.span;
        const mark = spanMarkType.create(attrs);
        state.openMark(mark);
        parseChildren(state, spec, pandocItem);
        state.closeMark(mark);
      }
    },
    getAttrs: (json) => getPandocAttrs(json.c[0]),
    parseChildren: [{ index: 1 }],
  },
};
