import { isBoolean, isString } from "lodash";
import { NamedAndDescribed } from "./types";

export type PandocFeatureName = 'input-formats' | 'output-formats' | 'extensions'

export interface PandocFeatureOptions {
  format?: string;
}

type ParameterType = string | boolean

/** Parameters to be passed to filters and custom writers */
interface PandocParameters {
  metadata?: Record<string, ParameterType>;
  variables?: Record<string, ParameterType>;
}

/** A pandoc filter with its specific parameters */
export interface PandocFilter extends NamedAndDescribed, PandocParameters { }

/** A pandoc custom writer with its specific parameters */
export interface PandocCustomWriter extends NamedAndDescribed, PandocParameters { }

function filterOrWriterName(fow: string | PandocFilter | PandocCustomWriter): string {
  return isString(fow) ? fow : fow.name
}

export const pandocFilterName: (filter: string | PandocFilter) => string = filterOrWriterName
export const pandocCustomWriterName: (writer: string | PandocCustomWriter) => string = filterOrWriterName

function paramsToOptions(option: 'M' | 'V', params?: Record<string, ParameterType>) {
  let opts: string[] = []
  Object.entries(params || {}).forEach(([k, v]) => {
    opts.push(`-${option}`)
    if (isString(v))
      opts.push(`${k}=${JSON.stringify(v)}`)
    else if (isBoolean(v) && v)
      opts.push(k)
    else
      opts.push(`${k}=${v.toString()}`)
  })
  return opts
}

export const pandocParametersToCliOptions: (params: PandocParameters) => string[] =
  (params) => ([] as string[])
    .concat(paramsToOptions('M', params?.metadata))
    .concat(paramsToOptions('V', params?.variables))

/**
 * Compute the pandoc command line options for a filter.
 * @param filter The pandoc filter.
 * @param filterPath Optional complete filter path (path + filename).
 * @returns 
 */
export function pandocFilterToCliOptions(
  filter: string | PandocFilter,
  filterPath?: string,
): string[] {
  const opts: string[] = isString(filter)
    ? []
    : pandocParametersToCliOptions(filter)
  const filepath = filterPath || pandocFilterName(filter)
  opts.push(`${filepath.endsWith('.lua') ? '--lua-filter' : '--filter'}=${JSON.stringify(filepath)}`)
  return opts
}

/**
 * Compute the pandoc command line options for a custom writer.
 * @param writer The pandoc custom writer.
 * @param writerPath Optional complete writer path (path + filename).
 * @returns 
 */
export function pandocCustomWriterToCliOptions(
  writer: string | PandocFilter,
  writerPath?: string,
): string[] {
  const opts: string[] = isString(writer)
    ? []
    : pandocParametersToCliOptions(writer)
  opts.push('-t')
  opts.push(JSON.stringify(writerPath || pandocCustomWriterName(writer)))
  return opts
}