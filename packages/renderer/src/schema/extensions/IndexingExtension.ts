import { Command, EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Extension } from '@tiptap/core';
import { changedNodes, DocState } from '../helpers';
import type { NodeWithPos } from '@tiptap/vue-3';
import {
  DEFAULT_INDEX_REF_CLASS,
  DEFAULT_PUT_INDEX_REF,
  INDEXED_TEXT_ATTR,
  INDEX_NAME_ATTR,
  Index,
  IndexRefPlacement,
  IndexTermQuery,
  NODE_NAME_INDEX_DIV,
  NODE_NAME_INDEX_REF,
  NODE_NAME_INDEX_TERM,
  SK,
  indexRefDecorationCss,
} from '../../common';
import { DEFAULT_INDEX_NAME } from '../../common';
import { documentIndices, mergeIndices } from '../helpers/indices';
import {
  DocStateUpdate,
  getDocState,
  innerNodeDepth,
  META_UPDATE_DOC_STATE
} from '../helpers';
import { isString } from 'lodash-es';
import { Backend } from '../../backend';
import { useBackend } from '../../stores';

const INDEXING_PLUGIN = 'indexing-plugin';
export type SearchTextVariant =
  | 'first-3-words'
  | 'first-2-words'

export const INDEXING_DECORATION_PREFIX = 'indexing';
const META_REDECORATE_INDEX_REFS = 'redecorate-index-refs';
const META_DETECT_DOCUMENT_INDICES = 'detect-document-indices';
const META_SET_LAST_REFERENCED_INDEX = 'set-last-referenced-index';

export interface IndexingOptions { }

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexing: {
      addIndexRef: (index?: Index | string) => ReturnType;
      redecorateIndexRefs: () => ReturnType;
      detectDocumentIndices: () => ReturnType;
      setIndexTermAutoId: (stv?: SearchTextVariant) => ReturnType;
      setIndexTermsAutoIds: (stv?: SearchTextVariant, force?: boolean) => ReturnType;
    };
  }
}

export function isIndexRef(node: PmNode): boolean {
  return node.type.name === NODE_NAME_INDEX_REF && node.attrs.kv[INDEX_NAME_ATTR];
}

function indexRefToDecoration(
  state: EditorState,
  ref: NodeWithPos,
  indices: Index[],
): Decoration | undefined {
  const { node, pos } = ref;
  const kv = node.attrs.kv;
  const indexedText = kv[INDEXED_TEXT_ATTR];
  if (indexedText) {
    const width = indexedText.length;
    const index = indices.find((i) => i.indexName === kv[INDEX_NAME_ATTR]);
    const where: IndexRefPlacement =
      index?.putIndexRef || DEFAULT_PUT_INDEX_REF;
    const dir = where === 'before' ? 1 : -1;
    let from: number, to: number;
    const $pos = state.doc.resolve(pos);
    const container = $pos.node();
    const start = $pos.start();
    const textpos: number[] = [];
    const textlen: number[] = [];
    let p = 0;
    for (let i = 0; i < container.childCount; i++) {
      const child = container.child(i);
      if (child.isText) {
        textpos.push(start + p);
        textlen.push(child.textContent.length);
      }
      p += child.nodeSize;
    }
    let w = 0;
    const firstIndex = dir > 0 ? 0 : textpos.length - 1;
    for (let i = firstIndex; i >= 0 && i < textpos.length; i += dir) {
      const len = textlen[i];
      if (dir > 0 && textpos[i] > pos) {
        if (w + len >= width) {
          from = pos + 1;
          to = textpos[i] + width - w;
          break;
        } else {
          w += len;
        }
      } else if (dir < 0 && textpos[i] < pos) {
        if (w + len >= width) {
          to = pos;
          from = textpos[i] + len - (width - w);
        } else {
          w += len;
        }
      }
    }

    const classAttr = index?.refClass || '';
    return Decoration.inline(
      from!,
      to!,
      {
        nodeName: 'span',
        class: classAttr,
        style: indexRefDecorationCss(index),
      },
      {
        type: `${INDEXING_DECORATION_PREFIX}-${kv[INDEX_NAME_ATTR]}`,
        indexNode: node,
      },
    );
  }
  return undefined;
}

