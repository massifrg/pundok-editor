// slightly modified from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-image/src/image.ts
import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';
import { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { docBasePath, getDocState, getEditorDocState } from '../helpers';
import { isAbsolute, parse as parsePath, relative } from 'path-browserify'
import { Editor } from '@tiptap/vue-3';
import { Command } from '@tiptap/pm/state';

// const no_image_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAwnpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHjabVBbEsMgCPz3FD2CAhI8jmnSmd6gxy8IycSmO+O6PGZF0v55v9LDAIUS1UW4MWcFNWrQVUh29MEl0+ABiJLGUz6dBdAU6o0eCkf/kS+ngV9dVb0YyTMK61xoFP7yYxQvo01kegujFkYIXihh0P1bmZss1y+se54hfpIRyTz2LV50e1vVdxBgx4JZGZF8ALRTE3YVZXAFU6yatM2Yw0wX8m9PB9IX2QFZD23s3PsAAAGEaUNDUElDQyBwcm9maWxlAAB4nH2RPUjDUBSFT1NLRSodLCIimKE62UVFHGsVilCh1AqtOpi89A+aNCQpLo6Ca8HBn8Wqg4uzrg6ugiD4A+IuOCm6SIn3JYUWMV54vI/z7jm8dx8gNKtMNXvigKpZRiaZEHP5VTH4Ch8CCGMUgxIz9bl0OgXP+rqnbqq7GM/y7vuz+pWCyQCfSBxnumERbxDPbFo6533iCCtLCvE58YRBFyR+5Lrs8hvnksMCz4wY2cw8cYRYLHWx3MWsbKjE08RRRdUoX8i5rHDe4qxW66x9T/7CUEFbWeY6rREksYglpCFCRh0VVGEhRrtGiokMnSc8/MOOP00umVwVMHIsoAYVkuMH/4PfszWLU5NuUigBBF5s+2MMCO4CrYZtfx/bdusE8D8DV1rHX2sCs5+kNzpa9AgIbwMX1x1N3gMud4ChJ10yJEfy0xKKReD9jL4pDwzcAn1r7tza5zh9ALI0q9QNcHAIjJcoe93j3b3dc/u3pz2/H1j0cpxE1WpcAAANeGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNC40LjAtRXhpdjIiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iCiAgICB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgIHhtcE1NOkRvY3VtZW50SUQ9ImdpbXA6ZG9jaWQ6Z2ltcDpjZWI0YjYzNi0zODg4LTQ0ZGEtOGRjMC1lODcwMzhjNWZmMDUiCiAgIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MmExOTdiYTgtMTVhZS00OWNkLWFmMmYtZDJmMjE0MDkwNzkxIgogICB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6OTkxMjExODYtZTAxOC00ZTQ4LTlhZTItZDkwZDA5NWZmOTdkIgogICBkYzpGb3JtYXQ9ImltYWdlL3BuZyIKICAgR0lNUDpBUEk9IjIuMCIKICAgR0lNUDpQbGF0Zm9ybT0iTGludXgiCiAgIEdJTVA6VGltZVN0YW1wPSIxNzM2MDkxODI4Mjc3MjYwIgogICBHSU1QOlZlcnNpb249IjIuMTAuMzQiCiAgIHRpZmY6T3JpZW50YXRpb249IjEiCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXA6TWV0YWRhdGFEYXRlPSIyMDI1OjAxOjA1VDE2OjQzOjQ2KzAxOjAwIgogICB4bXA6TW9kaWZ5RGF0ZT0iMjAyNTowMTowNVQxNjo0Mzo0NiswMTowMCI+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InNhdmVkIgogICAgICBzdEV2dDpjaGFuZ2VkPSIvIgogICAgICBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmU1NTNhYmU2LTk4YmUtNDQwNS05NjAxLTYxYTVkNWMxYjk0MCIKICAgICAgc3RFdnQ6c29mdHdhcmVBZ2VudD0iR2ltcCAyLjEwIChMaW51eCkiCiAgICAgIHN0RXZ0OndoZW49IjIwMjUtMDEtMDVUMTY6NDM6NDgrMDE6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+BHWTWwAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+kBBQ8rMKzUs5AAAAHsSURBVFjDxZg9SwNBEIafu0QtjBghlpb2VioIphUsJHZGVNBeE+z8CyLJmVp/gb3Y2mhvExUsLcRC/CoEcxbOwrLeXu6SvTiw5HKzN/PuO3Mzk8CvbABHgM+AJS/OT+U6D9SAUPQFYMUhsA/gEnjWbzbEoVqB4bAOfBt7+llvwKoOwAdOjE3NjEG8AiWAnNwoAhXN4TwwAVzI92vgBZgCnvpY4xLmEeAKaCuHWxakgePEvNdsV7EY72jXu5IjniMAoXnDj1C0gZYBopnVK6qMegYDe8BxBBP9gvBsAKKoqmcEIhEAxUTmIPJd9AqEcq5/1qKSyiUD3ZhwkphJDWQWjnyKvR2h3Wk4/B4KidNw9PKQ03D4thJpkTEjHK2UZTs0i5Jvq1ARsg2cSydTxmopw+GZYJIyMCOOFoBDIxwPxt64cFj96O34xtAVgTtN3wHWRVcGvlK08j/tWMmmBYAHnFnGqiXgscvkExi01+QAoXaIWAb2Y4x3Eo5fthmz2q0QzQIHctpe2m7BUqwaUfkQFQJfG9XTriFJ2rhBdzRpEvbTZ4KkM2YWAFQoYkGoHHjXHprWx2VHTITa2xDZwCYl2cIBrgDwcgLgE7gFloHhAf0unQMKZg8oAYtmhjqWMrAjFXSNfxBf/gqoAPwAwrIGAzTkFg0AAAAASUVORK5CYII="

import { NODE_NAME_IMAGE, SK_INSERT_IMAGE } from '../../common';

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
      setImage: (options?: { src: string; title?: string }) => ReturnType;
      /**
       * Fix the src attribute of an image
       */
      fixImageSrc: () => ReturnType;
      /**
       * Fix the src attribute of all the images in the document
       */
      fixAllImagesSrc: () => ReturnType;
    }
  }
}

