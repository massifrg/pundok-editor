import type { Extension, Node, Mark } from '@tiptap/core';
import { Document } from '@tiptap/extension-document';
import { Gapcursor } from '@tiptap/extension-gapcursor';
import { History, type HistoryOptions } from '@tiptap/extension-history';
import { Text } from '@tiptap/extension-text';
import { Selection } from '@tiptap/pm/state';

import {
  Blockquote,
  BlockquoteOptions,
  Break,
  BreakOptions,
  BulletList,
  BulletListOptions,
  Caption,
  CaptionOptions,
  CodeBlock,
  CodeBlockLowlightOptions,
  DefinitionData,
  DefinitionDataOptions,
  DefinitionList,
  DefinitionListOptions,
  DefinitionTerm,
  DefinitionTermOptions,
  Div,
  DivOptions,
  EmptySpan,
  EmptySpanOptions,
  FigureCaption,
  FigureCaptionOptions,
  Figure,
  FigureOptions,
  Heading,
  HeadingOptions,
  HorizontalRule,
  HorizontalRuleOptions,
  Image,
  ImageOptions,
  IndexDiv,
  IndexDivOptions,
  IndexRef,
  IndexRefOptions,
  IndexTerm,
  IndexTermOptions,
  LineBlock,
  LineBlockOptions,
  Line,
  LineOptions,
  ListItem,
  ListItemOptions,
  Metadata,
  MetadataOptions,
  MetaBlocks,
  MetaBlocksOptions,
  MetaBool,
  MetaBoolOptions,
  MetaInlines,
  MetaInlinesOptions,
  MetaList,
  MetaListOptions,
  MetaMap,
  MetaMapOptions,
  MetaMapEntry,
  MetaMapEntryOptions,
  MetaString,
  MetaStringOptions,
  Note,
  NoteOptions,
  OrderedList,
  OrderedListOptions,
  PandocNull,
  PandocNullOptions,
  PandocTable,
  PandocTableOptions,
  Paragraph,
  ParagraphOptions,
  Plain,
  PlainOptions,
  RawBlock,
  RawBlockOptions,
  RawInline,
  RawInlineOptions,
  ShortCaption,
  ShortCaptionOptions,
  TableBody,
  TableBodyOptions,
  TableCell,
  TableCellOptions,
  TableFoot,
  TableFootOptions,
  TableHeader,
  TableHeaderOptions,
  TableHead,
  TableHeadOptions,
  TableRow,
  TableRowOptions,
} from '.'; // don't import from '../nodes', because '../nodes/index.ts' exports Pandoc from this file
import {
  Cite,
  CiteOptions,
  Code,
  CodeOptions,
  DoubleQuoted,
  DoubleQuotedOptions,
  Emph,
  EmphOptions,
  Link,
  LinkOptions,
  Math,
  MathOptions,
  SingleQuoted,
  SingleQuotedOptions,
  Smallcaps,
  SmallcapsOptions,
  Span,
  SpanOptions,
  Strikeout,
  StrikeoutOptions,
  Strong,
  StrongOptions,
  Subscript,
  SubscriptOptions,
  Superscript,
  SuperscriptOptions,
  Underline,
  UnderlineOptions,
} from '../marks';
import {
  AutoDelimiter,
  AutoDelimitersExtension,
  AutoDelimitersOptions,
  CssSelectionExtension,
  CustomPasteExtension,
  CustomStyleExtension,
  CustomStyleOptions,
  ExtraCommandsExtension,
  FixDocStructureExtension,
  HelperCommandsExtension,
  IncludeDivExtension,
  IndexingExtension,
  IndexingOptions,
  PandocAttrExtension,
  PandocAttrOptions,
  PundokEditorUtilsExtension,
  PundokEditorUtilsOptions,
  RepeatableCommandExtension,
  SearchAndReplaceExtension,
  SectionHighlighterExtension,
  TableEdgesExtension,
  TableEdgesOptions,
  TextAlign,
  TextAlignOptions,
  TextTransformExtension,
  VerticalAlign,
  VerticalAlignOptions,
} from '../extensions';
import {
  CreateDocumentOptions,
  createDocument,
} from '../helpers/createDocument';
import type { PandocJsonDocument } from '../../pandoc';

