import { PundokEditorProject } from './config';

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
