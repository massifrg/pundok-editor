import {
  isMarkActive,
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import {
  domToMathType,
  PANDOC_DEFAULT_MATH_TYPE,
  PANDOC_MATH_TYPES,
  mathTypeToHtmlAttributes,
  nextMathType,
  MathType,
} from '../helpers';
import { SK_TOGGLE_MATH, SK_TOGGLE_MATH_TYPE } from '../../common';

export interface MathOptions {
  HTMLAttributes: Record<string, any>;
  mathTypes: MathType[];
  defaultMathType: MathType;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      /**
       * Set a math mark
       */
      setMath: () => ReturnType;
      /**
       * Toggle a math mark
       */
      toggleMath: () => ReturnType;
      /**
       * Unset a math mark
       */
      unsetMath: () => ReturnType;
      /**
       * Cycle the mathType attribute through the possible values.
       */
      toggleMathType: () => ReturnType;
    };
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const Math = Mark.create<MathOptions>({
  name: 'math',
  excludes: '_',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'math',
      },
      mathTypes: PANDOC_MATH_TYPES,
      defaultMathType: PANDOC_DEFAULT_MATH_TYPE,
    };
  },

  addAttributes() {
    return {
      mathType: {
        default: this.options.defaultMathType,
        parseHTML: (e) => domToMathType(e),
        renderHTML: (attrs) => mathTypeToHtmlAttributes(attrs.mathType),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span.math' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setMath:
        () =>
          ({ commands }) => {
            return commands.setMark(this.name);
          },
      toggleMath:
        () =>
          ({ commands }) => {
            return commands.toggleMark(this.name);
          },
      unsetMath:
        () =>
          ({ commands }) => {
            return commands.unsetMark(this.name);
          },
      toggleMathType:
        () =>
          ({ dispatch, state, tr }) => {
            const { doc, schema, selection } = state
            const mathTypeName = this.name
            const mathMarkType = schema.marks[mathTypeName]
            const { empty, from } = selection
            if (isMarkActive(state, mathTypeName)) {
              if (dispatch) {
                const positions: { from: number, to: number, mathType: MathType }[] = []
                if (empty) {
                  const node = doc.nodeAt(from)
                  if (node) {
                    const start = doc.resolve(from).start()
                    const currentMathMark = node.marks.find(m => m.type.name === mathTypeName)
                    if (currentMathMark)
                      positions.push({
                        from: start,
                        to: start + node.nodeSize,
                        mathType: currentMathMark.attrs.mathType
                      })
                  }
                } else {
                  selection.content().content.descendants((node, pos) => {
                    const currentMathMark = node.marks.find(m => m.type.name === mathTypeName)
                    if (currentMathMark) {
                      const start = from + pos - 1
                      positions.push({
                        from: start,
                        to: start + node.nodeSize,
                        mathType: currentMathMark.attrs.mathType
                      })
                    }
                  })
                }
                positions.forEach(({ from, to, mathType }) => {
                  const node = doc.nodeAt(from)
                  if (node) {
                    const mark = mathMarkType.create({ mathType: nextMathType(mathType) })
                    tr.removeMark(from, to, mathMarkType)
                      .addMark(from, to, mark)
                  }
                })
                dispatch(tr)
              }
              return true
            }
            return false
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_MATH]: () => this.editor.commands.toggleMath(),
      [SK_TOGGLE_MATH_TYPE]: () => this.editor.commands.toggleMathType(),
    };
  },

  // addInputRules() {
  //   return [
  //     markInputRule({
  //       find: inputRegex,
  //       type: this.type,
  //     }),
  //   ]
  // },

  // addPasteRules() {
  //   return [
  //     markPasteRule({
  //       find: pasteRegex,
  //       type: this.type,
  //     }),
  //   ]
  // },
});