// load all languages with "all" or common languages with "common"
import { all, createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import lua from 'highlight.js/lib/languages/lua';
import latex from 'highlight.js/lib/languages/latex';
import 'highlight.js/styles/dark.css';
import {
  fixPreArrowUpPlugin,
  TABLE_CELL_ALIGNMENTS,
  TABLE_CELL_DEFAULT_ALIGNMENT,
  TABLE_CELL_DEFAULT_VERTICAL_ALIGNMENT,
  TABLE_CELL_VERTICAL_ALIGNMENTS,
} from '../helpers';
import {
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
  NODE_NAME_AUTO_DELIMITER,
  NODE_NAME_BLOCKQUOTE,
  NODE_NAME_BREAK,
  NODE_NAME_BULLET_LIST,
  NODE_NAME_CAPTION,
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
  NODE_NAME_INDEX_REF,
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
  NODE_NAME_TABLE_BODY,
  NODE_NAME_TABLE_CELL,
  NODE_NAME_TABLE_FOOT,
  NODE_NAME_TABLE_HEAD,
  NODE_NAME_TABLE_HEADER,
  NODE_NAME_TABLE_ROW,
  SK,
} from '../../common';
import { setActionShowSearchDialog } from '../../actions';

const lowlight = createLowlight(all);
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('lua', lua);
lowlight.register('latex', latex);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pandoc: {
      setPandocContent: (
        json: string | PandocJsonDocument,
        options?: CreateDocumentOptions,
      ) => ReturnType;
      scrollIntoViewAtTop: () => ReturnType;
      scrollIntoViewAtBottom: () => ReturnType;
    };
  }
}

export interface PandocOptions {
  text: false;

  customStyle: Partial<CustomStyleOptions> | false;
  pandocAttr: Partial<PandocAttrOptions> | false;
  textAlign: Partial<TextAlignOptions> | false;
  verticalAlign: Partial<VerticalAlignOptions> | false;

  [NODE_NAME_PLAIN]: Partial<PlainOptions> | false;
  [NODE_NAME_PARAGRAPH]: Partial<ParagraphOptions> | false;
  [NODE_NAME_LINE]: Partial<LineOptions> | false;
  [NODE_NAME_LINE_BLOCK]: Partial<LineBlockOptions> | false;
  [NODE_NAME_CODE_BLOCK]: Partial<CodeBlockLowlightOptions> | false;
  [NODE_NAME_RAW_BLOCK]: Partial<RawBlockOptions> | false;
  [NODE_NAME_BLOCKQUOTE]: Partial<BlockquoteOptions> | false;
  [NODE_NAME_LIST_ITEM]: Partial<ListItemOptions> | false;
  [NODE_NAME_ORDERED_LIST]: Partial<OrderedListOptions> | false;
  [NODE_NAME_BULLET_LIST]: Partial<BulletListOptions> | false;
  [NODE_NAME_DEFINITION_LIST]: Partial<DefinitionListOptions> | false;
  [NODE_NAME_DEFINITION_TERM]: Partial<DefinitionTermOptions> | false;
  [NODE_NAME_DEFINITION_DATA]: Partial<DefinitionDataOptions> | false;
  [NODE_NAME_HEADING]: Partial<HeadingOptions> | false;
  [NODE_NAME_HORIZONTAL_RULE]: Partial<HorizontalRuleOptions> | false;
  [NODE_NAME_PANDOC_TABLE]: Partial<PandocTableOptions> | false;
  [NODE_NAME_CAPTION]: Partial<CaptionOptions> | false;
  [NODE_NAME_TABLE_HEAD]: Partial<TableHeadOptions> | false;
  [NODE_NAME_TABLE_BODY]: Partial<TableBodyOptions> | false;
  [NODE_NAME_TABLE_FOOT]: Partial<TableFootOptions> | false;
  [NODE_NAME_TABLE_ROW]: Partial<TableRowOptions> | false;
  [NODE_NAME_TABLE_HEADER]: Partial<TableHeaderOptions> | false;
  [NODE_NAME_TABLE_CELL]: Partial<TableCellOptions> | false;
  [NODE_NAME_DIV]: Partial<DivOptions> | false;
  [NODE_NAME_FIGURE]: Partial<FigureOptions> | false;
  [NODE_NAME_FIGURE_CAPTION]: Partial<FigureCaptionOptions> | false;
  [NODE_NAME_SHORT_CAPTION]: Partial<ShortCaptionOptions> | false;
  [NODE_NAME_INDEX_DIV]: Partial<IndexDivOptions> | false;
  [NODE_NAME_INDEX_TERM]: Partial<IndexTermOptions> | false;
  pandocNull: Partial<PandocNullOptions> | false;
  [NODE_NAME_EMPTY_SPAN]: Partial<EmptySpanOptions> | false;
  [NODE_NAME_INDEX_REF]: Partial<IndexRefOptions> | false;

