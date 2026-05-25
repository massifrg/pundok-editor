import { FileFilter } from 'electron';
import {
  InputConverter,
  OutputConverter,
  PandocInputConverter,
  PandocOutputConverter
} from './config';
import { isString, uniq } from 'lodash-es';
import * as browserify from 'path-browserify';
import { commonIcons } from './icons';

export const DEFAULT_FORMAT = 'json'
export const DEFAULT_COPY_FORMAT = 'markdown'
export const DEFAULT_MAIN_FORMATS = ['json', 'markdown', 'docx']

export interface PandocFormatExtension {
  name: string,
  default: boolean,
}

export type PandocConversionDir = 'input' | 'output'

export interface PandocFormatDescription {
  name?: string,
  see?: string,
  description?: string;
  priority?: number;
  input?: boolean;
  output?: boolean;
  extensions?: string[];
  icon?: string;
  formatExtensions?: PandocFormatExtension[];
}

export const pandocFormatsDefs: Record<string, PandocFormatDescription> = {
  ansi: {
    description: 'ANSI',
    extensions: ['ans', 'ansi', 'txt'],
  },
  asciidoc: {
    description: 'AsciiDoc',
    extensions: ['adoc', 'asciidoc'],
  },
  asciidoc_legacy: {
    see: 'asciidoc',
    extensions: ['asc', 'adoc', 'asciidoc'],
  },
  asciidoctor: {
    see: 'asciidoc'
  },
  bbcode: {
    description: 'Bulletin Board Code',
    extensions: ['txt', 'bbcode', 'bbc'],
  },
  bbcode_fluxbb: {
    see: 'bbcode',
  },
  bbcode_hubzilla: {
    see: 'bbcode',
  },
  bbcode_phpbb: {
    see: 'bbcode',
  },
  bbcode_steam: {
    see: 'bbcode',
  },
  bbcode_xenforo: {
    see: 'bbcode',
  },
  beamer: {
    description: 'Beamer LaTeX for slides',
    see: 'latex',
  },
  biblatex: {
    description: 'BibTeX/BibLaTeX',
    extensions: ['bib'],
  },
  bibtex: {
    see: 'biblatex',
  },
  bits: {
    description: 'Book Interchange Tag Suite (BITS)',
    extensions: ['xml'],
    icon: 'format_xml',
  },
  chunkedhtml: {
    description: 'zip archive of multiple linked HTML files',
    extensions: ['zip'],
  },
  commonmark: {
    description: 'Markdown CommonMark',
    see: 'markdown',
    priority: 0,
  },
  commonmark_x: {
    description: 'Markdown CommonMark with extensions',
    see: 'markdown',
    priority: 0,
  },
  context: {
    description: 'ConTeXt',
    extensions: ['context', 'ctx', 'tex'],
  },
  creole: {
    description: 'Creole Wiki',
    extensions: ['creole'],
  },
  csljson: {
    description: 'CSL JSON',
    extensions: ['json', 'csljson'],
  },
  csv: {
    description: 'CSV tables',
    extensions: ['csv'],
  },
  djot: {
    description: 'Djot',
    extensions: ['dj', 'djot'],
  },
  docbook: {
    description: 'DocBook',
    extensions: ['db'],
  },
  docbook4: {
    description: 'DocBook v4',
    see: 'docbook',
  },
  docbook5: {
    description: 'DocBook v5',
    see: 'docbook',
  },
  docx: {
    priority: 1,
    description: 'Microsoft Word docx',
    extensions: ['docx'],
    icon: 'format_docx',
  },
  dokuwiki: {
    description: 'DokuWiki',
    extensions: ['dokuwiki'],
  },
  dzslides: {
    description: 'DZSlides',
    extensions: ['html'],
  },
  endnotexml: {
    description: 'EndNote XML',
    extensions: ['xml'],
    icon: 'format_xml',
  },
  epub: {
    description: 'EPUB v2/v3',
    extensions: ['epub'],
  },
  epub2: {
    description: 'EPUB v2',
    see: 'epub',
  },
  epub3: {
    description: 'EPUB v3',
    see: 'epub',
  },
  fb2: {
    description: 'FictionBook2',
    extensions: ['fb2'],
  },
  gfm: {
    description: 'GitHub Flavored Markdown (GFM)',
    see: 'markdown',
  },
  haddock: {
    description: 'Haddock',
    extensions: ['hs', 'lhs'],
    icon: 'language_haskell',
  },
  html: {
    priority: 1,
    description: '(X)HTML',
    extensions: ['html', 'htm', 'xhtml'],
    icon: 'format_html',
  },
  html4: {
    description: 'HTML v4',
    see: 'html',
    icon: '',
  },
  html5: {
    description: 'HTML v5',
    see: 'html',
  },
  icml: {
    description: 'Adobe InDesign/InCopy ICML',
    extensions: ['icml'],
  },
  ipynb: {
    description: 'Jupiter notebook',
    extensions: ['ipynb'],
  },
  jats: {
    description: 'JATS (Journal Article Tag Suite)',
    extensions: ['xml', 'jats.xml', 'nxml'],
    icon: 'format_xml',
  },
  jats_archiving: {
    description: 'JATS (Archiving and Interchange Tag Set)',
    see: 'jats',
  },
  jats_articleauthoring: {
    description: 'JATS (Article Authoring Tag Set)',
    see: 'jats',
  },
  jats_publishing: {
    description: 'JATS (Journal Publishing Tag Set)',
    see: 'jats',
  },
  jira: {
    description: 'Jira',
    extensions: ['xml', 'json'],
    icon: 'format_xml',
  },
  json: {
    priority: 2,
    description: 'Pandoc JSON',
    extensions: ['json'],
    icon: 'format_json',
  },
  latex: {
    description: 'LaTeX',
    extensions: ['latex', 'ltx', 'tex'],
  },
  man: {
    description: 'man pages',
    extensions: ['man', '1', '2', '3', '4', '5', '6', '7', '8'],
  },
  markdown: {
    priority: 1,
    description: 'Pandoc Markdown (or text file)',
    extensions: [
      'md',
      'markdown',
      'Rmd',
      'lhs',
      'mdown',
      'mdwn',
      'mkd',
      'mkdn',
      'text',
      'txt',
    ],
    icon: 'language_markdown',
  },
  markdown_github: {
    description: 'GitHub flavoured Markdown (deprecated, use gfm)',
    see: 'markdown',
    priority: 0,
  },
  markdown_mmd: {
    description: 'Markdown (PHP Extra)',
    see: 'markdown',
    priority: 0,
  },
  markdown_phpextra: {
    description: 'Markdown (stric)',
    see: 'markdown',
    priority: 0,
  },
  markdown_strict: {
    description: 'Markdown (strict)',
    see: 'markdown',
    priority: 0,
  },
  markua: {
    description: 'Markua',
    extensions: ['markua'],
  },
  mdoc: {
    description: 'mdoc man pages',
    extensions: ['man', '1', '2', '3', '4', '5', '6', '7', '8'],
  },
  mediawiki: {
    description: 'MediaWiki',
    extensions: ['wiki'],
  },
  ms: {
    description: 'GNU man/roff',
    extensions: ['ms', 'roff'],
  },
  muse: {
    description: 'Emacs Muse',
    extensions: ['muse'],
  },
  native: {
    description: 'Pandoc native',
    extensions: ['native'],
  },
  odt: {
    priority: 1,
    description: 'OpenOffice/LibreOffice docx',
    extensions: ['odt'],
    icon: commonIcons.odt_document,
  },
  opendocument: {
    description: 'OASIS OpenDocument XML',
    extensions: ['xml'],
    icon: 'format_xml',
  },
  opml: {
    description: 'Outline Processor Markup Language',
    extensions: ['opml'],
  },
  org: {
    description: 'Emacs Org-Mode',
    extensions: ['org'],
  },
  plain: {
    description: 'plain text file',
    extensions: ['text', 'txt'],
  },
  pdf: {
    description: 'PDF',
    extensions: ['pdf'],
    icon: 'format_pdf'
  },
  pod: {
    description: 'Perl Pod (Plain Old Documentation)',
    extensions: ['pod'],
  },
  pptx: {
    description: 'Microsoft PowerPoint',
    extensions: ['pptx'],
  },
  revealjs: {
    description: 'reveal.js',
    extensions: ['html'],
  },
  ris: {
    description: 'RIS',
    extensions: ['ris'],
  },
  rst: {
    description: 'reStructuredText',
    extensions: ['rst'],
  },
  rtf: {
    priority: 1,
    description: 'Rich Text Format',
    extensions: ['rtf'],
    icon: commonIcons.rtf_document,
  },
  s5: {
    description: 'S5 slide show',
    extensions: ['s5'],
  },
  slideous: {
    description: 'Slideous slide show',
    extensions: ['html']
  },
  slidy: {
    description: 'Slidy slide show',
    extensions: ['html']
  },
  t2t: {
    description: 'txt2tags',
    extensions: ['t2t'],
  },
  tei: {
    description: 'XML:TEI Simple',
    extensions: ['tei'],
  },
  texinfo: {
    description: 'GNU TexInfo',
    extensions: ['texi', 'texinfo'],
  },
  textile: {
    description: 'Textile',
    extensions: ['textile'],
  },
  tikiwiki: {
    description: 'TikiWiki',
    extensions: [],
  },
  tsv: {
    description: 'TSV tables',
    extensions: ['tsv'],
  },
  twiki: {
    description: 'TikiWiki',
    extensions: ['txt'],
  },
  typst: {
    description: 'Typst',
    extensions: ['typ'],
  },
  vimdoc: {
    description: 'VimDoc',
    extensions: ['txt'],
  },
  vimwiki: {
    description: 'VimWiki',
    extensions: ['wiki'],
  },
  xlsx: {
    description: 'Excel XLSX',
    extensions: ['xlsx'],
    icon: 'format_xlsx',
  },
  xml: {
    description: 'XML native AST',
    extensions: ['xml'],
    icon: 'format_xml',
  },
  xwiki: {
    description: 'XWiki',
    extensions: ['xar'],
  },
  zimwiki: {
    description: 'ZimWiki',
    extensions: ['zim'],
  },
};
Object.entries(pandocFormatsDefs).forEach(([format, desc]) => {
  const mainFormat = desc.see
  if (mainFormat) {
    const mainDesc = pandocFormatsDefs[mainFormat]
    pandocFormatsDefs[format] = {
      ...mainDesc,
      ...desc,
      name: format,
      input: true,
      output: true
    }
  } else {
    pandocFormatsDefs[format] = {
      ...pandocFormatsDefs[format],
      name: format,
      input: true,
      output: true
    }
  }
})
const DEFAULT_FORMAT_FOR_EXTENSION: Record<string, string> = {
  txt: 'plain',
  tex: 'latex',
}

