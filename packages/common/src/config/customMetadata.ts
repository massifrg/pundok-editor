import { NamedAndDescribed } from "./types";

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
export interface CustomMetadata extends NamedAndDescribed {
  type: MetaValueName;
  default?: any;
}