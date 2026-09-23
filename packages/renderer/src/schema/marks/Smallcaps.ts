import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { MARK_NAME_SMALLCAPS, SK } from '../../common';
import { asTiptapCommand } from '../helpers/command';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';

export interface SmallcapsOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smallcaps: {
      /**
       * Set a smallcaps mark
       */
      setSmallcaps: () => ReturnType;
      /**
       * Toggle a smallcaps mark
       */
      toggleSmallcaps: () => ReturnType;
      /**
       * Unset a smallcaps mark
       */
      unsetSmallcaps: () => ReturnType;
    };
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const Smallcaps = Mark.create<SmallcapsOptions>({
  name: MARK_NAME_SMALLCAPS,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'smallcaps',
        style: 'font-variant: small-caps',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (e) =>
          (e as HTMLElement).classList.contains('smallcaps') ? null : false,
      },
      // {
      //   style: 'font-variant',
      //   getAttrs: value => /^small-caps$/.test(value as string) && null
      // },
    ];
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
      setSmallcaps: () => asTiptapCommand(setSmallcapsCommand),
      toggleSmallcaps: () => asTiptapCommand(toggleSmallcapsCommand),
      unsetSmallcaps: () => asTiptapCommand(unsetSmallcapsCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_SMALLCAPS]: () => this.editor.commands.toggleSmallcaps(),
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

const setSmallcapsCommand: Command = (state, dispatch) =>
  setMarkNoAtoms(state.schema.marks[MARK_NAME_SMALLCAPS], null, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
const toggleSmallcapsCommand: Command = (state, dispatch) =>
  toggleMarkNoAtoms(state.schema.marks[MARK_NAME_SMALLCAPS], null, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
const unsetSmallcapsCommand: Command = (state, dispatch) =>
  unsetMarkNoAtoms(state.schema.marks[MARK_NAME_SMALLCAPS], { excludeNonLeafAtoms: 'whole' })(state, dispatch);
