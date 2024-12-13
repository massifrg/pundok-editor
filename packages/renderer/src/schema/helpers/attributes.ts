import type { Attrs, Mark, Node } from '@tiptap/pm/model';
import { isArray, isString } from 'lodash';
import { PmColSpec } from './colSpec';
import { textAlignToPandocAlignment } from './alignments';
import { INDEX_NAME_ATTR } from '../../common';
import { Code, CodeBlock, Note, Span } from '..';

/**
 * The attribute of a Node or a Mark can be
 * editable from the GUI and has an order
 * in which it's displayed (when it's visible)
 * in the GUI
 */
interface NodeOrMarkAttribute {
  /** can be modified in the "edit attributes" dialog */
  editable: boolean;
  /** can be shown in places like tooltips */
  visible: boolean;
  /** the order in which is edited or shown */
  order: number;
  /** is a field of attrs.kv */
  isKv?: boolean;
  /** has not tab in "edit attributes dialog" */
  noTab?: boolean;
}

const NODE_OR_MARK_ATTRIBUTES: Record<string, NodeOrMarkAttribute> = {
  /** used in headings */
  level: { editable: true, visible: true, order: 0 },
  /** used in every Node or Mark with a Pandoc Attr structure */
  id: { editable: true, visible: true, order: 1 },
  /** used in every Node or Mark with a Pandoc Attr structure */
  classes: { editable: true, visible: true, order: 2 },
  /** used in every Node or Mark with a Pandoc Attr structure */
  kv: { editable: true, visible: true, order: 3 },
  /** used in spans and paragraphs */
  customStyle: { editable: true, visible: true, order: 4 },
  /** used in ordered lists */
  start: { editable: true, visible: true, order: 5 },
  /** used in ordered lists */
  numberStyle: { editable: true, visible: true, order: 6 },
  /** used in ordered lists */
  numberDelim: { editable: true, visible: true, order: 7 },
  /** used in table bodies */
  headRows: { editable: true, visible: true, order: 8 },
  /** used in table bodies */
  rowHeadColumns: { editable: true, visible: true, order: 9 },
  /** used in table cells */
  textAlign: { editable: false, visible: true, order: 10 },
  /** used in table cells */
  verticalAlign: { editable: false, visible: true, order: 11 },
  /** used in IndexRef */
  idref: { editable: true, visible: true, order: 10, isKv: true },
  /** used in index divs and terms */
  [INDEX_NAME_ATTR]: { editable: true, visible: true, order: 11, isKv: true },
  /** used in index divs */
  'ref-class': { editable: true, visible: true, order: 12, isKv: true },
  /** used in index divs */
  'put-index-ref': { editable: true, visible: true, order: 13, isKv: true },
  /** used in index terms */
  // 'sort-key': { editable: true, visible: true, order: 14, isKv: true },
  /** used in RawInline and RawBlock */
  format: { editable: true, visible: true, order: 16 },
  /** used in RawInline */
  text: { editable: true, visible: true, order: 17 },
  /** used in Image */
  src: { editable: true, visible: true, order: 18, noTab: true },
  /** used in Link */
  href: { editable: true, visible: true, order: 18, noTab: true },
  /** used in Image and Link*/
  title: { editable: true, visible: true, order: 18, noTab: true },
  /** used in CodeBlock and Code */
  language: { editable: true, visible: true, order: 19 },
  /** used in tables (it's automatic) */
  tableWidth: { editable: false, visible: true, order: 100 },
  /** used in tables (it's automatic) */
  colSpec: { editable: false, visible: true, order: 101 },
  /** used in notes */
  noteType: { editable: true, visible: true, order: 102 },
};

