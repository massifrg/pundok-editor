import { Automation } from './automations';
import { CustomAttribute } from './customAttributes';
import { CustomClass } from './customClasses';
import { CustomStyleDef } from './customStyles';
import { Index } from './indices';
import { InputConverter } from './inputConverters';
import { NoteStyle } from './notes';
import { OutputConverter } from './outputConverters';
import { InsertableRaw } from './rawElements';

/**
 * A configuration (customization) of PandocEditor.
 */
export interface PandocEditorConfigInit extends Record<string, any> {
  /** the name of the configuration (please only letters, numbers and underscore) */
  name: string;
  /** the minimal suitable version of the editor */
  version: number[];
  /** a description of the aim of this configuration of the editor */
  description: string;
  /** the names of other configurations to derive this from */
  inherits?: string[];
  /** options for TipTap/Prosemirror `Node`s and `Mark`s */
  tiptap?: {
    options?: Record<string, any>;
  };
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
  /** styling information for different kinds of notes (footnotes, endnotes, etc.) */
  noteStyles?: NoteStyle[];
  /** paths to CSS files that customize the editor's appearance */
  customCss?: string[];
  /** indices' definitions */
  indices?: Index[];
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
