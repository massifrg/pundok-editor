import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Component } from 'vue';
import MetaBoolView from '../../components/nodeviews/MetaBoolView.vue';
import { NODE_NAME_META_BOOL, NODE_NAME_META_LIST } from '../../common';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    metaBool: {
      appendMetaBool: () => ReturnType;
    };
  }
}

export interface MetaBoolOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaBool = Node.create<MetaBoolOptions>({
  name: NODE_NAME_META_BOOL,
  group: 'meta',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-bool',
      },
    };
  },

  addAttributes() {
    return {
      value: {
        default: 'False',
        renderHTML: (attributes) =>
          attributes.value === 'True' ? { checked: true } : {},
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      this.options.HTMLAttributes,
      [
        'input',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          type: 'checkbox',
        }),
      ],
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(MetaBoolView as Component);
  },

  addCommands() {
    return {
      appendMetaBool:
        () =>
          ({ dispatch, state, tr }) => {
            const { from, to, empty } = state.selection;
            const doc = tr.doc;
            const r = doc.resolve(from);
            const schema = state.schema;
            for (let d = r.depth; d > 0; d--) {
              const n = r.node(d);
              if (n && n.type.name === NODE_NAME_META_LIST) {
                if (dispatch) {
                  const metabool = schema.nodes[this.name].create({
                    value: 'True',
                  });
                  dispatch(tr.insert(r.end(d), metabool));
                }
                return true;
              }
            }
            return false;
          },
    };
  },
});
