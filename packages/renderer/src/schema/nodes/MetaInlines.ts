import { mergeAttributes, Node } from '@tiptap/core';
import { NODE_NAME_META_INLINES } from '../../common';

// declare module '@tiptap/core' {
//   interface Commands<ReturnType> {
//     metaInlines: {
//       insertMetaInlines: () => ReturnType;
//     };
//   }
// }

export interface MetaInlinesOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaInlines = Node.create<MetaInlinesOptions>({
  name: NODE_NAME_META_INLINES,
  content: 'inline*',
  group: 'meta',
  isolating: true,
  // defining: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-inlines',
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  // addCommands() {
  //   return {
  //     insertMetaInlines:
  //       () =>
  //       ({ dispatch, state, tr }) => {
  //         const { from, to, empty } = state.selection;
  //         const resolved = tr.doc.resolve(from);
  //         for (let d = 1; d <= resolved.depth; d++) {
  //           console.log(`${resolved.node(d).type.name}: ${resolved.after(d)}`);
  //         }
  //         console.log(`parent: ${resolved.parent.type.name}`);
  //         return false;
  //       },
  //   };
  // },
});