function indexRefsToDecorations(
  state: EditorState,
  refs: NodeWithPos[],
  indices: Index[],
): Decoration[] {
  return refs
    .map((r) => indexRefToDecoration(state, r, indices))
    .filter((r) => r !== undefined) as Decoration[];
}

interface IndexingPluginState {
  decorationSet: DecorationSet;
  indices: Index[] | undefined;
  docIndices: Index[] | undefined;
  lastReferenced: Index | undefined;
}

const indexingPluginKey = new PluginKey(INDEXING_PLUGIN);

export function getIndexingState(
  state?: EditorState,
): IndexingPluginState | undefined {
  return state ? indexingPluginKey.getState(state) : undefined;
}

export const IndexingExtension = Extension.create<IndexingOptions>({
  name: 'indexing',

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: indexingPluginKey,
        props: {
          decorations(state) {
            return this.getState(state).decorationSet;
          },
        },
        state: {
          init(config, state): IndexingPluginState {
            return {
              decorationSet: DecorationSet.empty,
              indices: undefined,
              docIndices: undefined,
              lastReferenced: undefined,
            };
          },
          apply(tr, pluginState, oldState, newState): IndexingPluginState {
            const doc: PmNode = tr.doc;
            let redecorate = false
            let { decorationSet, indices, docIndices, lastReferenced } = pluginState;
            if (indices === undefined || tr.getMeta(META_DETECT_DOCUMENT_INDICES)) {
              const docIndicesCount = docIndices ? docIndices.length : 0
              docIndices = documentIndices(doc);
              redecorate = docIndices.length !== docIndicesCount
            }
            const docStateUpdate: DocStateUpdate = tr.getMeta(
              META_UPDATE_DOC_STATE,
            );
            if (docStateUpdate) {
              const updatedIndices =
                docStateUpdate?.configuration?.indices ||
                docStateUpdate?.project?.computedConfig?.indices;
              if (updatedIndices !== undefined) {
                indices = updatedIndices;
              }
            }
            let updatedDecos: DecorationSet = decorationSet;
            redecorate = redecorate || tr.getMeta(META_REDECORATE_INDEX_REFS)
            if (redecorate) {
              updatedDecos = updatedDecos.remove(
                updatedDecos.find(
                  undefined,
                  undefined,
                  (spec) =>
                    spec.type &&
                    spec.type.startsWith(INDEXING_DECORATION_PREFIX),
                ),
              );
              const indexDecos = indexRefsToDecorations(
                newState,
                changedNodes(oldState.doc, newState.doc, isIndexRef).after,
                mergeIndices(indices, docIndices),
              );
              return {
                decorationSet: updatedDecos
                  .map(tr.mapping, doc)
                  .add(doc, indexDecos),
                indices,
                docIndices,
                lastReferenced,
              };
            }

            if (tr.docChanged) {
              const mapping = tr.mapping;
              const { added, deleted } = changedNodes(
                oldState.doc,
                newState.doc,
                isIndexRef,
              );

              // delete decorations for deleted index refs
              const decosToRemove = updatedDecos.find(
                undefined,
                undefined,
                (spec) => !!deleted.find((d) => spec.indexNode === d.node),
              );
              if (decosToRemove)
                updatedDecos = updatedDecos.remove(decosToRemove);

              // add decorations for added index refs
              const newDecos = indexRefsToDecorations(
                newState,
                added,
                mergeIndices(indices, docIndices),
              );
              updatedDecos = updatedDecos.map(mapping, doc).add(doc, newDecos);
            }

            // set last referenced index (defaults to the first index)
            lastReferenced = tr.getMeta(META_SET_LAST_REFERENCED_INDEX) || lastReferenced
            if (!lastReferenced && indices && indices.length > 0)
              lastReferenced = indices[0]

            return {
              decorationSet: updatedDecos,
              indices,
              docIndices,
              lastReferenced
            };
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      addIndexRef:
        (optIndex?: Index | string) =>
          ({ state, dispatch }) => setIndexRefCommand(optIndex)(state, dispatch),
      redecorateIndexRefs:
        () =>
          ({ tr, dispatch }) => {
            if (dispatch) {
              tr.setMeta(META_REDECORATE_INDEX_REFS, true);
            }
            return true;
          },
      detectDocumentIndices:
        () =>
          ({ tr, dispatch }) => {
            if (dispatch) {
              tr.setMeta(META_DETECT_DOCUMENT_INDICES, true);
            }
            return true;
          },
      setIndexTermAutoId: (stv) => ({ dispatch, editor, state }) => {
        const backend = useBackend().backend
        if (!backend) return false
        if (!innerNodeDepth(state.selection.$anchor, n => n.type.name === NODE_NAME_INDEX_TERM))
          return false;
        if (dispatch) {
          (async () => {
            const command = await indexTermIdAutoSetCommand(state, backend, stv || 'first-2-words')
            const { state: maybeUpdatedState, view } = editor
            command(maybeUpdatedState, view.dispatch, view)
          })()
        }
        return true
      },
      setIndexTermsAutoIds: (stv, force) => ({ dispatch, state, view }) => {
        const backend = useBackend().backend
        if (!backend) return false
        const $anchor = state.selection.$anchor
        const indexDivDepth = innerNodeDepth($anchor, n => n.type.name === NODE_NAME_INDEX_DIV)
        if (!indexDivDepth)
          return false;
        if (dispatch) {
          const terms_pos: number[] = [];
          const indexDivStart = $anchor.start(indexDivDepth)
          const indexDiv = $anchor.node(indexDivDepth)
          const indexName = indexDiv.attrs.kv[INDEX_NAME_ATTR]
          indexDiv.descendants((node, pos) => {
            if (node.type.name === NODE_NAME_INDEX_TERM)
              terms_pos.push(indexDivStart + pos)
            return true
          });
          terms_pos.sort((p1, p2) => p2 - p1)
          const docState = getDocState(state)
          const doc = state.doc;
          Promise.all(
            terms_pos.map((pos) => indexTermIdAtPos(
              doc,
              pos,
              indexName,
              docState!,
              backend!,
              stv || 'first-2-words',
              force
            )))
            .then(pos_ids => pos_ids.filter(pi => !!pi.id))
            .then(pos_ids => {
              const state = view.state
              const tr = state.tr
              if (pos_ids.length > 0) {
                pos_ids.forEach(({ pos, id }) => {
                  const n = tr.doc.nodeAt(pos)
                  if (n && n.type.name === NODE_NAME_INDEX_TERM) {
                    tr.setNodeMarkup(pos, null, { ...n.attrs, id })
                  }
                })
                view.dispatch(tr)
              }
            })
            .catch(err => {
              console.log(err)
            })
        }
        return true
      }
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.SET_INDEX_REF]: () => this.editor.commands.addIndexRef()
    }
  }
});

