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
} from '../nodes';
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
} from '../helpers';
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

  plain: Partial<PlainOptions> | false;
  paragraph: Partial<ParagraphOptions> | false;
  line: Partial<LineOptions> | false;
  lineBlock: Partial<LineBlockOptions> | false;
  codeBlock: Partial<CodeBlockLowlightOptions> | false;
  rawBlock: Partial<RawBlockOptions> | false;
  blockquote: Partial<BlockquoteOptions> | false;
  listItem: Partial<ListItemOptions> | false;
  orderedList: Partial<OrderedListOptions> | false;
  bulletList: Partial<BulletListOptions> | false;
  definitionList: Partial<DefinitionListOptions> | false;
  definitionTerm: Partial<DefinitionTermOptions> | false;
  definitionData: Partial<DefinitionDataOptions> | false;
  heading: Partial<HeadingOptions> | false;
  horizontalRule: Partial<HorizontalRuleOptions> | false;
  pandocTable: Partial<PandocTableOptions> | false;
  caption: Partial<CaptionOptions> | false;
  tableHead: Partial<TableHeadOptions> | false;
  tableBody: Partial<TableBodyOptions> | false;
  tableFoot: Partial<TableFootOptions> | false;
  tableRow: Partial<TableRowOptions> | false;
  tableHeader: Partial<TableHeaderOptions> | false;
  tableCell: Partial<TableCellOptions> | false;
  div: Partial<DivOptions> | false;
  figure: Partial<FigureOptions> | false;
  figureCaption: Partial<FigureCaptionOptions> | false;
  shortCaption: Partial<ShortCaptionOptions> | false;
  indexDiv: Partial<IndexDivOptions> | false;
  indexTerm: Partial<IndexTermOptions> | false;
  pandocNull: Partial<PandocNullOptions> | false;
  emptySpan: Partial<EmptySpanOptions> | false;
  indexRef: Partial<IndexRefOptions> | false;

  emph: Partial<EmphOptions> | false;
  underline: Partial<UnderlineOptions> | false;
  strong: Partial<StrongOptions> | false;
  strikeout: Partial<StrikeoutOptions> | false;
  superscript: Partial<SuperscriptOptions> | false;
  subscript: Partial<SubscriptOptions> | false;
  smallcaps: Partial<SmallcapsOptions> | false;
  doubleQuoted: Partial<DoubleQuotedOptions> | false;
  singleQuoted: Partial<SingleQuotedOptions> | false;
  autoDelimiter: Partial<AutoDelimitersOptions> | false;
  cite: Partial<CiteOptions> | false;
  code: Partial<CodeOptions> | false;
  break: Partial<BreakOptions> | false;
  math: Partial<MathOptions> | false;
  rawInline: Partial<RawInlineOptions> | false;
  link: Partial<LinkOptions> | false;
  image: Partial<ImageOptions> | false;
  note: Partial<NoteOptions> | false;
  span: Partial<SpanOptions> | false;

  metadata: Partial<MetadataOptions> | false;
  metaMap: Partial<MetaMapOptions> | false;
  metaMapEntry: Partial<MetaMapEntryOptions> | false;
  metaList: Partial<MetaListOptions> | false;
  metaBool: Partial<MetaBoolOptions> | false;
  metaString: Partial<MetaStringOptions> | false;
  metaInlines: Partial<MetaInlinesOptions> | false;
  metaBlocks: Partial<MetaBlocksOptions> | false;

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
        {
          name: 'textAlign',
          object: TextAlign,
          config: {
            types: ['tableCell', 'tableHeader'],
            alignments: TABLE_CELL_ALIGNMENTS,
            defaultAlignment: TABLE_CELL_DEFAULT_ALIGNMENT,
          },
        },
        {
          name: 'verticalAlign',
          object: VerticalAlign,
          config: {
            types: ['tableCell', 'tableHeader'],
            alignments: ['top', 'middle', 'bottom'],
            defaultAlignment: 'top',
          },
        },
        { name: 'fixDocStructure', object: FixDocStructureExtension },

        { name: 'metadata', object: Metadata },
        { name: 'metaInlines', object: MetaInlines },
        { name: 'metaBlocks', object: MetaBlocks },
        { name: 'metaString', object: MetaString },
        { name: 'metaBool', object: MetaBool },
        { name: 'metaList', object: MetaList },
        { name: 'metaMap', object: MetaMap },
        { name: 'metaMapEntry', object: MetaMapEntry },

        { name: 'text', object: Text },
        { name: 'gapcursor', object: Gapcursor },
        { name: 'history', object: History },

        { name: 'plain', object: Plain },
        { name: 'paragraph', object: Paragraph },
        { name: 'line', object: Line },
        { name: 'lineBlock', object: LineBlock },
        { name: 'rawBlock', object: RawBlock },
        {
          name: 'codeBlock',
          object: CodeBlock,
          config: {
            lowlight,
            HTMLAttributes: {
              class: 'code-block',
            },
            // defaultLanguage: 'javascript',
          },
        },
        { name: 'blockquote', object: Blockquote },
        { name: 'listItem', object: ListItem },
        { name: 'orderedList', object: OrderedList },
        { name: 'bulletList', object: BulletList },
        { name: 'definitionList', object: DefinitionList },
        { name: 'definitionTerm', object: DefinitionTerm },
        { name: 'definitionData', object: DefinitionData },
        { name: 'heading', object: Heading },
        { name: 'horizontalRule', object: HorizontalRule },
        {
          name: 'pandocTable',
          object: PandocTable,
          config: {
            resizable: true,
            handleWidth: 5,
            cellMinWidth: 10,
            lastColumnResizable: true,
            allowTableNodeSelection: false,
          },
        },
        { name: 'caption', object: Caption },
        { name: 'shortCaption', object: ShortCaption },
        { name: 'tableHead', object: TableHead },
        { name: 'tableBody', object: TableBody },
        { name: 'tableFoot', object: TableFoot },
        { name: 'tableRow', object: TableRow },
        { name: 'tableHeader', object: TableHeader },
        { name: 'tableCell', object: TableCell },
        { name: 'div', object: Div },
        { name: 'figure', object: Figure },
        { name: 'figureCaption', object: FigureCaption },
        { name: 'pandocNull', object: PandocNull },
        { name: 'indexDiv', object: IndexDiv },
        { name: 'indexTerm', object: IndexTerm },
        { name: 'indexRef', object: IndexRef },
        { name: 'emptySpan', object: EmptySpan },

        { name: 'link', object: Link },
        { name: 'doubleQuoted', object: DoubleQuoted },
        { name: 'singleQuoted', object: SingleQuoted },
        { name: 'autoDelimiter', object: AutoDelimiter },
        { name: 'cite', object: Cite },
        { name: 'span', object: Span },
        { name: 'emph', object: Emph },
        { name: 'underline', object: Underline },
        { name: 'strong', object: Strong },
        { name: 'strikeout', object: Strikeout },
        { name: 'superscript', object: Superscript },
        { name: 'subscript', object: Subscript },
        { name: 'smallcaps', object: Smallcaps },
        { name: 'code', object: Code },
        { name: 'break', object: Break }, // for both SoftBreak and LineBreak
        { name: 'math', object: Math },
        { name: 'rawInline', object: RawInline },
        { name: 'image', object: Image },
        { name: 'note', object: Note },
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
                if ($anchor.node(d).type.name === Metadata.name) {
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
    return [fixPreArrowUpPlugin([CodeBlock.name, RawBlock.name])];
  },
});
