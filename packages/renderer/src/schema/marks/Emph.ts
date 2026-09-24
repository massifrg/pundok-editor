// adapted from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-italic/src/italic.ts

import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import type { Command } from '@tiptap/pm/state';
import { MARK_NAME_EMPH, SK } from '../../common';
import { asTiptapCommand } from '../helpers';
import { setMarkNoAtoms, toggleMarkNoAtoms, unsetMarkNoAtoms } from '../../commands';

export interface EmphOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emph: {
      /**
       * Set an emph mark
       */
      setEmph: () => ReturnType;
      /**
       * Toggle an emph mark
       */
      toggleEmph: () => ReturnType;
      /**
       * Unset an emph mark
       */
      unsetEmph: () => ReturnType;
    };
  }
}

export const starInputRegex = /(?:^|\s)((?:\*)((?:[^*]+))(?:\*))$/;
export const starPasteRegex = /(?:^|\s)((?:\*)((?:[^*]+))(?:\*))/g;
export const underscoreInputRegex = /(?:^|\s)((?:_)((?:[^_]+))(?:_))$/;
export const underscorePasteRegex = /(?:^|\s)((?:_)((?:[^_]+))(?:_))/g;

export const Emph = Mark.create<EmphOptions>({
  name: MARK_NAME_EMPH,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'em',
      },
      {
        tag: 'i',
        getAttrs: (node) =>
          (node as HTMLElement).style.fontStyle !== 'normal' && null,
      },
      // {
      //   style: 'font-style=italic',
      // },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'em',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setEmph: () => asTiptapCommand(setEmphCommand),
      toggleEmph: () => asTiptapCommand(toggleEmphCommand),
      unsetEmph: () => asTiptapCommand(unsetEmphCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.TOGGLE_EMPH]: () => this.editor.commands.toggleEmph(),
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

const setEmphCommand: Command = (state, dispatch) =>
  setMarkNoAtoms(state.schema.marks[MARK_NAME_EMPH], null, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
const toggleEmphCommand: Command = (state, dispatch) =>
  toggleMarkNoAtoms(state.schema.marks[MARK_NAME_EMPH], null, { excludeNonLeafAtoms: 'whole' })(state, dispatch);
const unsetEmphCommand: Command = (state, dispatch) =>
  unsetMarkNoAtoms(state.schema.marks[MARK_NAME_EMPH], { excludeNonLeafAtoms: 'whole' })(state, dispatch);
