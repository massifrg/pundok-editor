import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Fragment, Node as ProsemirrorNode } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state';
import type { Command } from '@tiptap/pm/state';
import { asTiptapCommand } from '../helpers';
import { Component } from 'vue';
import { innerNodeDepth, templateNode } from '../helpers';
import MetaMapEntryView from '../../components/nodeviews/MetaMapEntryView.vue';
import {
  NODE_NAME_META_MAP,
  NODE_NAME_META_MAP_ENTRY,
  NODE_NAME_METADATA
} from '../../common';
import { isString } from 'lodash-es';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metaMapEntry: {
      appendMetaMapEntry: (
        text: string,
        metaTypeNameOrValue: string | ProsemirrorNode,
        pos?: number
      ) => ReturnType;
      setMetaMapEntryText: (text: string, pos?: number) => ReturnType;
      moveMetaMapEntryDown: (pos?: number) => ReturnType;
      moveMetaMapEntryUp: (pos?: number) => ReturnType;
    };
  }
}

export interface MetaMapEntryOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaMapEntry = Node.create<MetaMapEntryOptions>({
  name: NODE_NAME_META_MAP_ENTRY,
  content: 'meta',
  group: 'meta',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-map-entry',
      },
    };
  },

  addAttributes() {
    return {
      text: {
        default: null,
        renderHTML(attributes) {
          return {
            'data-meta': attributes.text,
          };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(MetaMapEntryView as Component);
  },

  addCommands() {
    return {
      appendMetaMapEntry: (text: string, metaTypeNameOrValue: string | ProsemirrorNode, pos?: number) =>
        asTiptapCommand(appendMetaMapEntryCommand(text, metaTypeNameOrValue, pos)),
      setMetaMapEntryText: (text: string, pos?: number) => asTiptapCommand(setMetaMapEntryTextCommand(text, pos)),
      moveMetaMapEntryDown: (pos?: number) => asTiptapCommand(moveMetaMapEntryDownCommand(pos)),
      moveMetaMapEntryUp: (pos?: number) => asTiptapCommand(moveMetaMapEntryUpCommand(pos)),
    };
  },
});

const appendMetaMapEntryCommand = (text: string, metaTypeNameOrValue: string | ProsemirrorNode, pos?: number): Command => (state, dispatch) => {
  const { doc, schema, selection } = state;
  const metavalue = isString(metaTypeNameOrValue) ? templateNode(schema, metaTypeNameOrValue) : { node: metaTypeNameOrValue, attrs: metaTypeNameOrValue.attrs };
  if (!metavalue) return false;
  const entryType = schema.nodes[NODE_NAME_META_MAP_ENTRY];
  if (!entryType) return false;
  const $pos = pos ? doc.resolve(pos) : selection.$from;
  const mapDepth = innerNodeDepth($pos, node => node.type.name === NODE_NAME_METADATA || node.type.name === NODE_NAME_META_MAP);
  let metamap = mapDepth ? $pos.node(mapDepth) : doc.firstChild;
  if (!metamap || (!mapDepth && metamap.type.name !== NODE_NAME_METADATA)) return false;
  const inspos = mapDepth ? $pos.start(mapDepth) + metamap.content.size : metamap.nodeSize - 1;
  if (dispatch) {
    const entry = entryType.create({ text }, metavalue.node);
    if (!entry) return false;
    const tr = state.tr;
    tr.insert(inspos, entry).setSelection(new TextSelection(tr.doc.resolve(inspos + 1)));
    dispatch(tr);
  }
  return true;
};

const setMetaMapEntryTextCommand = (text: string, pos?: number): Command => (state, dispatch) => {
  if (!text) return false;
  const mmPos = pos || state.selection.from;
  const node = state.doc.nodeAt(mmPos);
  if (!node || node.type.name !== NODE_NAME_META_MAP_ENTRY) return false;
  if (dispatch) dispatch(state.tr.setNodeAttribute(mmPos, 'text', text));
  return true;
};

const moveMetaMapEntryCommand = (direction: -1 | 1, pos?: number): Command => (state, dispatch) => {
  const p = pos || state.selection.from;
  const $pos = state.doc.resolve(p);
  if ($pos.parent.type.name !== NODE_NAME_METADATA) return false;
  const index = $pos.index();
  const otherIndex = index + direction;
  if (otherIndex < 0 || otherIndex >= $pos.parent.childCount) return false;
  const current = $pos.parent.child(index), other = $pos.parent.child(otherIndex);
  let offset = $pos.start($pos.depth);
  for (let i = 0; i < Math.min(index, otherIndex); i++) offset += $pos.parent.child(i).nodeSize;
  if (dispatch) {
    const ordered = direction > 0 ? [other, current] : [current, other];
    dispatch(state.tr.replaceWith(offset, offset + current.nodeSize + other.nodeSize, Fragment.from(ordered)));
  }
  return true;
};
const moveMetaMapEntryDownCommand = (pos?: number): Command => moveMetaMapEntryCommand(1, pos);
const moveMetaMapEntryUpCommand = (pos?: number): Command => moveMetaMapEntryCommand(-1, pos);