function indexedTextWithoutAtoms(
  doc: PmNode,
  from: number,
  to: number,
): string | null {
  const $from = doc.resolve(from);
  const d = $from.sharedDepth(to);
  if ($from.depth !== d) return null;
  const container = $from.node();
  if (!container) return null;
  let tfrom = $from.start();
  const texts: string[] = [];
  for (let i = 0; i < container.childCount; i++) {
    const child = container.child(i);
    if (child && child.isText) {
      const tto = tfrom + child.nodeSize;
      if (tto > from && tfrom <= to) {
        const text = child.textContent;
        texts.push(
          text.substring(
            Math.max(0, from - tfrom),
            Math.min(text.length, to - tfrom),
          ),
        );
      }
      if (tfrom > to) break;
    }
    tfrom += child.nodeSize;
  }
  return texts.join('');
}

export function setIndexRefCommand(optIndex?: Index | string): Command {
  return (state, dispatch, view) => {
    const indexRefType = state.schema.nodes[NODE_NAME_INDEX_REF];
    if (!indexRefType) return false;
    const docState = getDocState(state)
    const indices: Index[] = docState?.project?.computedConfig?.indices || docState?.configuration?.indices || []
    const index = isString(optIndex)
      ? indices?.find(i => i.indexName === optIndex)
      : optIndex || indexingPluginKey.getState(state).lastReferenced
    if (!index) return false
    const indexName = index.indexName || DEFAULT_INDEX_NAME;
    const { from, to, empty } = state.selection;
    const marks = state.doc.resolve(from).marks();
    if (empty) {
      if (!index.onlyEmpty === true) return false;
      if (dispatch) {
        const refClass = index.refClass || DEFAULT_INDEX_REF_CLASS;
        const indexRef = indexRefType.create(
          {
            classes: [refClass],
            kv: { [INDEX_NAME_ATTR]: indexName },
          },
          null,
          marks,
        );
        dispatch(state.tr
          .insert(from, indexRef)
          .setMeta(META_SET_LAST_REFERENCED_INDEX, index)
        )
      }
    } else {
      if (index.onlyEmpty === true) return false;
      const indexedText = indexedTextWithoutAtoms(state.doc, from, to);
      if (!indexedText) return false;
      if (dispatch) {
        const refClass = index.refClass || DEFAULT_INDEX_REF_CLASS;
        const indexRef = indexRefType.create(
          {
            classes: [refClass],
            kv: {
              [INDEX_NAME_ATTR]: indexName,
              [INDEXED_TEXT_ATTR]: indexedText,
            },
          },
          null,
          marks,
        );
        const where: IndexRefPlacement =
          index.putIndexRef || DEFAULT_PUT_INDEX_REF;
        dispatch(state.tr
          .insert(where === 'before' ? from : to, indexRef)
          .setMeta(META_SET_LAST_REFERENCED_INDEX, index)
        )
      }
    }
    return true;
  }
}

