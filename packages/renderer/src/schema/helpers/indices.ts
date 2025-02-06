import { Node as PmNode } from '@tiptap/pm/model';
import {
  DEFAULT_INDEX_NAME,
  DEFAULT_INDEX_REF_CLASS,
  DEFAULT_PUT_INDEX_REF,
  Index,
  INDEX_NAME_ATTR,
  INDEX_PUT_INDEX_REF_ATTR,
  INDEX_REF_CLASS_ATTR,
  NODE_NAME_DIV,
  NODE_NAME_INDEX_DIV
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
        if (!found.hasOwnProperty(k))
          found[k] = (index as Record<string, any>)[k]
      }
    } else {
      merged.push(index)
    }
  })
  return merged
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
    if (typeName === NODE_NAME_DIV || typeName === NODE_NAME_INDEX_DIV) {
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
