import { PundokEditorConfig } from './editorConfiguration';

/**
 * Types of automations available:
 * - `elements-selection`: selections of nodes or marks with CSS-like selectors
 * - `pandoc-filter`: apply a pandoc filter to this document or to another document and
 *     + replace the current document with the result
 *     + or append/prepend the result to the current document
 * - `search-replace`: define a search/replace operation
 */
export type AutomationType =
  | 'elements-selection'
  | 'pandoc-filter'
  | 'search-replace';

/**
 * Configuration of the interface of the editor
 * to ease the transformation of the document, like:
 * - selection of nodes or marks with CSS selectors;
 * - transformation of the current document with Pandoc filters;
 * - search and replace operations.
 */
export interface Automation extends Record<string, any> {
  type: AutomationType;
  name: string;
  description?: string;
}

/**
 * Marks that can be used to select the spans of text in the document
 * that are covered by them in search/replace operations.
 * E.g. you can search for all the spans that are marked with Pandoc `Emph` Inline.
 */
export type SearchAndReplaceMark =
  | 'emph'
  | 'strong'
  | 'underline'
  | 'strikeout'
  | 'superscript'
  | 'subscript'
  | 'smallcaps'
  | 'singleQuoted'
  | 'doubleQuoted';

/**
 * A `Span`, with eventual `Attr`'s classes and attributes that can be added as a result
 * of a replacement in search/replace operations.
 * It's an extendend version of applying a custom style `Span` to selected portions of text.
 */
export interface SearchAndReplaceSpan {
  name: string;
  description?: string;
  icon?: string;
  /** The classes that the `Span` will have. */
  classes?: string[];
  /** The attributes that the `Span` will have. */
  kv?: Record<string, string>;
}

/**
 * The types of capitalization
 */
export type Capitalize = 'none' | 'lower' | 'upper' | 'first';

/**
 * Definition of predefined search/replace operations.
 * You can search exact text, regular expressions or by Mark or custom style.
 * You can replace with exact text or regexes.
 * In the replacement you can change the capitalization and/or you can add Marks,
 * custom styles, or `Span`s carrying particular classes and attributes.
 */
export interface SearchAndReplace extends Automation {
  type: 'search-replace';
  /** The exact text or regular expression to search. */
  search: string;
  /** The replacement text (exact or strings with `$1`, `$2`, etc. for regular expressions). */
  replace?: string;
  /** Just search, don't replace. */
  optionSearchOnly?: boolean;
  /** Case insensitive search. */
  optionCaseInsensitive?: boolean;
  /** Search for regular expressions instead of exact text when `true`. */
  optionRegex?: boolean;
  /** Restart at the top of the document, when the search arrives to the end. */
  optionCycle?: boolean;
  /** Search for whole words. */
  optionWholeWord?: boolean;
  /** How to change capitalization on replaced text. */
  capitalize?: Capitalize;
  /** Marks to add to replaced text. */
  addMarks?: SearchAndReplaceMark[];
  /** Custom styles to add to replaced text. */
  addStyles?: string[];
  /** Custom `Span` Marks to add to replaced text. */
  addSpans?: SearchAndReplaceSpan[];
}

/**
 * Definition of predefined selections of elements,
 * through CSS selectors.
 */
export interface ElementsSelection extends Automation {
  type: 'elements-selection';
  /** The CSS selector to select `Node`s or `Mark`s */
  cssSelector: string;
  /** The default tab on which to open the element attributes dialog. */
  tab?: string;
}

/** What to do with the result of a document transformation. */
export type WhatToDoWithResult =
  | 'replace' // replace the whole document (default)
  | 'append' // append to the document
  | 'prepend'; // prepend to the blocks of the document

export type PandocVariables = Record<string, any>;
export type PandocMetadata = Record<string, boolean | number | string>;

/**
 * A trasformation of the whole document applying pandoc filters.
 */
export interface PandocFilterTransform extends Automation {
  type: 'pandoc-filter';
  /** The pandoc filters to be applied (in the order of the array) */
  filters: string[];
  /** Which source to use as input. The current document if not specified. */
  sources?: string[];
  /** What to do with the output of the transformation. */
  withResult?: WhatToDoWithResult;
  /** Variables to be passed to the filter via --variable */
  variables?: PandocVariables;
  /** Metadata to be passed to the filter via --metadata */
  metadata?: PandocMetadata;
  /** Input format (default: json) */
  fromFormat?: 'json' | 'markdown';
  /** Output format (default: json) */
  toFormat?: 'json' | 'markdown';
  /** Extra pandoc options */
  pandocOptions?: string[];
}

/**
 * Returns only the automations of a configuration
 * of a certain type.
 * @param automationType
 * @param configuration
 * @returns
 */
function getAutomations(
  automationType: AutomationType,
  configuration?: PundokEditorConfig,
): Automation[] {
  return (configuration?.automations || []).filter(
    (a) => a.type === automationType,
  );
}

/**
 * Returns only the automations of a configuration
 * of type `search-replace`.
 * @param configuration
 * @returns
 */
export function getSearchAndReplaces(
  configuration?: PundokEditorConfig,
): SearchAndReplace[] {
  return getAutomations('search-replace', configuration) as SearchAndReplace[];
}

/**
 * Returns only the automations of a configuration
 * of type `elements-selection`.
 * @param configuration
 * @returns
 */
export function getElementsSelections(
  configuration?: PundokEditorConfig,
): ElementsSelection[] {
  return getAutomations(
    'elements-selection',
    configuration,
  ) as ElementsSelection[];
}

/**
 * Returns only the automations of a configuration
 * of type `pandoc-filter`.
 * @param configuration
 */
export function getPandocFilterTransforms(
  configuration?: PundokEditorConfig,
): PandocFilterTransform[] {
  return getAutomations(
    'pandoc-filter',
    configuration,
  ) as PandocFilterTransform[];
}