// export async function indexTermsIdAutoAssignFromJsonTransaction(
//   state: EditorState,
//   pos: number,
//   backend: Backend,
//   searchTextVariant: 'first-2-words' | 'first-3-words',
//   callback: (terms: number, withoutId: number, autoId: number) => void,
// ): Promise<Transaction> {
//   const indexDiv = state.doc.nodeAt(pos)
//   if (indexDiv?.type.name !== NODE_NAME_INDEX_DIV)
//     return Promise.reject('not an index node')
//   const wordsCount = searchTextVariant === 'first-2-words'
//     ? 2
//     : searchTextVariant === 'first-3-words'
//       ? 3
//       : 2
//   const docState = getDocState(state)
//   let query: IndexTermQuery = {
//     type: 'index-term',
//     indexName: indexDiv?.attrs?.kv[INDEX_NAME_ATTR] || DEFAULT_INDEX_NAME,
//     searchText: '',
//     options: {
//       kind: 'index',
//       project: docState?.project,
//       configurationName: docState?.configuration?.name,
//     }
//   }
//   // check with dummy search
//   try {
//     await backend?.queryDatabase({ ...query, searchText: 'dummy' })
//   } catch (err) {
//     return Promise.reject(err)
//   }
//   const tr = state.tr
//   let p = pos + 1
//   let withoutIdCount = 0
//   let termsCount = 0
//   let autoAssignedCount = 0
//   for (let i = 0; i < indexDiv.childCount; i++) {
//     const child = indexDiv.child(i)
//     if (child) {
//       if (child.type.name === NODE_NAME_INDEX_TERM) {
//         termsCount++
//         if (!child.attrs.id) {
//           withoutIdCount++
//           const content = child.textContent || ''
//           const searchText = content
//             .split(/\P{Letter}+/u)
//             .filter(t => t.length > 0)
//             .slice(0, wordsCount)
//             .join(' ')
//           try {
//             const results = await backend?.queryDatabase({ ...query, searchText })
//             if (results.length === 1) {
//               const id = results[0].id
//               tr.setNodeMarkup(p, null, { ...child.attrs, id })
//               autoAssignedCount++
//             }
//           } catch (err) {
//             return Promise.reject(err)
//           }
//         }
//         callback(termsCount, withoutIdCount, autoAssignedCount)
//       }
//       p = p + child.nodeSize
//     } else
//       break
//   }
//   return tr
// }

