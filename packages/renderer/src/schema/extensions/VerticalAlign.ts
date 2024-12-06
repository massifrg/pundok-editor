import { Extension } from '@tiptap/core';

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
      setVerticalAlign:
        (alignment: string) =>
        ({ commands }) => {
          if (!this.options.alignments.includes(alignment)) {
            return false;
          }

          return this.options.types.every((type) =>
            commands.updateAttributes(type, { verticalAlign: alignment })
          );
        },

      unsetVerticalAlign:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.resetAttributes(type, 'verticalAlign')
          );
        },
    };
  },
});
