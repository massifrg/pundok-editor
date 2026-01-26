import { InputConverter, OutputConverter } from "./config"
import { PandocFormatDescription } from "./pandocFormat"

export type DocumentFormatType = 'guess' | 'format' | 'input-converter' | 'output-converter'
/**
 * The document format can be a plain Pandoc format or a (input or output) converter.
 */
export type DocumentFormat = (PandocFormatDescription | InputConverter | OutputConverter)
  & { ftype: DocumentFormatType }

export const guessFormat: DocumentFormat = {
  ftype: 'guess',
  name: 'guess',
  description: 'let the editor guess the format from the file',
  icon: 'mdi-file-question',
  input: true,
  output: false,
  extensions: [],
  priority: 1,
}

export function documentFormatExtension(format: DocumentFormat): string | undefined {
  const extensions: string[] = (format as any).extensions || []
  switch (format.ftype) {
    case 'format':
      return extensions[0]
    case 'input-converter':
      return extensions[0]
    case 'output-converter':
      return (format as OutputConverter).extension
    default:
  }
}
