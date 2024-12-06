import { mergeAttributes, Node } from '@tiptap/core';

// declare module '@tiptap/core' {
//   interface Commands<ReturnType> {
//     metaString: {
//       insertMetaString: () => ReturnType;
//     };
//   }
// }

export interface MetaStringOptions {
  HTMLAttributes: Record<string, any>;
}

export const MetaString = Node.create<MetaStringOptions>({
  name: 'metaString',
  content: 'text*',
  group: 'meta',
  isolating: true,
  marks: '',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'meta-value meta-string',
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
  //     insertMetaString: () => ({ dispatch, state, tr }) => {
  //       const { from } = state.selection;
  //       const resolved = tr.doc.resolve(from);
  //       for (let d = 1; d <= resolved.depth; d++) {
  //         console.log(`${resolved.node(d).type.name}: ${resolved.after(d)}`);
  //       }
  //       console.log(`parent: ${resolved.parent.type.name}`);
  //       return false;
  //     },
  //   };
  // },
});