const DEFAULT_FORMAT_PRIORITY = 1;

/**
 * File filters for electron when calling `Electron.dialog.showOpenDialog`.
 * @param priority the minimum priority a format must have to be included in the return value.
 * @returns
 */
export function pandocInputFileFilters(priority?: number): FileFilter[] {
  const p = priority || DEFAULT_FORMAT_PRIORITY;
  return Object.entries(pandocFormatsDefs)
    .filter(([_, f]) => f.input === true && (f.priority || 0) >= p)
    .sort(([n1, f1], [n2, f2]) =>
      f1.priority && f2.priority ? f2.priority - f1.priority : 0
    )
    .map(([name, f]) => ({
      name: f.description || name,
      extensions: f.extensions || [],
    }));
}

/**
 * List the formats that support a file extension for the `direction` (input or output) specified.
 * @param ext The file extension.
 * @param direction "input" | "output".
 * @returns 
 */
export function pandocFormatsFromExtension(ext: string, direction: PandocConversionDir): string[] {
  if (!ext) return [];
  const ext_without_dot = ext.startsWith('.') ? ext.substring(1) : ext;
  return Object.entries(pandocFormatsDefs)
    .filter(([_, desc]) => {
      const isRightDirection = (direction === 'input' && desc.input === true)
        || (direction === 'output' && desc.output === true)
      return isRightDirection && (desc.extensions || []).indexOf(ext_without_dot) >= 0
    })
    .map(([format, _]) => format);
}