export const inputRegex =
  /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export const Image = Node.create<ImageOptions>({
  name: NODE_NAME_IMAGE,
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
      if (docState)
        baseUrl = docBasePath(docState)
      if (baseUrl)
        storage.baseUrl = baseUrl
    }
    const ext = parsePath(attributes.src).ext.toLowerCase()
    const { page, ['preview-width']: width, ['preview-height']: height } = attributes.kv || {}
    const query = ext === '.pdf' && page && parseInt(page) > 1 && `?page=${page}` || ''
    if (!attributes.src || attributes.src.length === 0) {
      console.log("IMG NO SRC!")
      attributes.src = '?' // no_image_base64
    } else if (isAbsolute(attributes.src) && storage.baseUrl) {
      attributes.src = `img://${storage.baseUrl}/${relative(storage.baseUrl, attributes.src)}`
    } else {
      attributes.src = storage.baseUrl
        ? `img://${storage.baseUrl}/${attributes.src}${query}`
        : `img://${attributes.src}${query}`
    }
    const style = (width || height)
      && Object.entries({ width, height }).map(([p, v]) => `${p}: ${v}`).join('; ') || ''
    if (style)
      attributes.style = style
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
              attrs: options || { src: '' },
            });
          },
      fixImageSrc: () => ({ dispatch, state }) => fixImageSrc(false)(state, dispatch),
      fixAllImagesSrc: () => ({ dispatch, state }) => fixImageSrc(true)(state, dispatch),
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

  addKeyboardShortcuts() {
    return {
      [SK_INSERT_IMAGE]: () => this.editor.commands.setImage()
    }
  }
});

function isImageWithAbsoluteSrc(node: ProsemirrorNode): boolean {
  return node.type.name === NODE_NAME_IMAGE
    && node.attrs.src && node.attrs.src.startsWith('/')
}

function fixImageSrc(all: boolean): Command {
  return (state, dispatch) => {
    const docState = getDocState(state)
    if (!docState)
      return false
    const basePath = docBasePath(docState)
    if (!basePath)
      return false
    const { doc, selection, tr } = state
    const positions: number[] = []
    if (all) {
      doc.descendants((node, pos) => {
        if (isImageWithAbsoluteSrc(node)) positions.push(pos)
      })
    } else {
      const { from, to } = selection
      doc.nodesBetween(from, to, (node, pos) => {
        if (isImageWithAbsoluteSrc(node)) positions.push(pos)
      })
    }
    if (positions.length === 0) return false
    if (dispatch) {
      positions.forEach(pos => {
        const node = doc.nodeAt(pos)
        if (node)
          tr.setNodeAttribute(pos, 'src', relative(basePath, node.attrs.src))
      })
    }
    return true
  }
}
