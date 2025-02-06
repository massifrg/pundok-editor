/**
 * Base data structures for indices support.
 *
 * Indices are implemented with 3 objects:
 * - IndexDiv, a Pandoc Div with a INDEX_CLASS class
 * - IndexTerm, a Pandoc Div with a INDEX_TERM_CLASS class,
 *              that should normally stay inside an IndexDiv
 * - IndexRef, a Pandoc Span with a class that is not known in advance
 */

export const INDEX_CLASS = 'index';
export const INDEX_TERM_CLASS = 'index-term';
export const INDEX_SEE_TERM_CLASS = 'index-term';
export const DEFAULT_INDEX_NAME = 'index';
export const DEFAULT_INDEX_REF_CLASS = 'index-ref';
export const DEFAULT_PUT_INDEX_REF: IndexRefPlacement = 'before';
export const INDEX_NAME_ATTR = 'index-name';
export const INDEXED_TEXT_ATTR = 'indexed-text';
export const INDEX_REF_CLASS_ATTR = 'ref-class';
export const INDEX_SORT_KEY_ATTR = 'sort-key';
export const INDEX_PUT_INDEX_REF_ATTR = 'put-index-ref';
export const INDEX_RANGE_ATTR = 'index-range';
export const INDEX_COLORS_PALETTE = [
  '#dc7200', '#9edc00', '#00dccd', '#1600dc', '#ffff39'
]
export const DEFAULT_INDEX_COLOR = INDEX_COLORS_PALETTE[0];
export const DEFAULT_INDEX_ICON_SVG =
  'M13.75,10.19L14.38,10.32L18.55,12.4C19.25,12.63 19.71,13.32 19.65,14.06V14.19L19.65,14.32L18.75,20.44C18.69,20.87 18.5,21.27 18.15,21.55C17.84,21.85 17.43,22 17,22H10.12C9.63,22 9.18,21.82 8.85,21.47L2.86,15.5L3.76,14.5C4,14.25 4.38,14.11 4.74,14.13H5.03L9,15V4.5A2,2 0 0,1 11,2.5A2,2 0 0,1 13,4.5V10.19H13.75Z'; //'mdi-cursor-pointer';

export type IndexRefPlacement = 'before' | 'after';

/**
 * The definition of an index.
 */
export interface Index {
  /** the name of the index (es. "names", "bibliographic", "subjects", "geographic") */
  indexName: string;
  /** the class to add to the references to the terms in this index */
  refClass: string;
  /** where the index reference is put (before or after the reference) */
  putIndexRef?: IndexRefPlacement;
  /** icon for the toolbar button */
  iconSvg?: string;
  /** a Unicode character as an alternative to the icon */
  iconChar?: string;
  /** color used to highlight the references to the terms in this index */
  color?: string;
  /** allow indexing ranges (see \startregister, \stopregister in ConTeXt) */
  allowRanges?: boolean;
  /** allow empty Span elements */
  allowEmpty?: boolean;
  /** only empty Span elements allowed */
  onlyEmpty?: boolean;
}

/**
 * The CSS properties used for index ref decorations
 * @param index
 * @returns
 */
export function indexRefDecorationCss(index?: Index) {
  const color = index?.color || DEFAULT_INDEX_COLOR;
  return `border-bottom: 3px solid ${color};`;
}