  [MARK_NAME_EMPH]: Partial<EmphOptions> | false;
  [MARK_NAME_UNDERLINE]: Partial<UnderlineOptions> | false;
  [MARK_NAME_STRONG]: Partial<StrongOptions> | false;
  [MARK_NAME_STRIKEOUT]: Partial<StrikeoutOptions> | false;
  [MARK_NAME_SUPERSCRIPT]: Partial<SuperscriptOptions> | false;
  [MARK_NAME_SUBSCRIPT]: Partial<SubscriptOptions> | false;
  [MARK_NAME_SMALLCAPS]: Partial<SmallcapsOptions> | false;
  [MARK_NAME_DOUBLE_QUOTED]: Partial<DoubleQuotedOptions> | false;
  [MARK_NAME_SINGLE_QUOTED]: Partial<SingleQuotedOptions> | false;
  [NODE_NAME_AUTO_DELIMITER]: Partial<AutoDelimitersOptions> | false;
  [MARK_NAME_CITE]: Partial<CiteOptions> | false;
  [MARK_NAME_CODE]: Partial<CodeOptions> | false;
  [NODE_NAME_BREAK]: Partial<BreakOptions> | false;
  [MARK_NAME_MATH]: Partial<MathOptions> | false;
  [NODE_NAME_RAW_INLINE]: Partial<RawInlineOptions> | false;
  [MARK_NAME_LINK]: Partial<LinkOptions> | false;
  [NODE_NAME_IMAGE]: Partial<ImageOptions> | false;
  [NODE_NAME_NOTE]: Partial<NoteOptions> | false;
  [MARK_NAME_SPAN]: Partial<SpanOptions> | false;

  [NODE_NAME_METADATA]: Partial<MetadataOptions> | false;
  [NODE_NAME_META_MAP]: Partial<MetaMapOptions> | false;
  [NODE_NAME_META_MAP_ENTRY]: Partial<MetaMapEntryOptions> | false;
  [NODE_NAME_META_LIST]: Partial<MetaListOptions> | false;
  [NODE_NAME_META_BOOL]: Partial<MetaBoolOptions> | false;
  [NODE_NAME_META_STRING]: Partial<MetaStringOptions> | false;
  [NODE_NAME_META_INLINES]: Partial<MetaInlinesOptions> | false;
  [NODE_NAME_META_BLOCKS]: Partial<MetaBlocksOptions> | false;

  gapcursor: false;
  history: Partial<HistoryOptions> | false;
  searchAndReplace: false;
  helperCommands: false;
  indexing: Partial<IndexingOptions> | false;
  autoDelimiters: Partial<AutoDelimitersOptions> | false;
  sectionHighlighter: false;
  customPaste: false;
  pundokEditorUtils: Partial<PundokEditorUtilsOptions> | false;
  textTransform: false;
  fixDocStructure: false;
  includeDiv: false;
  repeatableCommand: false;
  cssSelection: false;
  extraCommands: false;
  tableEdges: Partial<TableEdgesOptions> | false;
}