/**
 * List the likely formats of a document, from its file extension.
 * @param fn The document's file name.
 * @param direction Is it a document we want to read ("input") or a document we want to write ("output").
 * @returns 
 */
export function pandocFormatsFromFilename(fn: string, direction: PandocConversionDir): string[] {
  return pandocFormatsFromExtension(browserify.extname(fn), direction)
}

/**
 * Checks whether a format is read by pandoc as input.
 * @param format
 * @returns 
 */
export function isInputFormat(format: string): boolean {
  return pandocFormatsDefs[format].input === true
}

/**
 * Checks whether a format is written by pandoc as output.
 * @param format
 * @returns 
 */
export function isOutputFormat(format: string): boolean {
  return pandocFormatsDefs[format].output === true
}

export function getPandocFormatDescriptions(input_names: string[], output_names: string[]): PandocFormatDescription[] {
  input_names.forEach(name => {
    const pandocFormat = pandocFormatsDefs[name]
    if (pandocFormat) pandocFormat.input = true
  })
  output_names.forEach(name => {
    const pandocFormat = pandocFormatsDefs[name]
    if (pandocFormat) pandocFormat.output = true
  })
  return Object.values(pandocFormatsDefs)
}

/**
 * Derives an `InputConverter` from the name of a Pandoc input format.
 * @param format The input format name.
 * @returns 
 */
