// slightly modified from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-image/src/image.ts
import { Node, nodeInputRule } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Component } from 'vue';
import { ImageView } from '../../components';

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       */
      setImage: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const inputRegex =
  /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const Image = Node.create<ImageOptions>({
  name: 'image',
  inline: true,
  group: 'inline',
  atom: true,
  content: 'inline*',
  draggable: true,
  isolating: true,
  marks: '_',

  addOptions() {
    return {
      inline: true,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
      },
      title: {
        default: null,
        renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? 'img[src]'
          : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  // renderHTML({ HTMLAttributes }) {
  //   return [
  //     'img',
  //     mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
  //   ];
  // },

  addNodeView() {
    return VueNodeViewRenderer(ImageView as Component);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options,
            });
          },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , src, title] = match;

          return { src, title };
        },
      }),
    ];
  },
});
