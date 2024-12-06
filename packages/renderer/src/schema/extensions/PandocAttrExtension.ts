import { Extension } from '@tiptap/core';
import {
  pandocAttrClassesToHtmlAttrs,
  pandocAttrIdToHtmlAttrs,
  pandocAttrKvToHtmlAttrs,
} from '../helpers/pandocAttr';

export interface PandocAttrOptions {
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pandocAttr: {
      // setAttr: (alignment: string) => ReturnType,
      // unsetAttr: () => ReturnType,
    };
  }
}

export const PandocAttrExtension = Extension.create<PandocAttrOptions>({
  name: 'pandocAttr',

  addOptions() {
    return {
      types: [
        'code',
        'link',
        'image',
        'span',
        'emptySpan',
        'codeBlock',
        'heading',
        'div',
        'pandocTable',
        'tableHead',
        'tableBody',
        'tableFoot',
        'tableRow',
        'tableHeader',
        'tableCell',
        'figure',
        'note',
        'indexRef',
        'indexTerm',
        'indexDiv',
      ],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          id: {
            default: '',
            renderHTML: (attributes) => {
              const id = attributes.id;
              return id ? { id, ...pandocAttrIdToHtmlAttrs(id) } : {};
            },
          },
          classes: {
            default: [],
            renderHTML: (attributes) =>
              attributes.classes
                ? pandocAttrClassesToHtmlAttrs(attributes.classes)
                : {},
          },
          kv: {
            default: {},
            renderHTML: (attributes) => {
              // for CodeBlock and Code
              if (attributes.language) {
                const kv = attributes.kv || {};
                kv.language = attributes.language;
                attributes.kv = kv;
              }
              return attributes.kv
                ? pandocAttrKvToHtmlAttrs(attributes.kv)
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      // setAttr: (alignment: string) => ({ commands }) => {
      //   if (!this.options.alignments.includes(alignment)) {
      //     return false
      //   }
      //   return this.options.types.every(type => commands.updateAttributes(type, { verticalAlign: alignment }))
      // },
      // unsetAttr: () => ({ commands }) => {
      //   return this.options.types.every(type => commands.resetAttributes(type, 'verticalAlign'))
      // },
    };
  },
});