export function pandocFormatToInputConverter(format?: string | PandocFormatDescription): InputConverter | undefined {
  if (!format)
    return undefined
  const desc: PandocFormatDescription | undefined = isString(format)
    ? pandocFormatsDefs[format]
    : format
  if (desc?.name && desc?.input === true) {
    return {
      type: 'pandoc',
      name: desc.name!,
      description: desc.description,
      format: desc.name!,
      extensions: desc.extensions || [],
    } as PandocInputConverter
  }
  return undefined
}

/**
 * Derives an `OutputConverter` from the name of a Pandoc output format.
 * @param format The output format name.
 * @returns 
 */
export function pandocFormatToOutputConverter(format?: string | PandocFormatDescription): OutputConverter | undefined {
  if (!format)
    return undefined
  const desc: PandocFormatDescription | undefined = isString(format)
    ? pandocFormatsDefs[format]
    : format
  if (desc?.name && desc?.output === true) {
    return {
      type: 'pandoc',
      name: desc.name!,
      description: desc.description,
      format: desc.name!,
      extension: (desc.extensions || [])[0],
    } as PandocOutputConverter
  }
  return undefined
}

/**
 * All the extensions that are associated at least to a Pandoc (input or output) format.
 * @param direction The direction of Pandoc conversion.
 * @returns 
 */
export function knownFormatExtensions(direction?: PandocConversionDir): string[] {
  let exts: string[] = []
  Object.values(pandocFormatsDefs)
    .filter((desc) => !direction || (direction === 'input' && desc.input === true) || (direction === 'output' && desc.output === true))
    .forEach((desc) => {
      if (desc.extensions)
        exts = [...exts, ...desc.extensions]
    })
  return uniq(exts.sort())
}

/**
 * All the descriptions of the formats associated to (the extension of) a filename.
 * @param pandocFormats A list of pandoc format descriptions.
 * @param filename The document filename (with extension).
 * @param direction The direction of Pandoc conversion.
 * @returns 
 */
export function formatDescriptionsFromFilename(
  pandocFormats: PandocFormatDescription[],
  filename: string,
  direction: PandocConversionDir
): PandocFormatDescription[] {
  return pandocFormats
    .filter((desc) => (direction === 'input' && desc.input === true) || (direction === 'output' && desc.output === true))
    .filter((desc) => desc.extensions && desc.extensions.find(e => filename.endsWith('.' + e)))
}

/**
 * Used to sort the formats associated with an extension.
 * @param ext The extension ending the name of the document.
 * @param direction The direction of Pandoc conversion.
 * @returns 
 */
function formatExtensionToNumber(ext: string, desc: PandocFormatDescription): number {
  const format = desc.name
  if (DEFAULT_FORMAT_FOR_EXTENSION[ext] === format)
    return 100
  if (format === ext)
    return 10
  if (!desc.see)
    return 5
  return 0
}

/**
 * Guess all the formats that are associated with a document name extension.
 * @param pandocFormats A list of pandoc format descriptions.
 * @param ext The extension ending the name of the document.
 * @param direction The direction of Pandoc conversion.
 * @returns 
 */
export function formatsFromExtension(
  pandocFormats: PandocFormatDescription[],
  ext: string,
  direction: PandocConversionDir
): string[] {
  const fd = formatDescriptionsFromFilename(pandocFormats, ext, direction)
  fd.sort((desc1, desc2) => {
    const diff = formatExtensionToNumber(ext, desc2) - formatExtensionToNumber(ext, desc1)
    if (diff === 0)
      return desc1.name!.localeCompare(desc2.name!)
    return diff
  })
  return fd.map(d => d.name!)
}

/**
 * Guess the right format for a document name ending with a particular extension.
 * @param pandocFormats A list of pandoc format descriptions.
 * @param ext The extension ending the name of the document.
 * @param direction The direction of Pandoc conversion.
 * @returns 
 */
export function guessFormatFromExtension(
  pandocFormats: PandocFormatDescription[],
  ext: string,
  direction: PandocConversionDir
): string | undefined {
  const formats = formatsFromExtension(pandocFormats, ext, direction)
  if (formats.length === 0)
    return undefined
  return formats[0]
}