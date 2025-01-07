import { Node as PmNode } from '@tiptap/pm/model';
import { Index, NODE_NAME_DIV } from '../../common';

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
  if (!configIndices) return [];
  const indicesDict: Record<string, number[]> = {};
  if (!docIndices) return configIndices;
  docIndices.forEach((ndx, i) => {
    indicesDict[ndx.indexName] = [i, -1];
  });
  configIndices.forEach((ndx, i) => {
    const name = ndx.indexName;
    if (indicesDict[name]) {
      indicesDict[name][1] = i;
    } else {
      indicesDict[name] = [-1, i];
    }
  });
  return Object.values(indicesDict).map(([di, ci]) => {
    if (di < 0) return configIndices[ci];
    else if (ci < 0) return docIndices[di];
    else return { ...configIndices[ci], ...docIndices[di] };
  });
}

/**
 * Scans a Prosemirror document for indices' definitions
 * @param doc
 * @returns
 */
export function documentIndices(doc: PmNode): Index[] {
  const indices: Index[] = [];
  doc.descendants((node) => {
    if (node.type.name === NODE_NAME_DIV) {
      const { indexName, refClass, putIndexRef } = node.attrs;
      if (indexName) {
        const newIndex: Index = { indexName, refClass };
        if (putIndexRef) newIndex.putIndexRef = putIndexRef;
        indices.push(newIndex);
      }
    }
    return true;
  });
  return indices;
}
