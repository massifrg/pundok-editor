import { isBoolean, isString } from 'lodash';
import type { NamedAndDescribed } from './types';

export type PandocFeatureName =
  'input-formats' | 'output-formats' | 'extensions';

export interface PandocFeatureOptions {
  format?: string;
}

export type ParameterType = string | boolean;

export interface PandocParameter extends NamedAndDescribed {
  value?: ParameterType;
}

/** Parameters to be passed to filters and custom writers */
export interface PandocParameters {
  metadata?: PandocParameter[];
  variables?: PandocParameter[];
}

/** A pandoc filter with its specific parameters */
export interface PandocFilter extends NamedAndDescribed, PandocParameters {}

/** A pandoc custom writer with its specific parameters */
export interface PandocCustomWriter
  extends NamedAndDescribed, PandocParameters {}

function isParameterType(value: unknown): value is ParameterType {
  return isString(value) || typeof value === 'boolean';
}

/**
 * Convert a parameter list or the legacy parameter map to the current format.
 */
export function migratePandocParameterList(
  parameters: unknown,
): PandocParameter[] | undefined {
  if (parameters === undefined) return undefined;
  if (Array.isArray(parameters)) {
    return parameters.map((parameter) => {
      if (
        !parameter ||
        typeof parameter !== 'object' ||
        typeof (parameter as { name?: unknown }).name !== 'string'
      )
        throw new Error('Pandoc parameters must have a name');
      const { name, description, value } = parameter as {
        name: string;
        description?: unknown;
        value?: unknown;
      };
      if (description !== undefined && !isString(description))
        throw new Error(
          `Pandoc parameter "${name}" has an invalid description`,
        );
      if (value !== undefined && !isParameterType(value))
        throw new Error(`Pandoc parameter "${name}" has an invalid value`);
      return {
        name,
        ...(description !== undefined && { description }),
        ...(value !== undefined && { value }),
      };
    });
  }
  if (typeof parameters !== 'object' || parameters === null)
    throw new Error('Pandoc parameters must be an array or object');
  return Object.entries(parameters).map(([name, value]) => {
    if (!isParameterType(value))
      throw new Error(`Pandoc parameter "${name}" has an invalid value`);
    return { name, value };
  });
}

export function migratePandocParameters(
  parameters: Partial<Record<'metadata' | 'variables', unknown>>,
): PandocParameters {
  const metadata = migratePandocParameterList(parameters.metadata);
  const variables = migratePandocParameterList(parameters.variables);
  return {
    ...(metadata !== undefined && { metadata }),
    ...(variables !== undefined && { variables }),
  };
}

export function mergePandocParameters(
  base: PandocParameter[] | undefined,
  override: PandocParameter[] | undefined,
): PandocParameter[] | undefined {
  if (!base && !override) return undefined;
  const merged = [...(base || [])];
  for (const parameter of override || []) {
    const index = merged.findIndex(({ name }) => name === parameter.name);
    if (index >= 0) merged[index] = parameter;
    else merged.push(parameter);
  }
  return merged;
}

function filterOrWriterName(
  fow: string | PandocFilter | PandocCustomWriter,
): string {
  return isString(fow) ? fow : fow.name;
}

export const pandocFilterName: (filter: string | PandocFilter) => string =
  filterOrWriterName;
export const pandocCustomWriterName: (
  writer: string | PandocCustomWriter,
) => string = filterOrWriterName;

function paramsToOptions(option: 'M' | 'V', params?: PandocParameter[]) {
  let opts: string[] = [];
  for (const { name, value } of params || []) {
    if (value === undefined || (isBoolean(value) && !value)) continue;
    opts.push(`-${option}`);
    if (isBoolean(value)) opts.push(name);
    else if (isString(value)) opts.push(`${name}=${JSON.stringify(value)}`);
  }
  return opts;
}

export const pandocParametersToCliOptions: (
  params: PandocParameters,
) => string[] = (params) =>
  ([] as string[])
    .concat(paramsToOptions('M', params?.metadata))
    .concat(paramsToOptions('V', params?.variables));

/**
 * Compute the pandoc command line options for a filter.
 * @param filter The pandoc filter.
 * @param filterPath Optional complete filter path (path + filename).
 * @returns
 */
export function pandocFilterToCliOptions(
  filter: string | PandocFilter,
  filterPath?: string,
  quotePath = true,
): string[] {
  const opts: string[] = isString(filter)
    ? []
    : pandocParametersToCliOptions(migratePandocParameters(filter));
  const filepath = filterPath || pandocFilterName(filter);
  const cliPath = quotePath ? JSON.stringify(filepath) : filepath;
  opts.push(
    `${filepath.endsWith('.lua') ? '--lua-filter' : '--filter'}=${cliPath}`,
  );
  return opts;
}

/**
 * Compute the pandoc command line options for a custom writer.
 * @param writer The pandoc custom writer.
 * @param writerPath Optional complete writer path (path + filename).
 * @returns
 */
export function pandocCustomWriterToCliOptions(
  writer: string | PandocCustomWriter,
  writerPath?: string,
): string[] {
  const opts: string[] = isString(writer)
    ? []
    : pandocParametersToCliOptions(migratePandocParameters(writer));
  opts.push('-t');
  opts.push(JSON.stringify(writerPath || pandocCustomWriterName(writer)));
  return opts;
}
