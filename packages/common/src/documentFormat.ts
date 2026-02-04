import {
  CustomFormat,
  InputConverter,
  OutputConverter,
  PundokEditorConfig,
  PundokEditorConfigInit
} from "./config"
import { ImageFormatDescription } from "./imageFormats"
import {
  DEFAULT_COPY_FORMAT,
  DEFAULT_FORMAT,
  formatDescriptionsFromFilename,
  PandocConversionDir,
  PandocFormatDescription,
  pandocFormatsDefs,
  pandocFormatToInputConverter,
  pandocFormatToOutputConverter
} from "./pandocFormat"

/**
 * Type of documents' formats. It can be:
 * - `guess`            a special type to leave the editor guess the right format.
 * - `format`           a format natively supported by Pandoc (the ones you get with
 *                      `--list-input-formats` and `--list-output-formats`).
 * - `input-converter`  an InputConverter, so a format/custom reader with options for Pandoc
 *                      or a script to read a file as Pandoc JSON.
 * - `output-converter` an OutputConverter, so a format/custom writer with options for Pandoc
 *                      or a script to write a file as Pandoc JSON.
 * - `image`            a format used to choose image files in OpenDocumentDialog.
 */
export type DocumentFormatType =
  | 'guess'
  | 'format'
  | 'input-converter'
  | 'output-converter'
  | 'image'

/**
 * The document format can be a plain Pandoc format or a (input or output) converter.
 */
export type DocumentFormat = (PandocFormatDescription | InputConverter | OutputConverter | ImageFormatDescription)
  & {
    ftype: DocumentFormatType,
    /** The extensions of the documents (files) of this format. */
    extensions?: string[],
    /** The name of the Configuration or Project it comes from. */
    source?: string,
  }

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

/**
 * If a format is both input and output, return it, otherwise return undefined.
 * @param format 
 * @returns 
 */
export function asInputFormat(format?: DocumentFormat): DocumentFormat | undefined {
  switch (format?.ftype) {
    case 'input-converter':
    case 'image':
      return format
    case 'format':
    case 'guess':
      return (format as PandocFormatDescription).input === true && format || undefined
    case 'output-converter':
    default:
      return undefined
  }
}

/**
 * If a format is both input and output, return it, otherwise return undefined.
 * @param format 
 * @returns 
 */
export function asOutputFormat(format?: DocumentFormat): DocumentFormat | undefined {
  switch (format?.ftype) {
    case 'output-converter':
    case 'image':
      return format
    case 'format':
    case 'guess':
      return (format as PandocFormatDescription).output === true && format || undefined
    case 'input-converter':
    default:
      return undefined
  }
}

export function documentFormatExtension(format: DocumentFormat): string | undefined {
  const extensions: string[] = (format as any).extensions || []
  switch (format.ftype) {
    case 'format':
    case 'input-converter':
    case 'image':
      return extensions[0]
    case 'output-converter':
      return (format as OutputConverter).extension
    default:
  }
}

export function changeFileExtensionToFormat(
  filename: string,
  format: DocumentFormat,
  addIfMissing?: boolean
): string {
  const ext = format && documentFormatExtension(format)
  if (ext) {
    let hasExt = true
    let renamed = filename.replace(/^(.*?)(([.][0-9a-z]{1,5})*[.][0-9a-z]*)$/i,
      (_, base, oldext) => {
        if (oldext?.length > 0)
          return `${base}.${ext}`
        else
          hasExt = false
        return `${base}${oldext}`
      })
    if (filename.length > 0 && renamed == filename && !renamed.endsWith('.' + ext) && (hasExt && addIfMissing))
      renamed = filename + '.' + ext
    return renamed
  }
  return filename
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

export function outputConverterToDocumentFormat(oc: OutputConverter): DocumentFormat {
  return {
    ftype: 'output-converter',
    ...oc,
    extensions: oc.extension && [oc.extension] || []
  }
}

export function pandocFormatToDocumentFormat(name: string): DocumentFormat | undefined {
  const desc = pandocFormatsDefs[name]
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
  direction: PandocConversionDir,
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
  direction: PandocConversionDir,
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
  'guess': 3,
  'format': 5,
  'input-converter': 7,
  'output-converter': 7,
  'image': 1,
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
    const priority1 = (df1 as PandocFormatDescription).priority || 1
    const priority2 = (df2 as PandocFormatDescription).priority || 1
    const diff_priority = priority2 - priority1
    return diff_priority
  }
  return 0
}

export function documentFormatsFromFilename(
  pandocFormats: PandocFormatDescription[],
  filename: string,
  direction: PandocConversionDir = 'input',
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
  return dformats.concat(formatDescriptionsFromFilename(pandocFormats, filename, direction)
    .map(f => ({ ftype: 'format', ...f })))
    .sort(documentFormatsCompare)
}

export function documentFormatIcon(format?: DocumentFormat, defaultIcon?: string): string | undefined {
  let icon
  if (format?.ftype === 'input-converter')
    icon = format?.icon || 'mdi-import'
  else if (format?.ftype === 'output-converter')
    icon = format?.icon || 'mdi-export'
  else
    icon = format?.icon
  return icon || defaultIcon
}

export function documentFormatFromPandocFormatDescription(pfd: PandocFormatDescription): DocumentFormat {
  return { ...pfd, ftype: 'format', source: 'pandoc' }
}

export function documentFormatFromInputConverter(ic: InputConverter, source?: string): DocumentFormat {
  return { ...ic, ftype: 'input-converter', source }
}

export function documentFormatFromOutputConverter(oc: OutputConverter, source?: string): DocumentFormat {
  const extensions = oc.extension ? [oc.extension] : undefined
  return { ...oc, extensions, ftype: 'output-converter', source }
}

export const DEFAULT_DOCUMENT_FORMAT: DocumentFormat = pandocFormatToDocumentFormat(DEFAULT_FORMAT)!
export const DEFAULT_COPY_DOCUMENT_FORMAT: DocumentFormat = pandocFormatToDocumentFormat(DEFAULT_COPY_FORMAT)!
