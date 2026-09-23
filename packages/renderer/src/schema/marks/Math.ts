import {
  isMarkActive,
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';
import {
  domToMathType,
  PANDOC_DEFAULT_MATH_TYPE,
  PANDOC_MATH_TYPES,
  mathTypeToHtmlAttributes,
  nextMathType,
  MathType,
} from '../helpers';
import { MARK_NAME_MATH, SK } from '../../common';
import { asTiptapCommand } from '../helpers/command';

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
  name: MARK_NAME_MATH,
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
      setMath: () => asTiptapCommand(setMathCommand),
      toggleMath: () => asTiptapCommand(toggleMathCommand),
      unsetMath: () => asTiptapCommand(unsetMathCommand),
      toggleMathType: () => asTiptapCommand(toggleMathTypeCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_MATH]: () => this.editor.commands.toggleMath(),
      [SK.TOGGLE_MATH_TYPE]: () => this.editor.commands.toggleMathType(),
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

const setMathCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_MATH];
  return !!mark && setMarkNoAtoms(mark)(state, dispatch);
};
const toggleMathCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_MATH];
  return !!mark && toggleMarkNoAtoms(mark)(state, dispatch);
};
const unsetMathCommand: Command = (state, dispatch) => {
  const mark = state.schema.marks[MARK_NAME_MATH];
  return !!mark && unsetMarkNoAtoms(mark)(state, dispatch);
};
const toggleMathTypeCommand: Command = (state, dispatch) => {
  const { doc, schema, selection } = state;
  const mathMarkType = schema.marks[MARK_NAME_MATH];
  if (!mathMarkType || !isMarkActive(state, MARK_NAME_MATH)) return false;
  const positions: { from: number; to: number; mathType: MathType }[] = [];
  if (selection.empty) {
    const node = doc.nodeAt(selection.from);
    if (node) {
      const start = doc.resolve(selection.from).start();
      const current = node.marks.find((m) => m.type === mathMarkType);
      if (current) positions.push({ from: start, to: start + node.nodeSize, mathType: current.attrs.mathType });
    }
  } else {
    selection.content().content.descendants((node, pos) => {
      const current = node.marks.find((m) => m.type === mathMarkType);
      if (current) positions.push({ from: selection.from + pos - 1, to: selection.from + pos - 1 + node.nodeSize, mathType: current.attrs.mathType });
    });
  }
  if (dispatch) {
    positions.forEach(({ from, to, mathType }) => {
      state.tr.removeMark(from, to, mathMarkType).addMark(from, to, mathMarkType.create({ mathType: nextMathType(mathType) }));
    });
    dispatch(state.tr);
  }
  return true;
};
