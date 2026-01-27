import {
  CustomFormat,
  InputConverter,
  OutputConverter,
  PundokEditorConfig,
  PundokEditorConfigInit
} from "./config"
import {
  DEFAULT_COPY_FORMAT,
  DEFAULT_FORMAT,
  PandocFormatDescription,
  pandocFormats,
  pandocFormatToInputConverter,
  pandocFormatToOutputConverter
} from "./pandocFormat"

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

export function documentFormatToInputConverter(format?: DocumentFormat): InputConverter | undefined {
  if (format) {
    switch (format.ftype) {
      case 'format':
        return pandocFormatToInputConverter(format)
      case 'input-converter':
        return format as InputConverter
      default:
        return undefined
    }
  }
  return undefined
}

export function documentFormatToOutputConverter(format?: DocumentFormat): OutputConverter | undefined {
  if (format) {
    switch (format.ftype) {
      case 'format':
        return pandocFormatToOutputConverter(format)
      case 'output-converter':
        return format as OutputConverter
      default:
        return undefined
    }
  }
  return undefined
}

export function pandocFormatToDocumentFormat(name: string): DocumentFormat | undefined {
  const desc = pandocFormats[name]
  if (desc) {
    return {
      ftype: 'format',
      ...desc
    }
    return undefined
  }
}


export function customFormatToDocumentFormat(
  cf: CustomFormat,
  direction: 'input' | 'output',
  config?: PundokEditorConfig | PundokEditorConfigInit,
): DocumentFormat {
  const isInput = direction === 'input'
  const converter = isInput
    ? config?.inputConverters?.find(c => c.name === cf.reader)
    : config?.outputConverters?.find(c => c.name === cf.writer)
  const ftype: DocumentFormatType = isInput ? 'input-converter' : 'output-converter'
  return { ftype, ...converter }
}

export function documentFormatWithName(
  name: string,
  direction: 'input' | 'output',
  config?: PundokEditorConfig | PundokEditorConfigInit
): DocumentFormat | undefined {
  // 1. search a pandoc format
  let format = pandocFormatToDocumentFormat(name)
  if (!format && config) {
    // 2. search a custom format
    const custom = config.customFormats?.find(f => f.name === name)
    if (custom)
      format = customFormatToDocumentFormat(custom, direction, config)
    // 3. search an InputConverter or an OutputConverter
    if (!format) {
      const isInput = direction === 'input'
      const converter = isInput
        ? config?.inputConverters?.find(c => c.name === name)
        : config?.outputConverters?.find(c => c.name === name)
      format = {
        ftype: isInput ? 'input-converter' : 'output-converter',
        ...converter
      }
    }
  }
  return format
}

export const DEFAULT_DOCUMENT_FORMAT: DocumentFormat = pandocFormatToDocumentFormat(DEFAULT_FORMAT)!
export const DEFAULT_COPY_DOCUMENT_FORMAT: DocumentFormat = pandocFormatToDocumentFormat(DEFAULT_COPY_FORMAT)!
