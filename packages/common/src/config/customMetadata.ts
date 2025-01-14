export type MetaValueName =
  | 'MetaBool'
  | 'MetaString'
  | 'MetaInlines'
  | 'MetaBlocks'
  | 'MetaList'
  | 'MetaMap'

export interface CustomMetadata {
  type: MetaValueName;
  name: string,
  description?: string,
  default?: any;
}