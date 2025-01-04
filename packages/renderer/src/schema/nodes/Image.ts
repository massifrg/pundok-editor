// slightly modified from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-image/src/image.ts
import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';
import { getEditorDocState } from '../helpers';

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
      editor: null
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        renderHTML: (attrs) => {
          let baseUrl = ''
          if (this.storage.editor) {
            const docState = getEditorDocState(this.storage.editor)
            if (docState)
              baseUrl = docState.project?.path
                || docState.lastSaveResponse?.doc.path
                || docState.lastExportResponse?.doc.path
                || (docState.resourcePath && docState.resourcePath[0])
                || ''
            baseUrl = baseUrl.length > 0 && !baseUrl.endsWith('/') ? baseUrl + '/' : baseUrl
          }
          return attrs.src ? { src: 'img://' + baseUrl + attrs.src } : {}
        },
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

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  onCreate() {
    this.storage.editor = this.editor
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
