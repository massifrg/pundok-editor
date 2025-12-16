import { Extension } from '@tiptap/core';
import { updateAttributesCommand } from './HelperCommandsExtension';

export interface VerticalAlignOptions {
  types: string[];
  alignments: string[];
  defaultAlignment: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    verticalAlign: {
      /**
       * Set the vertical align attribute
       */
      setVerticalAlign: (alignment: string) => ReturnType;
      /**
       * Unset the vertical align attribute
       */
      unsetVerticalAlign: () => ReturnType;
    };
  }
}

export const VerticalAlign = Extension.create<VerticalAlignOptions>({
  name: 'verticalAlign',

  addOptions() {
    return {
      types: [],
      alignments: ['baseline', 'top', 'middle', 'bottom'],
      defaultAlignment: 'baseline',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          verticalAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) =>
              element.style.verticalAlign || this.options.defaultAlignment,
            renderHTML: (attributes) => {
              if (attributes.verticalAlign === this.options.defaultAlignment) {
                return {};
              }
              return { style: `vertical-align: ${attributes.verticalAlign}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setVerticalAlign: (alignment: string) => (cp) =>
        this.options.alignments.includes(alignment)
        && this.options.types.every(type =>
          updateAttributesCommand(type, (nodeOrMark) => {
            return { attrs: { ...nodeOrMark.attrs, verticalAlign: alignment } }
          })(cp)
        ),
      unsetVerticalAlign: () => (cp) => this.options.types.every(type =>
        updateAttributesCommand(type, (nodeOrMark) => {
          const { verticalAlign, ...attrs } = nodeOrMark.attrs
          return { attrs }
        })(cp)
      )
    };
  },
});
