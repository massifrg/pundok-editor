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
  format: string;
  title?: string;
  content?: string | string[];
}
