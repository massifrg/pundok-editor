export type MetaValueName =
  | 'MetaBool'
  | 'MetaString'
  | 'MetaInlines'
  | 'MetaBlocks'
  | 'MetaList'
  | 'MetaMap'

/**
 * A custom metadata field in the Metadata of a Pandoc document.
 */
export interface CustomMetadata {
  type: MetaValueName;
  name: string,
  description?: string,
  default?: any;
}