function getIndexTermInSelection(state: EditorState): NodeWithPos | undefined {
  const $pos = state.selection.$anchor
  const indexDepth = innerNodeDepth($pos, n => n.type.name === NODE_NAME_INDEX_DIV)
  const termDepth = innerNodeDepth($pos, n => n.type.name === NODE_NAME_INDEX_TERM)
  if (!indexDepth || !termDepth || termDepth < indexDepth)
    return undefined
  return {
    node: $pos.node(termDepth),
    pos: $pos.start(termDepth) - 1
  }
}

export async function indexTermIdAutoSetCommand(
  state: EditorState,
  backend: Backend,
  searchTextVariant: 'first-2-words' | 'first-3-words',
): Promise<Command> {
  const $pos = state.selection.$anchor
  const indexDepth = innerNodeDepth($pos, n => n.type.name === NODE_NAME_INDEX_DIV)
  const termDepth = innerNodeDepth($pos, n => n.type.name === NODE_NAME_INDEX_TERM)
  if (!indexDepth || !termDepth || termDepth < indexDepth)
    return () => false
  const indexDiv = $pos.node(indexDepth)
  const { node: indexTerm, pos: indexTermPos } = getIndexTermInSelection(state) || {}
  if (!indexTerm) return () => false
  const wordsCount = searchTextVariant === 'first-2-words'
    ? 2
    : searchTextVariant === 'first-3-words'
      ? 3
      : 2
  const docState = getDocState(state)
  const content = indexTerm.textContent || ''
  const searchText = content
    .split(/\P{Letter}+/u)
    .filter(t => t.length > 0)
    .slice(0, wordsCount)
  const indexName = indexDiv.attrs?.kv[INDEX_NAME_ATTR] || DEFAULT_INDEX_NAME
  const query: IndexTermQuery = {
    type: 'index-term',
    indexName,
    searchText,
    options: {
      kind: 'index',
      project: docState?.project,
      configurationName: docState?.configuration?.name,
    }
  }
  try {
    const results = await backend?.queryDatabase({ ...query, searchText })
    if (results.length === 1) {
      const id = results[0].id
      return (state, dispatch, view) => {
        const { node, pos } = getIndexTermInSelection(state) || {}
        if (node === indexTerm && pos === indexTermPos && content === node!.textContent) {
          if (dispatch)
            dispatch(state.tr.setNodeMarkup(pos!, null, { ...node!.attrs, id }))
          return true
        }
        return false
      }
    }
    return () => false
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function indexTermIdAtPos(
  doc: PmNode,
  pos: number,
  indexName: string,
  docState: DocState,
  backend: Backend,
  searchTextVariant: 'first-2-words' | 'first-3-words',
  force?: boolean,
): Promise<{ pos: number, id?: string }> {
  const id_not_found = { pos, id: undefined }
  const indexTerm = doc.nodeAt(pos)
  if (!indexTerm || indexTerm.type.name !== NODE_NAME_INDEX_TERM)
    return id_not_found
  const currentId = indexTerm.attrs.id
  // if the id is already set, proceed only when `force === true`
  if (currentId && currentId.length > 0 && !force)
    return id_not_found
  const wordsCount = searchTextVariant === 'first-2-words'
    ? 2
    : searchTextVariant === 'first-3-words'
      ? 3
      : 2
  const content = indexTerm.textContent || ''
  const searchText = content
    .split(/\P{Letter}+/u)
    .filter(t => t.length > 0)
    .slice(0, wordsCount)
  const query: IndexTermQuery = {
    type: 'index-term',
    indexName,
    searchText,
    options: {
      kind: 'index',
      project: docState?.project,
      configurationName: docState?.configuration?.name,
    }
  }
  try {
    const results = await backend?.queryDatabase({ ...query, searchText })
    if (results.length === 1) {
      const id = results[0].id
      // console.log(`id of index term "${indexTerm.textContent}" is "${id}"`)
      return { pos, id }
    }
  } catch (err) {
    console.log(err)
    return Promise.resolve(id_not_found)
  }
  return id_not_found
}

export function getAllIndices(state?: EditorState): Index[] {
  if (state) {
    const indexingState = getIndexingState(state)
    if (indexingState)
      return mergeIndices(indexingState.indices, indexingState.docIndices)
  }
  return []
}