import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Extension } from '@tiptap/core';
import { changedNodes } from '../helpers/whatChanged';
import type { NodeWithPos } from '@tiptap/vue-3';
import {
  DEFAULT_INDEX_REF_CLASS,
  DEFAULT_PUT_INDEX_REF,
  Index,
  IndexRefPlacement,
  indexRefDecorationCss,
} from '../../common';
import { DEFAULT_INDEX_NAME } from '../../common';
import { documentIndices, mergeIndices } from '../helpers/indices';
import {
  DocStateUpdate,
  META_UPDATE_DOC_STATE,
} from './PandocEditorUtilsExtension';

const INDEXING_PLUGIN = 'indexing-plugin';

export const INDEXING_DECORATION_PREFIX = 'indexing';
const META_REDECORATE_INDEX_REFS = 'redecorate-index-refs';
const META_DETECT_DOCUMENT_INDICES = 'detect-document-indices';

export interface IndexingOptions {}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indexing: {
      addIndexRef: (index: Index) => ReturnType;
      redecorateIndexRefs: () => ReturnType;
      detectDocumentIndices: () => ReturnType;
    };
  }
}

export function isIndexRef(node: PmNode): boolean {
  return node.type.name === 'indexRef' && node.attrs.kv['index-name'];
}

function indexRefToDecoration(
  state: EditorState,
  ref: NodeWithPos,
  indices: Index[],
): Decoration | undefined {
  const { node, pos } = ref;
  const kv = node.attrs.kv;
  const indexedText = kv['indexed-text'];
  if (indexedText) {
    const width = indexedText.length;
    const index = indices.find((i) => i.indexName === kv['index-name']);
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
        type: `${INDEXING_DECORATION_PREFIX}-${kv['index-name']}`,
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
            };
          },
          apply(tr, pluginState, oldState, newState): IndexingPluginState {
            const doc: PmNode = tr.doc;
            let { decorationSet, indices, docIndices } = pluginState;
            if (
              indices === undefined ||
              tr.getMeta(META_DETECT_DOCUMENT_INDICES)
            ) {
              docIndices = documentIndices(doc);
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
            if (tr.getMeta(META_REDECORATE_INDEX_REFS)) {
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
            return {
              decorationSet: updatedDecos,
              indices,
              docIndices,
            };
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      addIndexRef:
        (index: Index) =>
        ({ tr, state, dispatch }) => {
          const indexRefType = state.schema.nodes.indexRef;
          if (!indexRefType) return false;
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
                  kv: { 'index-name': indexName },
                },
                null,
                marks,
              );
              tr.insert(from, indexRef);
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
                    'index-name': indexName,
                    'indexed-text': indexedText,
                  },
                },
                null,
                marks,
              );
              const where: IndexRefPlacement =
                index.putIndexRef || DEFAULT_PUT_INDEX_REF;
              tr.insert(where === 'before' ? from : to, indexRef);
            }
          }
          return true;
        },
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
    };
  },
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
