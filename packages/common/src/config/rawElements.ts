export const DEFAULT_RAW_INLINES: string[] = [
  'asciidoc',
  'html',
  'context',
  'docx',
  'markdown',
  'odt',
  'plain',
  'latex',
  'icml',
  'epub',
  'bibtex',
];

export const DEFAULT_RAW_INLINE_FORMAT = 'plain';
export const DEFAULT_RAW_BLOCK_FORMAT = 'plain';

export interface InsertableRaw {
  /** The output format of the RawInline or RawBlock. */
  format: string;
  /** The description of the raw element. */
  title?: string;
  /** The actual contents of the raw element or of the couple of elements that will go around the selection. */
  content?: string | string[];
}