export const PANDOC_OUTPUT_FORMATS: string[][] = [
  [
    'comment',
    'a non-existent format to add comments (not Pandoc standard)',
    'mdi-comment',
  ],
  ['asciidoc', 'modern AsciiDoc as interpreted by AsciiDoctor'],
  ['asciidoc_legacy', 'AsciiDoc as interpreted by asciidoc-py'],
  ['asciidoctor', 'deprecated synonym for asciidoc'],
  ['beamer', 'LaTeX beamer slide show'],
  ['bibtex', 'BibTeX bibliography'],
  ['biblatex', 'BibLaTeX bibliography'],
  ['chunkedhtml', 'zip archive of multiple linked HTML files'],
  ['commonmark', 'CommonMark Markdown'],
  ['commonmark_x', 'CommonMark Markdown with extensions'],
  ['context', 'ConTeXt'],
  ['csljson', 'CSL JSON bibliography'],
  ['docbook', 'DocBook 4'],
  ['docbook4', 'DocBook 4'],
  ['docbook5', 'DocBook 5'],
  ['docx', 'Word docx', 'mdi-microsoft-word'],
  ['dokuwiki', 'DokuWiki markup'],
  ['epub', 'EPUB v3 book'],
  ['epub3', 'EPUB v3 book'],
  ['epub2', 'EPUB v2'],
  ['fb2', 'FictionBook2 e-book'],
  ['gfm', 'GitHub-Flavored Markdown'],
  ['haddock', 'Haddock markup'],
  ['html', 'HTML, i.e. HTML5/XHTML polyglot markup', 'mdi-language-html5'],
  ['html5', 'HTML, i.e. HTML5/XHTML polyglot markup', 'mdi-language-html5'],
  ['html4', 'XHTML 1.0 Transitional'],
  ['icml', 'InDesign ICML'],
  ['ipynb', 'Jupyter notebook'],
  ['jats_archiving', 'JATS XML, Archiving and Interchange Tag Set'],
  ['jats_articleauthoring', 'JATS XML, Article Authoring Tag Set'],
  ['jats_publishing', 'JATS XML, Journal Publishing Tag Set'],
  ['jats', 'alias for jats_archiving'],
  ['jira', 'Jira/Confluence wiki markup'],
  ['json', 'JSON version of native AST'],
  ['latex', 'LaTeX'],
  ['man', 'roff man'],
  ['markdown', 'Pandoc’s Markdown', 'mdi-language-markdown'],
  ['markdown_mmd', 'MultiMarkdown'],
  ['markdown_phpextra', 'PHP Markdown Extra'],
  ['markdown_strict', 'original unextended Markdown'],
  ['markua', 'Markua'],
  ['mediawiki', 'MediaWiki markup'],
  ['ms', 'roff ms'],
  ['muse', 'Muse'],
  ['native', 'native Haskell'],
  ['odt', 'OpenOffice text document'],
  ['opml', 'OPML'],
  ['opendocument', 'OpenDocument'],
  ['org', 'Emacs Org mode'],
  ['pdf', 'PDF', 'file-pdf-box'],
  ['plain', 'plain text'],
  ['pptx', 'PowerPoint slide show'],
  ['rst', 'reStructuredText'],
  ['rtf', 'Rich Text Format'],
  ['texinfo', 'GNU Texinfo'],
  ['textile', 'Textile'],
  ['slideous', 'Slideous HTML and JavaScript slide show'],
  ['slidy', 'Slidy HTML and JavaScript slide show'],
  ['dzslides', 'DZSlides HTML5 + JavaScript slide show'],
  ['revealjs', 'reveal.js HTML5 + JavaScript slide show'],
  ['s5', 'S5 HTML and JavaScript slide show'],
  ['tei', 'TEI Simple'],
  ['typst', 'typst'],
  ['xwiki', 'XWiki markup'],
  ['zimwiki', 'ZimWiki markup'],
];

export type DuplicatedAttribute = [
  typeName: string,
  attrName: string,
  kvAttrName: string,
];

/**
 * The following attributes are used as standalone attributes
 * of a `Node` or a `Mark`, but they are mapped into the kv attributes
 * of a Pandoc Attr.
 */
