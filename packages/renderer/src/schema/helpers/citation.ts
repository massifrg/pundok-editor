import { parseJsonFragmentToPMJson } from './PandocJsonParser';
import type { Node } from '@tiptap/pm/model';

export const PANDOC_CITATION_MODES: string[] = [
  'AuthorInText',
  'SuppressAuthor',
  'NormalCitation',
];
export const PANDOC_DEFAULT_CITATION_MODE: string = PANDOC_CITATION_MODES[0];

export interface PMCitation {
  citationId: string;
  citationPrefix: Node | null;
  citationSuffix: Node | null;
  citationMode: string;
  citationNoteNum: number;
  citationHash: number;
}
export const pandocCitationAsPmAttrs = {
  citationId: { default: '' },
  citationPrefix: { default: [] },
  citationSuffix: { default: [] },
  citationMode: { default: PANDOC_DEFAULT_CITATION_MODE },
  citationNoteNum: { default: 0 },
  citationHash: { default: 0 },
};

export function getCitationAttrs(c: any) {
  return {
    citationId: c.citationId,
    citationPrefix: parseJsonFragmentToPMJson(c.citationPrefix),
    citationSuffix: parseJsonFragmentToPMJson(c.citationSuffix),
    citationMode: c.citationMode.t,
    citationNoteNum: c.citationNoteNum,
    citationHash: c.citationHash,
  };
}

export function pandocCitationsToPMAttrs(cc: PMCitation[]) {
  const citations = cc.map((c) => getCitationAttrs(c));
  return { citations };
}