export const Pandoc = Document.extend<PandocOptions>({
  name: 'doc',
  content: 'metadata? block+',

  addOptions() {
    return {
      ...this.parent?.(),
    };
  },

  addAttributes() {
    return {
      // meta: {
      //   default: null,
      // }
    };
  },

  addExtensions() {
    const defs: {
      name: keyof PandocOptions;
      object: Extension | Node | Mark;
      config?: Record<string, any>;
    }[] = [
        { name: 'customStyle', object: CustomStyleExtension },
        { name: 'customPaste', object: CustomPasteExtension },
        { name: 'pandocAttr', object: PandocAttrExtension },
        { name: 'searchAndReplace', object: SearchAndReplaceExtension },
        { name: 'helperCommands', object: HelperCommandsExtension },
        { name: 'indexing', object: IndexingExtension },
        { name: 'autoDelimiters', object: AutoDelimitersExtension },
        { name: 'sectionHighlighter', object: SectionHighlighterExtension },
        { name: 'pundokEditorUtils', object: PundokEditorUtilsExtension },
        { name: 'includeDiv', object: IncludeDivExtension },
        { name: 'textTransform', object: TextTransformExtension },
        { name: 'repeatableCommand', object: RepeatableCommandExtension },
        { name: 'cssSelection', object: CssSelectionExtension },
        { name: 'extraCommands', object: ExtraCommandsExtension },
        { name: 'tableEdges', object: TableEdgesExtension },
        {
          name: 'textAlign',
          object: TextAlign,
          config: {
            types: [NODE_NAME_TABLE_CELL, NODE_NAME_TABLE_HEADER],
            alignments: TABLE_CELL_ALIGNMENTS,
            defaultAlignment: TABLE_CELL_DEFAULT_ALIGNMENT,
          },
        },
        {
          name: 'verticalAlign',
          object: VerticalAlign,
          config: {
            types: [NODE_NAME_TABLE_CELL, NODE_NAME_TABLE_HEADER],
            alignments: TABLE_CELL_VERTICAL_ALIGNMENTS,
            defaultAlignment: TABLE_CELL_DEFAULT_VERTICAL_ALIGNMENT,
          },
        },
        { name: 'fixDocStructure', object: FixDocStructureExtension },

        { name: NODE_NAME_METADATA, object: Metadata },
        { name: NODE_NAME_META_INLINES, object: MetaInlines },
        { name: NODE_NAME_META_BLOCKS, object: MetaBlocks },
        { name: NODE_NAME_META_STRING, object: MetaString },
        { name: NODE_NAME_META_BOOL, object: MetaBool },
        { name: NODE_NAME_META_LIST, object: MetaList },
        { name: NODE_NAME_META_MAP, object: MetaMap },
        { name: NODE_NAME_META_MAP_ENTRY, object: MetaMapEntry },

        { name: 'text', object: Text },
        { name: 'gapcursor', object: Gapcursor },
        { name: 'history', object: History },

        { name: NODE_NAME_PLAIN, object: Plain },
        { name: NODE_NAME_PARAGRAPH, object: Paragraph },
        { name: NODE_NAME_LINE, object: Line },
        { name: NODE_NAME_LINE_BLOCK, object: LineBlock },
        { name: NODE_NAME_RAW_BLOCK, object: RawBlock },
        {
          name: NODE_NAME_CODE_BLOCK,
          object: CodeBlock,
          config: {
            lowlight,
            HTMLAttributes: {
              class: 'code-block',
            },
            // defaultLanguage: 'javascript',
          },
        },
        { name: NODE_NAME_BLOCKQUOTE, object: Blockquote },
        { name: NODE_NAME_LIST_ITEM, object: ListItem },
        { name: NODE_NAME_ORDERED_LIST, object: OrderedList },
        { name: NODE_NAME_BULLET_LIST, object: BulletList },
        { name: NODE_NAME_DEFINITION_LIST, object: DefinitionList },
        { name: NODE_NAME_DEFINITION_TERM, object: DefinitionTerm },
        { name: NODE_NAME_DEFINITION_DATA, object: DefinitionData },
        { name: NODE_NAME_HEADING, object: Heading },
        { name: NODE_NAME_HORIZONTAL_RULE, object: HorizontalRule },
        {
          name: NODE_NAME_PANDOC_TABLE,
          object: PandocTable,
          config: {
            resizable: true,
            handleWidth: 5,
            cellMinWidth: 10,
            lastColumnResizable: true,
            allowTableNodeSelection: false,
          },
        },
        { name: NODE_NAME_CAPTION, object: Caption },
        { name: NODE_NAME_SHORT_CAPTION, object: ShortCaption },
        { name: NODE_NAME_TABLE_HEAD, object: TableHead },
        { name: NODE_NAME_TABLE_BODY, object: TableBody },
        { name: NODE_NAME_TABLE_FOOT, object: TableFoot },
        { name: NODE_NAME_TABLE_ROW, object: TableRow },
        { name: NODE_NAME_TABLE_HEADER, object: TableHeader },
        { name: NODE_NAME_TABLE_CELL, object: TableCell },
        { name: NODE_NAME_DIV, object: Div },
        { name: NODE_NAME_FIGURE, object: Figure },
        { name: NODE_NAME_FIGURE_CAPTION, object: FigureCaption },
        { name: 'pandocNull', object: PandocNull },
        { name: NODE_NAME_INDEX_DIV, object: IndexDiv },
        { name: NODE_NAME_INDEX_TERM, object: IndexTerm },
        { name: NODE_NAME_INDEX_REF, object: IndexRef },
        { name: NODE_NAME_EMPTY_SPAN, object: EmptySpan },

        { name: MARK_NAME_LINK, object: Link },
        { name: MARK_NAME_DOUBLE_QUOTED, object: DoubleQuoted },
        { name: MARK_NAME_SINGLE_QUOTED, object: SingleQuoted },
        { name: NODE_NAME_AUTO_DELIMITER, object: AutoDelimiter },
        { name: MARK_NAME_CITE, object: Cite },
        { name: MARK_NAME_SPAN, object: Span },
        { name: MARK_NAME_EMPH, object: Emph },
        { name: MARK_NAME_UNDERLINE, object: Underline },
        { name: MARK_NAME_STRONG, object: Strong },
        { name: MARK_NAME_STRIKEOUT, object: Strikeout },
        { name: MARK_NAME_SUPERSCRIPT, object: Superscript },
        { name: MARK_NAME_SUBSCRIPT, object: Subscript },
        { name: MARK_NAME_SMALLCAPS, object: Smallcaps },
        { name: MARK_NAME_CODE, object: Code },
        { name: NODE_NAME_BREAK, object: Break }, // for both SoftBreak and LineBreak
        { name: MARK_NAME_MATH, object: Math },
        { name: NODE_NAME_RAW_INLINE, object: RawInline },
        { name: NODE_NAME_IMAGE, object: Image },
        { name: NODE_NAME_NOTE, object: Note },
      ];

    const extensions: (Extension | Mark | Node)[] = defs.map((e) => {
      const name = e.name;
      const extension = e.object;
      const options = {
        ...(e.config || {}),
        ...(this.options[name] || {}),
      };
      return extension.configure(options);
    });

    return extensions;
  },

  addCommands() {
    return {
      setPandocContent: (
        json: string | PandocJsonDocument,
        options?: CreateDocumentOptions,
      ) => createDocument(json, options),
      scrollIntoViewAtTop:
        () =>
          ({ dispatch, state, tr }) => {
            if (dispatch) {
              const doc = state.doc;
              const sel = Selection.atStart(doc);
              let { $anchor, from } = sel;
              const depth = $anchor.depth;
              for (let d = 0; d <= depth; d++) {
                if ($anchor.node(d).type.name === NODE_NAME_METADATA) {
                  from = $anchor.after(d);
                  break;
                }
              }
              tr.setSelection(Selection.near(doc.resolve(from))).scrollIntoView();
            }
            return true;
          },
      scrollIntoViewAtBottom:
        () =>
          ({ dispatch, state, tr }) => {
            if (dispatch) {
              tr.setSelection(Selection.atEnd(state.doc)).scrollIntoView();
            }
            return true;
          },
    };
  },

  addProseMirrorPlugins() {
    return [fixPreArrowUpPlugin([NODE_NAME_CODE_BLOCK, NODE_NAME_RAW_BLOCK])];
  },

  addKeyboardShortcuts() {
    return {
      [SK.REMOVE_MARKS]: () => this.editor.commands.removeAllMarks(),
      [SK.SHOW_SEARCH_DIALOG]: () => {
        setActionShowSearchDialog(this.editor.state)
        return true
      }
    }
  }
});
