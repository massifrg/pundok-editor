import { PandocFormatDescription } from "../pandocFormat";

/**
 * A custom format lets you define new formats, starting from
 * Pandoc's formats or custom reader/writers through input/output converters.
 */
export interface CustomFormat {
  /** The name of the custom format. */
  name: string,
  /** The description of the custom format */
  description?: string,
  /** The name of a pandoc input format or the name of an existent InputConverter. */
  reader: string,
  /** The name of a pandoc output format or the name of an existent OutputConverter. */
  writer: string,
  /** The extension of the files of this format. */
  extension: string,
  /** An optional icon for the format. */
  icon?: string,
}

export function customFormatToPandocFormatDescription(cf: CustomFormat): PandocFormatDescription {
  return {
    name: cf.name,
    description: cf.description,
    input: !!cf.reader,
    output: !!cf.writer,
    extensions: [cf.extension],
    icon: cf.icon,
  }
}