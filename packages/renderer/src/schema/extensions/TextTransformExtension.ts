import { Extension } from '@tiptap/core';
import { Attrs, Mark, MarkType } from '@tiptap/pm/model';
import { Command } from '@tiptap/pm/state';
import {
  lowerCaseCommand,
  lowerCaseTransaction,
  upperCaseCommand,
  upperCaseFirstCommand,
  upperCaseFirstTransaction,
  upperCaseTransaction,
} from '../../commands';
import { getMark } from '../helpers';
import { asTiptapCommand } from '../helpers';
import { SK } from '../../common';

export type TextTransformType =
  | 'add-mark'
  | 'remove-mark'
  | 'lowercase'
  | 'uppercase'
  | 'uppercase-first';

export interface TextTransform {
  type: TextTransformType;
}

export interface MarkTransform extends TextTransform {
  type: 'add-mark' | 'remove-mark';
  mark: Mark | MarkType | string;
  attrs?: Attrs;
}

export interface CapitalizeTransform extends TextTransform {
  type: 'lowercase' | 'uppercase' | 'uppercase-first';
  locales?: string | string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textTransform: {
      toLowercase: (locales?: string | string[]) => ReturnType;
      toUppercase: (locales?: string | string[]) => ReturnType;
      toUppercaseFirst: (locales?: string | string[]) => ReturnType;
      applyTextTransforms: (transforms: TextTransform[]) => ReturnType;
    };
  }
}

export const TextTransformExtension = Extension.create({
  name: 'textTransform',

  addCommands() {
    return {
      toLowercase:
        (locales?: string | string[]) =>
          asTiptapCommand(lowerCaseCommand(locales)),
      toUppercase:
        (locales?: string | string[]) =>
          asTiptapCommand(upperCaseCommand(locales)),
      toUppercaseFirst:
        (locales?: string | string[]) =>
          asTiptapCommand(upperCaseFirstCommand(locales)),
      applyTextTransforms: (transforms) =>
        asTiptapCommand(applyTextTransformsCommand(transforms)),
    };
  },
  addKeyboardShortcuts() {
    return {
      [SK.LOWERCASE]: () => this.editor.commands.toLowercase(),
      [SK.UPPERCASE]: () => this.editor.commands.toUppercase(),
      [SK.UPPERCASEFIRST]: () => this.editor.commands.toUppercaseFirst()
    }
  }
});

export function applyTextTransformsCommand(transforms: TextTransform[]): Command {
  return (state, dispatch, view) => {
    const { empty, from, to } = state.selection;
    if (empty) return false;
    if (dispatch) {
      const tr = state.tr
      const schema = state.schema;
      let mark: Mark | undefined;
      transforms.forEach((t) => {
        switch (t.type) {
          case 'add-mark':
            mark = getMark(
              (t as MarkTransform).mark,
              (t as MarkTransform).attrs,
              schema
            );
            if (mark) tr.addMark(from, to, mark);
            break;
          case 'remove-mark':
            mark = getMark(
              (t as MarkTransform).mark,
              (t as MarkTransform).attrs,
              schema
            );
            if (mark) tr.removeMark(from, to, mark);
            break;
          case 'lowercase':
            lowerCaseTransaction(
              tr,
              schema,
              (t as CapitalizeTransform).locales
            );
            break;
          case 'uppercase':
            upperCaseTransaction(
              tr,
              schema,
              (t as CapitalizeTransform).locales
            );
            break;
          case 'uppercase-first':
            upperCaseFirstTransaction(
              tr,
              schema,
              (t as CapitalizeTransform).locales
            );
            break;
          // TODO: add/remove class, add/remove custom class
        }
      });
      dispatch(tr);
    }
    return true;
  }
}
