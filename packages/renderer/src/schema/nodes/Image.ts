// slightly modified from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-image/src/image.ts
import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';
import { getEditorDocState } from '../helpers';
import { parse as parsePath } from 'path-browserify'
import { Editor } from '@tiptap/vue-3';

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

  addStorage() {
    return {
      baseUrl: undefined as string | undefined
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        // renderHTML: (attrs) => (attrs.src ? { src: 'img://' + this.storage.baseUrl + attrs.src } : {}),
      },
      title: {
        default: null,
        // renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
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

  renderHTML({ HTMLAttributes, node }) {
    const editor = this.editor
    const storage = this.storage
    const attributes: Record<string, any> = { ...node.attrs }
    if (editor && !storage.baseUrl) {
      let baseUrl: string | undefined = undefined
      const docState = getEditorDocState(editor as Editor)
      console.log(docState)
      if (docState) {
        baseUrl = docState.lastSaveResponse?.doc.path
        if (baseUrl)
          baseUrl = parsePath(baseUrl).dir
        baseUrl = docState.resourcePath && docState.resourcePath[0]
        // console.log(`baseUrl: ${baseUrl}`)
        if (baseUrl)
          storage.baseUrl = baseUrl
      }
    }
    if (storage.baseUrl)
      attributes.src = `img://${storage.baseUrl}/${attributes.src}`
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, attributes),
    ];
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
