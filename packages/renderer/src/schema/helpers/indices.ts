import { Node as PmNode } from '@tiptap/pm/model';
import {
  DEFAULT_INDEX_NAME,
  DEFAULT_INDEX_REF_CLASS,
  DEFAULT_PUT_INDEX_REF,
  Index,
  INDEX_CLASS,
  INDEX_COLORS_PALETTE,
  INDEX_NAME_ATTR,
  INDEX_PUT_INDEX_REF_ATTR,
  INDEX_REF_CLASS_ATTR,
  NODE_NAME_DIV,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_INDEX_TERM
} from '../../common';

/**
 * Merges indices definitions from the document and from the configuration
 * @param configIndices the indices defined in the configuration
 * @param docIndices the indices defined in the document
 * @returns the two sets of indices merged, with the document indices properties taking precedence in case of homonymy
 */
export function mergeIndices(
  configIndices?: Index[],
  docIndices?: Index[],
): Index[] {
  const merged: Index[] = [];
  (docIndices || []).forEach(index => {
    merged.push(index)
  })
  if (!configIndices) return merged;
  configIndices.forEach(index => {
    const foundIndex = merged.findIndex(i => i.indexName === index.indexName)
    if (foundIndex >= 0) {
      const found: Record<string, any> = merged[foundIndex]
      for (const k in index) {
        if (!found.hasOwnProperty(k)) {
          if (index.hasOwnProperty(k)) {
            found[k] = (index as Record<string, any>)[k]
          }
        }
      }
    } else {
      merged.push(index)
    }
  })
  let colorIndex = 0;
  return merged.map(index => index.color ? index : { ...index, color: INDEX_COLORS_PALETTE[colorIndex++ % INDEX_COLORS_PALETTE.length] })
}

/**
 * Scans a Prosemirror document for indices' definitions
 * @param doc
 * @returns
 */
export function documentIndices(doc: PmNode): Index[] {
  const indices: Index[] = [];
  doc.descendants((node) => {
    const typeName = node.type.name
    if (
      typeName === NODE_NAME_INDEX_DIV
      || (typeName === NODE_NAME_DIV && node.attrs?.classes.indexOf(INDEX_CLASS) >= 0)
    ) {
      const kv = node.attrs.kv
      const indexName = kv[INDEX_NAME_ATTR] || DEFAULT_INDEX_NAME
      if (indices.find(i => i.indexName === indexName))
        return false
      const refClass = kv[INDEX_REF_CLASS_ATTR] || DEFAULT_INDEX_REF_CLASS
      const putIndexRef = kv[INDEX_PUT_INDEX_REF_ATTR] || DEFAULT_PUT_INDEX_REF
      const newIndex: Index = { indexName, refClass };
      if (putIndexRef) newIndex.putIndexRef = putIndexRef;
      indices.push(newIndex);
    }
    return true;
  });
  return indices;
}

function indexTerms(indexDiv: PmNode): PmNode[] {
  const terms: PmNode[] = []
  if (indexDiv)
    indexDiv.descendants((node) => {
      if (node.type.name === NODE_NAME_INDEX_TERM) {
        terms.push(node)
      }
    })
  return terms
}

export function termsOfDocumentIndex(doc: PmNode, indexName: string): PmNode[] {
  const terms: PmNode[] = []
  if (doc)
    doc.descendants((node) => {
      if (node.type.name === NODE_NAME_INDEX_DIV && node.attrs.kv[INDEX_NAME_ATTR] === indexName) {
        indexTerms(node).forEach(term => { terms.push(term) })
      }
    })
  return terms
}