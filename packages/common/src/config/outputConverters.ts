import { FeedbackMessageType } from '..';

/**
 * Output conversion can be done:
 * - spawning a `pandoc` process
 * - a `lua` script
 * - a generic external program or `script`
 * - `custom` hardcoded function
 */
export type OutputConverterType = 'pandoc' | 'lua' | 'custom' | 'script';

/**
 * The result of a conversion can be opened in the internal viewer
 * of the editor, or with the predefined OS app for that type of file.
 */
export type ShowOutputConversion = 'editor' | 'os';

/**
 * Definition of a document's converter to a particular format.
 */
export interface BaseOutputConverter {
  /**  name of the filter, use only 0-9a-z_- characters */
  name: string;
  /** converter's type: pandoc, lua script, generic program or internal function */
  type: OutputConverterType;
  /** true for the default output converter (only one can be default, otherwise it's the first encountered) */
  default?: boolean;
  /** description of the converter */
  description?: string;
  /** it's the build of a project-wise product */
  projectBuild?: boolean;
  /** format of the resulting output (pandoc's `-t` option) */
  format: string;
  /** extension of the resulting file */
  extension?: string;
  /** don't ask for the output file, because the script knows where to save its output */
  dontAskForResultFile?: boolean;
  /** the path of the output file */
  resultFile?: string;
  /** open resulting file in editor or with the OS's predefined app
   *  for that format/extension (Windows: "start", Linux: "xdg-open|exo-open|gnome-open", Mac: "open") */
  openResult?: ShowOutputConversion;
  /** asks for feedback about the conversion (i.e. the `pandoc ...` command line used for the conversion) */
  feedback?: FeedbackMessageType;
}

export interface PandocOutputConverter extends BaseOutputConverter {
  type: 'pandoc';
  /** optional filter (pandoc's `--filter` option) */
  filters?: string[];
  /** reference file for DOCX and ODT (pandoc's `--reference-doc` option) */
  referenceFile?: string;
  /** standalone output file (pandoc's `-s` option) */
  standalone?: boolean;
  /** pandoc template for standalone output (pandoc's `--template` option) */
  pandocTemplate?: string;
  /** extra command-line options for pandoc */
  pandocOptions?: string[];
}

export interface PandocLuaOutputConverter extends BaseOutputConverter {
  type: 'lua';
}

export interface CustomOutputConverter extends BaseOutputConverter {
  type: 'custom';
}

export interface ScriptOutputConverter extends BaseOutputConverter {
  type: 'script';
  /** command to execute for external "script" converters */
  command: string;
  /** command-line arguments for external script */
  commandArgs: string[];
}

export type OutputConverter =
  | PandocOutputConverter
  | PandocLuaOutputConverter
  | CustomOutputConverter
  | ScriptOutputConverter;