const DUPLICATED_KV_ATTRIBUTES: DuplicatedAttribute[] = [
  [Code.name, 'language', 'language'],
  [CodeBlock.name, 'language', 'language'],
  [Note.name, 'noteType', 'note-type'],
  [Span.name, 'customStyle', 'custom-style'],
];

function attrNamesForNodeOrMark(
  nom: Node | Mark | undefined,
  filter?: (noma: NodeOrMarkAttribute) => boolean,
): string[] {
  let attrNames = Object.entries(nom?.attrs || {})
    .map(([k, v]) => k)
    .filter(
      (attrName) => filter && filter(NODE_OR_MARK_ATTRIBUTES[attrName] || true),
    );
  attrNames.sort(
    (n1, n2) =>
      (NODE_OR_MARK_ATTRIBUTES[n1]?.order || 100000) -
      (NODE_OR_MARK_ATTRIBUTES[n2]?.order || 100000),
  );
  // console.log(attrNames)
  return attrNames;
}

export function isKvAttribute(attrName: string): boolean {
  const a = NODE_OR_MARK_ATTRIBUTES[attrName];
  return (a && a.isKv) || false;
}

/**
 * The name of the attributes of a `Node` or a `Mark` that can be edited by hand.
 * @param nom
 * @returns
 */
export const editableAttrsForNodeOrMark = (nom: Node | Mark | undefined) =>
  attrNamesForNodeOrMark(nom, (noma) => noma?.editable);

/**
 * The name of the attributes of a `Node` or a `Mark` that have a tab of their own
 * in the "edit attributes" dialog.
 * @param nom
 * @returns
 */
export const editableAttrsWithTab = (nom: Node | Mark | undefined) =>
  editableAttrsForNodeOrMark(nom).filter(
    (ea) => !NODE_OR_MARK_ATTRIBUTES[ea].noTab,
  );

/**
 * The name of the attributes of a `Node` or a `Mark` that are visible in the interface.
 * @param nom
 * @returns
 */
export const visibleAttrsForNodeOrMark = (nom: Node | Mark | undefined) =>
  attrNamesForNodeOrMark(nom, (noma) => noma?.visible);

function objectToString(obj: object): string {
  return (
    '{' +
    Object.entries(obj)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ') +
    '}'
  );
}

export function attributeToString(
  attrName: string,
  value: any,
): string | undefined {
  if (attrName && value) {
    switch (attrName) {
      case 'id':
        // console.log(`ID=${value}`);
        return value && value.length > 0 ? `id: "${value}"` : undefined;
      case 'classes':
        return value && value.length > 0
          ? 'classes: [' +
          (value as string[]).map((c) => `"${c}"`).join(', ') +
          ']'
          : undefined;
      case 'kv':
        return Object.keys(value).length > 0
          ? `attributes: ${objectToString(value as object)}`
          : undefined;
      case 'colSpec':
        return isArray(value)
          ? `colSpec: ${(value as PmColSpec[])
            .map(
              (cs) =>
                cs.align +
                ', ' +
                (cs.colWidth === 0 ? 'ColWidthDefault' : cs.colWidth),
            )
            .join('; ')}`
          : JSON.stringify(value);
      case 'colwidth':
        return `${attrName}: ${!value || value == 0 ? 'ColWidthDefault' : value
          }`;
      case 'tableWidth':
        return `${attrName}: ${value}`;
      case 'textAlign':
        return `${attrName}: ${textAlignToPandocAlignment(value)}`;
      case 'start':
      case 'numberStyle':
      case 'numberDelim':
        return `${attrName}: ${value || ''}`;
      default:
        return value ? `${attrName}: "${value || ''}"` : undefined;
    }
  }
  return attrName ? `${attrName}: ${JSON.stringify(value)}` : '';
}

