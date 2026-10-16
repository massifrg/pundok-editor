// adapted from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-bold/src/bold.ts

import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { MARK_NAME_STRONG, SK } from '../../common';
import { asTiptapCommand } from '../helpers';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';

export interface StrongOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    strong: {
      /**
       * Set a strong mark
       */
      setStrong: () => ReturnType;
      /**
       * Toggle a strong mark
       */
      toggleStrong: () => ReturnType;
      /**
       * Unset a strong mark
       */
      unsetStrong: () => ReturnType;
    };
  }
}

export const starInputRegex = /(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))$/;
export const starPasteRegex = /(?:^|\s)((?:\*\*)((?:[^*]+))(?:\*\*))/g;
export const underscoreInputRegex = /(?:^|\s)((?:__)((?:[^__]+))(?:__))$/;
export const underscorePasteRegex = /(?:^|\s)((?:__)((?:[^__]+))(?:__))/g;

export const Strong = Mark.create<StrongOptions>({
  name: MARK_NAME_STRONG,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'strong',
      },
      {
        tag: 'b',
        getAttrs: (node) =>
          (node as HTMLElement).style.fontWeight !== 'normal' && null,
      },
      // {
      //   style: 'font-weight',
      //   getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      // },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'strong',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setStrong: () => asTiptapCommand(setStrongCommand),
      toggleStrong: () => asTiptapCommand(toggleStrongCommand),
      unsetStrong: () => asTiptapCommand(unsetStrongCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_STRONG]: () => this.editor.commands.toggleStrong(),
      // [SK.TOGGLE_BOLD_ALT]: () => this.editor.commands.toggleStrong(),
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: starInputRegex,
        type: this.type,
      }),
      markInputRule({
        find: underscoreInputRegex,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: starPasteRegex,
        type: this.type,
      }),
      markPasteRule({
        find: underscorePasteRegex,
        type: this.type,
      }),
    ];
  },
});

const setStrongCommand: Command = (state, dispatch) =>
  setMarkNoAtoms(state.schema.marks[MARK_NAME_STRONG], null, {
    excludeNonLeafAtoms: 'whole',
  })(state, dispatch);
const toggleStrongCommand: Command = (state, dispatch) =>
  toggleMarkNoAtoms(state.schema.marks[MARK_NAME_STRONG], null, {
    excludeNonLeafAtoms: 'whole',
  })(state, dispatch);
const unsetStrongCommand: Command = (state, dispatch) =>
  unsetMarkNoAtoms(state.schema.marks[MARK_NAME_STRONG], {
    excludeNonLeafAtoms: 'whole',
  })(state, dispatch);
