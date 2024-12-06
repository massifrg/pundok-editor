import { Extension } from '@tiptap/core';
import {
  lowerCaseCommand,
  lowerCaseTransaction,
  upperCaseCommand,
  upperCaseFirstCommand,
  upperCaseTransaction,
} from '../../commands';
import { Attrs, Mark, MarkType } from '@tiptap/pm/model';
import { getMark } from '../helpers';

export type TextTransformType =
  | 'add-mark'
  | 'remove-mark'
  | 'lowercase'
  | 'uppercase';

export interface TextTransform {
  type: TextTransformType;
}

export interface MarkTransform extends TextTransform {
  type: 'add-mark' | 'remove-mark';
  mark: Mark | MarkType | string;
  attrs?: Attrs;
}

export interface CapitalizeTransform extends TextTransform {
  type: 'lowercase' | 'uppercase';
  locales?: string | string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textTransform: {
      toLowercase: (locales: string | string[]) => ReturnType;
      toUppercase: (locales: string | string[]) => ReturnType;
      toUppercaseFirst: (locales: string | string[]) => ReturnType;
      applyTextTransforms: (transforms: TextTransform[]) => ReturnType;
    };
  }
}

export const TextTransformExtension = Extension.create({
  name: 'textTransform',

  addCommands() {
    return {
      toLowercase:
        (locales: string | string[]) =>
        ({ dispatch, state }) =>
          lowerCaseCommand(locales)(state, dispatch),
      toUppercase:
        (locales: string | string[]) =>
        ({ dispatch, state }) =>
          upperCaseCommand(locales)(state, dispatch),
      toUppercaseFirst:
        (locales: string | string[]) =>
        ({ dispatch, state }) =>
          upperCaseFirstCommand(locales)(state, dispatch),
      applyTextTransforms:
        (transforms: TextTransform[]) =>
        ({ dispatch, state, tr }) => {
          const { empty, from, to } = state.selection;
          if (empty) return false;
          if (dispatch) {
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
              }
            });
            dispatch(tr);
          }
          return true;
        },
      // const transform: SingleRangeTransform = (text, marks) => {
      //   return {
      //     transformedText: text.replace(
      //       /(\P{L}|^)(\p{L})(\p{L}*)/gu,
      //       (m, non_letter, first_letter, word_remainder) =>
      //         non_letter +
      //         first_letter.toLocaleUpperCase(options?.locales) +
      //         word_remainder.toLocaleLowerCase(options?.locales)
      //     ),
      //     marks,
      //   } as TextTransformResult;
      // };
    };
  },
});