export function attributesToString(nom: Node | Mark | undefined): string[] {
  const attrNames = visibleAttrsForNodeOrMark(nom);
  if (attrNames) {
    // console.log(`attrNames: ${attrNames.join()}`);
    return attrNames
      .map((an) => attributeToString(an, nom?.attrs[an]))
      .filter((s) => !!s) as string[];
  }
  return [];
}

export function importantClasses(nom?: Node | Mark): string[] {
  let ic: string[] = [];
  switch (nom?.type.name) {
    case 'emptySpan':
      ic = ['ixn-ref']; // TODO
      break;
    default:
  }
  return ic;
}

export function importantAttributes(nom?: Node | Mark): string[] {
  return []; // TODO
}

export function forbiddenClasses(nom?: Node | Mark): string[] {
  return []; // TODO
}

export function forbiddenAttributes(nom?: Node | Mark): string[] {
  return []; // TODO
}

/**
 * Some nodes or marks could have standalone attrs that are
 * also stored in the attributes of the Pandoc Attr structure.
 * This function returns those attributes for a given node or mark.
 * @param nom the Node, Mark or element name
 * @param name the name of the attribute or kvAttribute
 * @returns the matching attribute or kvAttribute, if it's duplicated
 */
export function matchingDuplicatedAttribute(
  nom: Node | Mark | string | undefined,
  name: string,
): string | undefined {
  if (!nom) return undefined;
  const typeName = isString(nom) ? nom : nom.type.name;
  let found = DUPLICATED_KV_ATTRIBUTES.find(
    ([elType, attrName, kvAttrName]) =>
      elType === typeName && (attrName === name || kvAttrName === name),
  );
  const ret = found && (found[1] === name ? found[2] : found[1]);
  return ret;
}

/**
 * Checks whether an attribute present in the attributes of a Pandoc Attr structure
 * is duplicated as a standalone attr of a node or mark
 * @param nom
 * @param attrName
 * @returns
 */
export function isDuplicatedKvAttribute(
  nom: Node | Mark | undefined,
  attrName: string,
): boolean {
  return !!(nom && matchingDuplicatedAttribute(nom, attrName));
}

/**
 * Creates a copy of the `attrs` of a `Node` or a `Mark`, with a class added.
 * @param attrs The `attrs` of a `Node` or a `Mark`.
 * @param className The class to be added.
 * @returns a copy of the `attrs` with the class added.
 */
export function addClass(attrs: Attrs, className?: string): Attrs {
  const newAttrs = { ...attrs };
  if (!className) return newAttrs;
  const classes: string[] = newAttrs.classes;
  if (classes && className && classes.indexOf(className) < 0) {
    classes.push(className);
  }
  return newAttrs;
}

/**
 * Creates a copy of the `attrs` of a `Node` or a `Mark`, with a class removed.
 * @param attrs The `attrs` of a `Node` or a `Mark`.
 * @param className The class to be removed.
 * @returns a copy of the `attrs` with the class removed.
 */
export function removeClasses(attrs: Attrs, classNames: string[]): Attrs {
  const newAttrs = { ...attrs };
  const classes: string[] | undefined = newAttrs.classes;
  if (classes)
    newAttrs.classes = classes.filter((c) => classNames.indexOf(c) < 0);
  return newAttrs;
}

export function setCustomStyleAttribute(
  attrs: Attrs,
  customStyle?: string,
): Attrs {
  if (!customStyle) return { ...attrs };
  const newAttrs: Attrs = { ...attrs, customStyle };
  if (newAttrs.kv) newAttrs.kv['custom-style'] = customStyle;
  return newAttrs;
}

export function unsetCustomStyleAttribute(attrs: Attrs): Attrs {
  const newAttrs: Record<string, any> = { ...attrs };
  delete newAttrs.customStyle;
  if (newAttrs.kv) delete newAttrs.kv['custom-style'];
  return newAttrs;
}
