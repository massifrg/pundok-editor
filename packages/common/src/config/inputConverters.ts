import { PandocOption } from "../pandocOptions";
import { PandocFilter } from "../pandoc";
import { NamedAndDescribed } from "../types";

export type InputConverterType = 'pandoc' | 'script' | 'custom';

/**
 * A base type for documents' import. Use only 0-9a-z_- characters for its name.
 */
export type BaseInputConverter = NamedAndDescribed & {
  /** kind of importer (used by derived types) */
  type: InputConverterType;
  /** true for the default input converter (only one can be default, otherwise it's the first encountered) */
  default?: boolean;
  /** input file extensions */
  extensions: string[];
  /** asks for feedback about the conversion (i.e. the `pandoc ...` command line used for the conversion) */
  feedback?: string;
  /** optional icon */
  icon?: string;
};

/**
 * An input converter that spawns a pandoc process to import a document.
 */
export type PandocInputConverter = BaseInputConverter & {
  type: 'pandoc';
  /** a pandoc's input format or a custom reader */
  format: string;
  /** The extensions of the format to be used */
  formatExtensions?: string[];
  /** optional filter (pandoc's `--filter` option) */
  filters?: (string | PandocFilter)[];
  /** Extra Pandoc options, each as [name, value?]. */
  pandocOptions?: PandocOption[];
};

export type CustomInputConverter = BaseInputConverter & {
  type: 'custom';
  /** options for internal "custom" converters */
  options: Record<string, any>;
};

export type ExternalInputConverter = BaseInputConverter & {
  type: 'script';
  /** command to execute for external "script" converters */
  command: string;
  /** command-line arguments for external script */
  commandArgs: string[];
};

export type InputConverter =
  | PandocInputConverter
  | CustomInputConverter
  | ExternalInputConverter;
