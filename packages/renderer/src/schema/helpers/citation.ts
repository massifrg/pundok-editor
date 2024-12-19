import { parseJsonFragmentToPMJson } from './PandocJsonParser';
import type { Node } from '@tiptap/pm/model';
import { CitationMode } from '../../pandoc';

export interface PMCitation {
  citationId: string;
  citationPrefix: Node | null;
  citationSuffix: Node | null;
  citationMode: string;
  citationNoteNum: number;
  citationHash: number;
}

export function getCitationAttrs(c: any) {
  return {
    citationId: c.citationId,
    citationPrefix: parseJsonFragmentToPMJson(c.citationPrefix)?.textContent,
    citationSuffix: parseJsonFragmentToPMJson(c.citationSuffix)?.textContent,
    citationMode: c.citationMode.t,
  };
}

export function pandocCitationsToPMAttrs(cc: PMCitation[]) {
  const citations = cc.map((c) => getCitationAttrs(c));
  return { citations };
}

export interface Citation {
  citationId: string;
  citationPrefix: string;
  citationSuffix: string;
  citationMode: CitationMode;
}

export function textToCitations(text: string) {
  const citations: Citation[] = []
  const matching = text.match(/^(@([\p{L}0-9]+))?(\s*)(\[(.*?)\])?$/u)
  if (matching) {
    const author = matching[2]
    if (author) citations.push({
      citationId: author,
      citationPrefix: "",
      citationSuffix: "",
      citationMode: 'AuthorInText'
    })
    const other = matching[5]
    if (other) {
      const chunks = other.split(/;\s*/)
      chunks.forEach(chunk => {
        console.log(chunk)
        const matching = chunk.match(/^(.*?)(-?@)([\p{L}0-9]+)(.*?)$/u)
        if (matching)
          citations.push({
            citationId: matching[3],
            citationPrefix: matching[1].trim(),
            citationSuffix: matching[4],
            citationMode: matching[2] === '-@' ? 'SuppressAuthor' : 'NormalCitation'
          })
      })
      if (author && citations.length === 1)
        citations[0].citationSuffix = other
    }
  }
  if (citations) console.log(JSON.stringify(citations))
  return citations
}