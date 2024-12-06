export type InputConverterType = 'pandoc' | 'script' | 'custom';

/**
 * A base type for documents' import.
 */
export type BaseInputConverter = {
  /** name of the filter, use only 0-9a-z_- characters */
  name: string;
  /** kind of importer (used by derived types) */
  type: InputConverterType;
  /** true for the default input converter (only one can be default, otherwise it's the first encountered) */
  default?: boolean;
  /** description of the converter */
  description?: string;
  /** input file extensions */
  extensions: string[];
  /** asks for feedback about the conversion (i.e. the `pandoc ...` command line used for the conversion) */
  feedback?: string;
};

/**
 * An input converter that spawns a pandoc process to import a document.
 */
export type PandocInputConverter = BaseInputConverter & {
  type: 'pandoc';
  /** a pandoc's input format or a lua script */
  format: string;
  /** extra command-line options for pandoc */
  pandocOptions?: string[];
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
