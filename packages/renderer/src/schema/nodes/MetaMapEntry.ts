import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Metadata } from './Metadata';
import { innerNodeDepth, templateNode } from '../helpers';
import { MetaMapEntryView } from '../../components';
import { MetaMap } from './MetaMap';
import { Component } from 'vue';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metaMapEntry: {
      appendMetaMapEntry: (
        text: string,
        metaTypeName: string,
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
  name: 'metaMapEntry',
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
    const self = this
    return {
      appendMetaMapEntry:
        (text: string, metaTypeName: string, pos?: number) =>
          ({ dispatch, state, tr }) => {
            const { doc, schema, selection } = state;
            const metavalue = templateNode(schema, metaTypeName);
            if (!metavalue) return false;
            const entryType = schema.nodes[self.name];
            if (!entryType) return false;
            const $pos = pos ? doc.resolve(pos) : selection.$from
            const mapDepth = innerNodeDepth($pos, node => {
              const ntn = node.type.name
              return ntn === Metadata.name || ntn === MetaMap.name
            })
            let metamap: ProsemirrorNode | null
            console.log(`appendMetaMapEntry, pos = ${JSON.stringify(pos)}`)
            let inspos: number
            if (mapDepth) {
              metamap = $pos.node(mapDepth)
              inspos = $pos.start(mapDepth) + metamap.content.size
              console.log(`appendMetaMapEntry, $pos.start(mapDepth) = ${$pos.start(mapDepth)}`)
            } else {
              metamap = doc.firstChild
              inspos = metamap!.nodeSize - 1
              if (metamap!.type.name !== Metadata.name)
                return false
            }
            console.log(`appendMetaMapEntry, found ${metamap?.type.name}, insertion pos: ${inspos}`)
            if (dispatch) {
              const entry = entryType.create({ text }, metavalue.node);
              if (!entry) return false;
              if (metamap) {
                dispatch(tr.insert(inspos, entry));
              } else {
                dispatch(
                  tr.insert(0, schema.nodes.metadata.create(null, entry))
                );
              }
            }
            return true;
          },
      setMetaMapEntryText:
        (text: string, pos?: number) =>
          ({ dispatch, state, tr }) => {
            if (!text) return false;
            const mmPos = pos || state.selection.from;
            const metamap = state.doc.nodeAt(mmPos);
            if (!metamap || !(metamap.type.name === this.name)) return false;
            if (dispatch) dispatch(tr.setNodeAttribute(mmPos, 'text', text));
            return true;
          },
      moveMetaMapEntryDown:
        (pos?: number) =>
          ({ commands, state }) => {
            const p = pos || state.selection.from;
            const metamap = state.doc.nodeAt(p);
            if (!metamap || !(metamap.type.name === this.name)) return false;
            const r = state.doc.resolve(p);
            if (r.parent.type.name !== Metadata.name) return false;
            return commands.moveChild('down', pos);
          },
      moveMetaMapEntryUp:
        (pos?: number) =>
          ({ commands, state }) => {
            const p = pos || state.selection.from;
            const metamap = state.doc.nodeAt(p);
            if (!metamap || !(metamap.type.name === this.name)) return false;
            const r = state.doc.resolve(p);
            if (r.parent.type.name !== Metadata.name) return false;
            return commands.moveChild('up', pos);
          },
    };
  },
});
