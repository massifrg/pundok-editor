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
import { NamedAndDescribed } from '../types';
import { AutoDelimitersDef } from './autoDelimiters';

/**
 * Fields for configuration typing and versioning
 */
export interface PundokEditorConfigType {
  /** the minimal suitable version of the editor */
  version: number[];
  /** the configuration is local (this is set by the editor, it's overridden if set by the user) */
  isLocal?: boolean;
}

/**
 * Fields that are common to project and configuration.
 */
export interface BasePundokEditorProjectConfig {
  /** the name of a pandoc format or an InputConverter used as default to open documents. */
  workingFormat?: string;
  /** the name of the format (pandoc or custom) used with "Save a copy" */
  copyFormat?: string;
  /** the names of the formats that are more visible in the GUI with this configuration */
  mainFormats?: string[];
  /** a template for new documents */
  documentTemplate?: string;
  /** automatic delimiters for Marks like singleQuoted or doubleQuoted,
   * e.g. { doubleQuoted: [ "“", "”" ], singleQuoted: [ "‘", "’" ] } */
  autoDelimiters?: AutoDelimitersDef;
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

/**
 * All the fields to instantiate a Configuration.
 */
export interface PundokEditorConfigInit
  extends
    NamedAndDescribed,
    PundokEditorConfigType,
    BasePundokEditorProjectConfig {}

/** The fields allowed in a configuration init object. */
export type ConfigInitField = keyof PundokEditorConfigInit;

/**
 * All the fields that can be inherited from configurations,
 * but also pruned in a project.
 */
export type PrunableConfigInitField = keyof Pick<
  PundokEditorConfigInit,
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
>;

/**
 * A description of the elements to prune from an inherited configuration.
 */
export type ConfigurationPruning = Record<PrunableConfigInitField, string[]>;

/**
 * The configuration of a project is the result of:
 * - inheriting configurations
 * - pruning some of the inherited items
 * - adding some other project-specific items
 */
export interface PundokEditorProjectConfig extends BasePundokEditorProjectConfig {
  remove: ConfigurationPruning;
}

export type ConfigurationUpdateOptions = {
  /** The name of the configuration to be updated. */
  configurationName?: string;
  /** The path of the project to be updated. */
  projectPath?: string;
  /** The added/updated object (or the whole configuration), as a JSON-stringified object. */
  value: string;
  /** When updating a single section of the configuration, the name of the section ("automations", "customStyles", etc.); omit it to replace a whole project. */
  field?: ConfigInitField;
  /** When where is defined, what kind of operation to perform */
  operation: 'append' | 'update' | 'delete';
};
