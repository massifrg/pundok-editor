import { FileFilter } from 'electron';

export interface PandocFormatDescription {
  description?: string;
  priority?: number;
  input: boolean;
  output: boolean;
  extensions: string[];
}

const pandocFormats: Record<string, PandocFormatDescription> = {
  asciidoc: {
    description: 'AsciiDoc',
    input: false,
    output: true,
    extensions: ['adoc', 'asciidoc'],
  },
  biblatex: {
    description: 'BibTeX/BibLaTeX',
    input: true,
    output: true,
    extensions: ['bib'],
  },
  context: {
    description: 'ConTeXt',
    input: false,
    output: true,
    extensions: ['context', 'ctx', 'tex'],
  },
  csv: {
    description: 'CSV tables',
    input: true,
    output: false,
    extensions: ['csv'],
  },
  djot: {
    priority: 1,
    description: 'Djot',
    input: true,
    output: true,
    extensions: ['dj'],
  },
  docbook: {
    description: 'DocBook',
    input: true,
    output: true,
    extensions: ['db'],
  },
  docx: {
    priority: 1,
    description: 'Microsoft Word docx',
    input: true,
    output: true,
    extensions: ['docx'],
  },
  dokuwiki: {
    description: 'DokuWiki',
    input: true,
    output: true,
    extensions: ['dokuwiki'],
  },
  epub: {
    description: 'EPUB v2/v3',
    input: true,
    output: true,
    extensions: ['epub'],
  },
  fb2: {
    description: 'FictionBook2',
    input: true,
    output: true,
    extensions: ['fb2'],
  },
  html: {
    priority: 1,
    description: '(X)HTML',
    input: true,
    output: true,
    extensions: ['htm', 'html', 'xhtml'],
  },
  icml: {
    description: 'Adobe InDesign/InCopy ICML',
    input: false,
    output: true,
    extensions: ['icml'],
  },
  ipynb: {
    description: 'Jupiter notebook',
    input: true,
    output: true,
    extensions: ['ipynb'],
  },
  json: {
    priority: 2,
    description: 'Pandoc JSON',
    input: true,
    output: true,
    extensions: ['json'],
  },
  latex: {
    description: 'LaTeX',
    input: true,
    output: true,
    extensions: ['latex', 'ltx', 'tex'],
  },
  markdown: {
    priority: 1,
    description: 'Markdown or text file',
    input: true,
    output: true,
    extensions: [
      'Rmd',
      'lhs',
      'markdown',
      'md',
      'mdown',
      'mdwn',
      'mkd',
      'mkdn',
      'text',
      'txt',
    ],
  },
  markua: {
    description: 'Markua',
    input: false,
    output: true,
    extensions: ['markua'],
  },
  mediawiki: {
    description: 'MediaWiki',
    input: true,
    output: true,
    extensions: ['wiki'],
  },
  ms: {
    description: 'GNU man/roff',
    input: false,
    output: true,
    extensions: ['ms', 'roff'],
  },
  muse: {
    description: 'Emacs Muse',
    input: true,
    output: true,
    extensions: ['muse'],
  },
  native: {
    description: 'Pandoc native',
    input: true,
    output: true,
    extensions: ['native'],
  },
  odt: {
    priority: 1,
    description: 'OpenOffice/LibreOffice docx',
    input: true,
    output: true,
    extensions: ['odt'],
  },
  opml: {
    description: 'Outline Processor Markup Language',
    input: true,
    output: true,
    extensions: ['opml'],
  },
  org: {
    description: 'Emacs Org-Mode',
    input: true,
    output: true,
    extensions: ['org'],
  },
  plain: {
    description: 'plain text file',
    input: false,
    output: true,
    extensions: ['text', 'txt'],
  },
  pdf: {
    description: 'PDF',
    input: false,
    output: true,
    extensions: ['pdf'],
  },
  pptx: {
    description: 'Microsoft PowerPoint',
    input: false,
    output: true,
    extensions: ['pptx'],
  },
  ris: {
    description: 'RIS',
    input: true,
    output: false,
    extensions: ['ris'],
  },
  rst: {
    description: 'reStructuredText',
    input: true,
    output: true,
    extensions: ['rst'],
  },
  rtf: {
    priority: 1,
    description: 'Rich Text Format',
    input: true,
    output: true,
    extensions: ['rtf'],
  },
  s5: {
    description: 'S5 slide show',
    input: false,
    output: true,
    extensions: ['s5'],
  },
  t2t: {
    description: 'txt2tags',
    input: true,
    output: false,
    extensions: ['t2t'],
  },
  tei: {
    description: 'XML:TEI Simple',
    input: false,
    output: true,
    extensions: ['tei'],
  },
  texinfo: {
    description: 'GNU TexInfo',
    input: false,
    output: true,
    extensions: ['texi', 'texinfo'],
  },
  textile: {
    description: 'Textile',
    input: true,
    output: true,
    extensions: ['textile'],
  },
  tsv: {
    description: 'TSV tables',
    input: true,
    output: false,
    extensions: ['tsv'],
  },
  typst: {
    description: 'Typst',
    input: true,
    output: true,
    extensions: ['typ'],
  },
};

const DEFAULT_FORMAT_PRIORITY = 1;

/**
 * File filters for electron when calling `Electron.dialog.showOpenDialog`.
 * @param priority the minimum priority a format must have to be included in the return value.
 * @returns
 */
export function pandocInputFileFilters(priority?: number): FileFilter[] {
  const p = priority || DEFAULT_FORMAT_PRIORITY;
  return Object.entries(pandocFormats)
    .filter(([_, f]) => f.input === true && (f.priority || 0) >= p)
    .sort(([n1, f1], [n2, f2]) =>
      f1.priority && f2.priority ? f2.priority - f1.priority : 0
    )
    .map(([name, f]) => ({
      name: f.description || name,
      extensions: f.extensions,
    }));
}

export function pandocFormatsFromExtension(ext: string): string[] {
  if (!ext) return [];
  const ext_without_dot = ext.startsWith('.') ? ext.substring(1) : ext;
  return Object.entries(pandocFormats)
    .filter(([_, f]) => f.extensions.indexOf(ext_without_dot) >= 0)
    .map(([format, _]) => format);
}
