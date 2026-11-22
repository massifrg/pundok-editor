/**
 * A base type of objects that have a name and an optional description.
 */
export type NamedAndDescribed = {
  /** The name of this object. */
  name: string,
  /** An optional description of this object. */
  description?: string,
}

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}