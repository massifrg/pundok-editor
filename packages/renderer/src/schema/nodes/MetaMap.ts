import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Metadata } from './Metadata';
import MetaMapView from '/@/components/nodeviews/MetaMapView.vue';
import { templateNode } from '../helpers';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metadata: {
      appendMetaMap: (
        text: string,
        metaTypeName: string,
        pos?: number
      ) => ReturnType;
      setMetaMapText: (text: string, pos?: number) => ReturnType;
      moveMetaMapDown: (pos?: number) => ReturnType;
      moveMetaMapUp: (pos?: number) => ReturnType;
    };
  }
}

export interface MetaMapOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaMap = Node.create<MetaMapOptions>({
  name: 'metaMap',
  content: 'meta',
  group: 'meta',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-map',
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
    return VueNodeViewRenderer(MetaMapView);
  },

  addCommands() {
    return {
      appendMetaMap:
        (text: string, metaTypeName: string) =>
        ({ dispatch, state, tr }) => {
          const { doc, schema } = state;
          const metavalue = templateNode(schema, metaTypeName);
          if (!metavalue) return false;
          const metamapType = schema.nodes[MetaMap.name];
          if (!metamapType) return false;
          const metamap = metamapType.create({ text }, metavalue);
          if (!metamap) return false;
          if (dispatch) {
            const metadata = doc.firstChild;
            if (metadata && metadata.type.name === Metadata.name) {
              dispatch(tr.insert(metadata.nodeSize - 1, metamap));
            } else {
              dispatch(
                tr.insert(0, schema.nodes.metadata.create(null, metamap))
              );
            }
          }
          return true;
        },
      setMetaMapText:
        (text: string, pos?: number) =>
        ({ dispatch, state, tr }) => {
          if (!text) return false;
          const mmPos = pos || state.selection.from;
          const metamap = state.doc.nodeAt(mmPos);
          if (!metamap || !(metamap.type.name === this.name)) return false;
          if (dispatch) dispatch(tr.setNodeAttribute(mmPos, 'text', text));
          return true;
        },
      moveMetaMapDown:
        (pos?: number) =>
        ({ commands, state }) => {
          const p = pos || state.selection.from;
          const metamap = state.doc.nodeAt(p);
          if (!metamap || !(metamap.type.name === this.name)) return false;
          const r = state.doc.resolve(p);
          if (r.parent.type.name !== Metadata.name) return false;
          return commands.moveChild('down', pos);
        },
      moveMetaMapUp:
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
