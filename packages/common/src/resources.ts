import { PundokEditorProject } from './config';

/**
 * The types of resources needed to represent and convert a document.
 * They are usually external files, like CSS stylesheets, pandoc filters,
 * template or reference documents, indices, custom readers or writers, etc.
 */
export type ResourceType =
  | 'document'
  | 'css'
  | 'filter'
  | 'reader'
  | 'writer'
  | 'template'
  | 'referenceDoc'
  | 'script'
  | 'index'
  | 'other';

/**
 * Usually external resources are grouped in subdirectories, e.g. CSS
 * stylesheets under a "css" or "styles" subdir, lua filters under "lua", etc.
 */
export const RESOURCE_SUBPATHS: Record<ResourceType, string[]> = {
  document: ['templates'],
  css: ['styles', 'css'],
  filter: ['filters', 'lua'],
  reader: ['readers', 'lua'],
  writer: ['writers', 'lua'],
  template: ['templates'],
  referenceDoc: ['templates'],
  script: ['scripts'],
  index: ['indices'],
  other: ['other'],
};

/** structure used to find a resource for a document */
export interface FindResourceOptions {
  kind: ResourceType;
  project: PundokEditorProject | string;
  configurationName: string;
  // path: string;
  base64?: boolean;
  // configuration: PundokEditorConfig | string;
}

/**
 * Provide an array of possible resource types from the extension of a filename.
 * @param ext The extension of the filename.
 * @returns 
 */
export function resourceTypesFromExtension(ext: string): ResourceType[] {
  switch (ext) {
    case 'css':
      return ['css'];
    case 'lua':
      return ['filter', 'reader', 'writer'];
    case 'docx':
    case 'odt':
      return ['referenceDoc'];
    case 'txt':
      return ['other']
    default:
      return [];
  }
}
