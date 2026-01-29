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
  formatDescriptionsFromFilename,
  PandocFormatDescription,
  pandocFormats,
  pandocFormatsFromExtension,
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

const DOCFORMAT_FTYPE_TO_VALUE: Record<DocumentFormatType, number> = {
  'guess': 1,
  'format': 2,
  'input-converter': 3,
  'output-converter': 3
}

/**
 * A comparison function to sort document formats.
 * @param df1
 * @param df2 
 */
function documentFormatsCompare(df1: DocumentFormat, df2: DocumentFormat): number {
  const ftype1 = df1.ftype
  const diff_ftype = DOCFORMAT_FTYPE_TO_VALUE[df2.ftype] - DOCFORMAT_FTYPE_TO_VALUE[ftype1]
  if (diff_ftype !== 0)
    return diff_ftype
  if (ftype1 === 'format') {
    const see1 = (df1 as PandocFormatDescription).see ? 1 : 2
    const see2 = (df2 as PandocFormatDescription).see ? 1 : 2
    const diff_see = see2 - see1
    if (diff_see !== 0)
      return diff_see
  }
  return 0
}

export function documentFormatsFromFilename(
  filename: string,
  direction: 'input' | 'output' = 'input',
  config?: PundokEditorConfig | PundokEditorConfigInit
): DocumentFormat[] {
  const dformats: DocumentFormat[] = []
  if (config) {
    // 1. search custom formats (they have precedence over Pandoc formats with the same extension)
    config.customFormats?.forEach(cf => {
      if (filename.endsWith('.' + cf.extension)) {
        const df = customFormatToDocumentFormat(cf, direction, config)
        if (df) dformats.push(df)
      }
    })
    // 2. search InputConverters or OutputConverters
    if (direction === 'input') {
      config.inputConverters?.forEach(ic => {
        if (ic.extensions?.find(ext => (filename.endsWith('.' + ext))))
          dformats.push({ ftype: 'input-converter', ...ic })
      })
    } else {
      config.outputConverters?.forEach(oc => {
        if (filename.endsWith('.' + oc.extension))
          dformats.push({ ftype: 'output-converter', ...oc })
      })
    }
  }
  // 3. search pandoc formats
  return dformats.concat(formatDescriptionsFromFilename(filename, direction)
    .map(f => ({ ftype: 'format', ...f })))
    .sort(documentFormatsCompare)
}


export const DEFAULT_DOCUMENT_FORMAT: DocumentFormat = pandocFormatToDocumentFormat(DEFAULT_FORMAT)!
export const DEFAULT_COPY_DOCUMENT_FORMAT: DocumentFormat = pandocFormatToDocumentFormat(DEFAULT_COPY_FORMAT)!
