import { Config } from 'electron';
import { Automation } from './automations';
import { CustomAttribute } from './customAttributes';
import { CustomClass } from './customClasses';
import { CustomMetadata } from './customMetadata';
import { CustomStyleDef } from './customStyles';
import { Index } from './indices';
import { InputConverter } from './inputConverters';
import { NoteStyle } from './notes';
import { OutputConverter } from './outputConverters';
import { InsertableRaw } from './rawElements';
import { NamedAndDescribed } from './types';

/**
 * A configuration (customization) of PundokEditor.
 */
export interface PundokEditorConfigInit extends NamedAndDescribed {
  /** the minimal suitable version of the editor */
  version: number[];
  /** the configuration is local (this is set by the editor, it's overridden if set by the user) */
  isLocal?: boolean;
  /** the names of other configurations to derive this from */
  inherits?: string[];
  /** options for TipTap/Prosemirror `Node`s and `Mark`s */
  tiptap?: {
    options?: Record<string, any>;
  };
  /** the name of a pandoc format or an InputConverter used as default to open documents. */
  workingFormat?: string;
  /** the name of the format (pandoc or custom) used with "Save a copy" */
  copyFormat?: string,
  /** the names of the formats that are more visible in the GUI with this configuration */
  mainFormats?: string[],
  /** a template for new documents */
  documentTemplate?: string;
  /** automatic delimiters for Marks like singleQuoted or doubleQuoted,
   * e.g. { doubleQuoted: [ "“", "”" ], singleQuoted: [ "‘", "’" ] } */
  autoDelimiters?: Record<string, string[]>;
  /** custom styles for paragraphs, spans, headings, divs, etc. */
  customStyles?: CustomStyleDef[];
  /** custom classes for Pandoc's elements with an `Attr` data stucture */
  customClasses?: CustomClass[];
  /** custom attributes for Pandoc's elements with an `Attr` data stucture */
  customAttributes?: CustomAttribute[];
  /** custom metadata keys and types */
  customMetadata?: CustomMetadata[];
  /** styling information for different kinds of notes (footnotes, endnotes, etc.) */
  noteStyles?: NoteStyle[];
  /** paths to CSS files that customize the editor's appearance */
  customCss?: string[];
  /** indices' definitions */
  indices?: Index[];
  /** Default format when creating RawInline and RawBlock elements. */
  defaultRawFormat?: string;
  /** `RawInline samples to be made available through the editor interface */
  rawInlines?: InsertableRaw[];
  /** `RawBlock samples to be made available through the editor interface */
  rawBlocks?: InsertableRaw[];
  /** scripts, filters, etc. to import documents */
  inputConverters?: InputConverter[];
  /** scripts, filters, etc. to export documents */
  outputConverters?: OutputConverter[];
  /** predefined search&replace, macro, whatever related to automation tools */
  automations?: Automation[];
}

/** The fields allowed in a configuration init object. */
export type ConfigInitField = keyof PundokEditorConfigInit

export type PrunableConfigInitField = keyof Pick<PundokEditorConfigInit,
  | 'autoDelimiters'
  | 'automations'
  | 'customAttributes'
  | 'customClasses'
  | 'customCss'
  | 'customMetadata'
  | 'customStyles'
  | 'indices'
  | 'inputConverters'
  | 'mainFormats'
  | 'noteStyles'
  | 'outputConverters'
>
