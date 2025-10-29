import { CommandProps, Extension } from '@tiptap/core';
import {
  lowerCaseCommand,
  lowerCaseTransaction,
  upperCaseCommand,
  upperCaseFirstCommand,
  upperCaseFirstTransaction,
  upperCaseTransaction,
} from '../../commands';
import { Attrs, Mark, MarkType, Schema } from '@tiptap/pm/model';
import { getMark } from '../helpers';
import {
  ActionNameWithProps,
  AddOrRemoveCustomStyleActionProps,
  AddOrRemoveMarkActionProps,
  MARK_NAME_SPAN,
  SetSpanActionProps,
  SK_LOWERCASE,
  SK_UPPERCASE,
  SK_UPPERCASEFIRST
} from '../../common';
import {
  ACTION_ADD_CLASS,
  ACTION_ADD_CUSTOM_CLASS,
  ACTION_ADD_CUSTOM_STYLE,
  ACTION_ADD_MARK,
  ACTION_LOWERCASE,
  ACTION_REMOVE_CLASS,
  ACTION_REMOVE_CUSTOM_CLASS,
  ACTION_REMOVE_CUSTOM_STYLE,
  ACTION_REMOVE_MARK,
  ACTION_SET_SPAN,
  ACTION_UPPERCASE,
  ACTION_UPPERCASE_FIRST,
} from '../../actions';
import { updateAttributesCommand } from './HelperCommandsExtension';

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
      applyAction: (actions: ActionNameWithProps[]) => ReturnType;
    };
  }
}

export const TextTransformExtension = Extension.create({
  name: 'textTransform',

  addCommands() {
    return {
      toLowercase:
        (locales?: string | string[]) =>
          ({ dispatch, state }) =>
            lowerCaseCommand(locales)(state, dispatch),
      toUppercase:
        (locales?: string | string[]) =>
          ({ dispatch, state }) =>
            upperCaseCommand(locales)(state, dispatch),
      toUppercaseFirst:
        (locales?: string | string[]) =>
          ({ dispatch, state }) =>
            upperCaseFirstCommand(locales)(state, dispatch),
      applyTextTransforms,
      applyActions,
    };
  },
  addKeyboardShortcuts() {
    return {
      [SK_LOWERCASE]: () => this.editor.commands.toLowercase(),
      [SK_UPPERCASE]: () => this.editor.commands.toUppercase(),
      [SK_UPPERCASEFIRST]: () => this.editor.commands.toUppercaseFirst()
    }
  }
});

const applyTextTransforms: (transforms: TextTransform[]) => (cp: CommandProps) => boolean =
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

const applyActions: (actions: ActionNameWithProps[]) => (cp: CommandProps) => boolean =
  (actions: ActionNameWithProps[]) => {
    const transforms = actions.reduce(
      (acc, a) => {
        const t = actionNameWithPropsToTextTransform(a)
        return t ? [...acc, t] : acc
      },
      [] as TextTransform[]
    )
    return applyTextTransforms(transforms)
  }

function actionNameWithPropsToTextTransform(
  action: ActionNameWithProps,
): TextTransform | undefined {
  const { name, props } = action
  switch (name) {
    case ACTION_ADD_MARK.name:
    case ACTION_REMOVE_MARK.name:
      {
        const { markType, attrs } = props as AddOrRemoveMarkActionProps
        return {
          type: ACTION_ADD_MARK.name === name ? 'add-mark' : 'remove-mark',
          mark: markType,
          attrs: attrs
        } as MarkTransform
      }
      break
    case ACTION_ADD_CUSTOM_STYLE.name:
    case ACTION_REMOVE_CUSTOM_STYLE.name:
      {
        const { styleName } = props as AddOrRemoveCustomStyleActionProps
        const attrs = {
          customStyle: styleName,
          kv: {
            'custom-style': styleName,
          }
        }
        return {
          type: ACTION_ADD_CUSTOM_STYLE.name === name ? 'add-mark' : 'remove-mark',
          mark: MARK_NAME_SPAN,
          attrs
        } as MarkTransform
      }
      break
    case ACTION_LOWERCASE.name:
      return { type: 'lowercase' } as CapitalizeTransform
    case ACTION_UPPERCASE.name:
      return { type: 'uppercase' } as CapitalizeTransform
    case ACTION_UPPERCASE_FIRST.name:
      return { type: 'uppercase-first' } as CapitalizeTransform
    case ACTION_SET_SPAN.name:
      {
        const { classes, attrs } = props as SetSpanActionProps
        return {
          type: 'add-mark',
          mark: MARK_NAME_SPAN,
          attrs: { classes, kv: attrs }
        } as MarkTransform
      }
      break
    case ACTION_ADD_CUSTOM_CLASS.name:
    case ACTION_REMOVE_CUSTOM_CLASS.name:
    case ACTION_ADD_CLASS.name:
    case ACTION_REMOVE_CLASS.name:
    default:
      return undefined
  }
}