import { CitationMode, Cite as PandocCite, Inline } from '../../pandoc';
import { EditorState } from '@tiptap/pm/state';
import { Plain } from '../nodes';
import { nodeContentToPandocInlines } from './PandocJsonExporter';

// export interface PMCitation {
//   citationId: string;
//   citationPrefix: Node | null;
//   citationSuffix: Node | null;
//   citationMode: string;
//   citationNoteNum: number;
//   citationHash: number;
// }

// export function getCitationAttrs(c: any) {
//   return {
//     citationId: c.citationId,
//     citationPrefix: parseJsonFragmentToPMJson(c.citationPrefix)?.textContent,
//     citationSuffix: parseJsonFragmentToPMJson(c.citationSuffix)?.textContent,
//     citationMode: c.citationMode.t,
//   };
// }

// export function pandocCitationsToPMAttrs(cc: PMCitation[]): PundokCitation[] {
//   const citations = cc.map((c) => getCitationAttrs(c));
//   return { citations };
// }

interface Affix {
  from: number;
  to: number;
  text: string;
}

export interface PundokCitation {
  citationId: string;
  prefix?: Affix;
  citationPrefix: Inline[];
  suffix?: Affix;
  citationSuffix: Inline[];
  citationMode: CitationMode;
  citationNoteNum: number;
}

export function textToCitations(text: string, state: EditorState, pos: number, noteNum: number = 0) {
  const citations: PundokCitation[] = []
  const matching = text.match(/^(@([\p{L}0-9]+))?(\s*)(\[(.*?)\])?$/u)
  if (matching) {
    const author = matching[2]
    if (author) citations.push({
      citationId: author,
      citationMode: 'AuthorInText',
      citationPrefix: [],
      citationSuffix: [],
      citationNoteNum: noteNum,
    })
    const inbrackets = matching[5]
    if (inbrackets) {
      let offset = text.indexOf('[') + 1
      let chunk: string
      while (offset < text.length - 1) {
        let stop = text.indexOf(';', offset)
        stop = stop < 0 ? text.length - 1 : stop
        chunk = text.substring(offset, stop)
        const matching = chunk.match(/^(.*?)(-?@)([\p{L}0-9]+)(.*?)$/u)
        if (matching) {
          let prefix: Affix | undefined = undefined
          let suffix: Affix | undefined = undefined
          const prefixText = matching[1].trim()
          if (prefixText.length > 0) {
            const from = offset
            const to = from + prefixText.length
            prefix = { from, to, text: prefixText }
          }
          const suffixText = matching[4]
          if (suffixText.length > 0) {
            const from = offset + chunk.length - suffixText.length
            const to = stop
            suffix = { from, to, text: suffixText }
          }
          citations.push({
            citationId: matching[3],
            prefix: prefix,
            citationPrefix: affixToInlines(state, pos, prefix),
            suffix: suffix,
            citationSuffix: affixToInlines(state, pos, suffix),
            citationMode: matching[2] === '-@' ? 'SuppressAuthor' : 'NormalCitation',
            citationNoteNum: noteNum,
          })
        }
        offset = stop + 1
        while (text.charAt(offset) === ' ') offset++
      }
      if (author && citations.length === 1) {
        const suffix = {
          from: text.indexOf('[') + 1,
          to: text.length - 1,
          text: inbrackets
        }
        citations[0].suffix = suffix
        citations[0].citationSuffix = affixToInlines(state, pos, suffix)
      }
    }
  }
  // if (citations) console.log(JSON.stringify(citations))
  return citations
}

function affixToInlines(state: EditorState, pos: number, affix?: Affix): Inline[] {
  if (!state || !affix) return []
  let { from, to } = affix
  from += pos
  to += pos
  if (from < to) {
    const plainType = state.schema.nodes[Plain.name]
    if (plainType) {
      const plain = plainType.create(null, state.doc.slice(from, to).content)
      // console.log(affix.text)
      // console.log(plain.textContent)
      if (plain) {
        let inlines = nodeContentToPandocInlines(plain)
        if (inlines.length === 1 && (inlines[0] as PandocCite).name === 'Cite')
          inlines = (inlines[0] as PandocCite).content
        return inlines
      }
    }
  }
  return []
}