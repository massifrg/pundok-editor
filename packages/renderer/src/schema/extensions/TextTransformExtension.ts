import { CommandProps, Extension } from '@tiptap/core';
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
import {
  ActionNameWithProps,
  AddOrRemoveCustomStyleActionProps,
  AddOrRemoveMarkActionProps,
  InsertRawInlineActionProps,
  MARK_NAME_SPAN,
  SetIndexRefActionProps,
  SetSpanActionProps,
  SK
} from '../../common';
import {
  ACTION_ADD_CLASS,
  ACTION_ADD_CUSTOM_CLASS,
  ACTION_ADD_CUSTOM_STYLE,
  ACTION_ADD_MARK,
  ACTION_DELETE_CSS_SELECTED,
  ACTION_INSERT_RAW_INLINE,
  ACTION_LOWERCASE,
  ACTION_REMOVE_CLASS,
  ACTION_REMOVE_CUSTOM_CLASS,
  ACTION_REMOVE_CUSTOM_STYLE,
  ACTION_REMOVE_MARK,
  ACTION_SET_INDEX_REF,
  ACTION_SET_SPAN,
  ACTION_UNWRAP_CSS_SELECTED,
  ACTION_UPPERCASE,
  ACTION_UPPERCASE_FIRST,
} from '../../actions';
import { setIndexRefCommand } from './IndexingExtension';
import { insertRawInlineCommand } from '../nodes/RawInline';
import { isString } from 'lodash-es';
import { deleteCssSelectedCommand, unwrapCssSelectedCommand } from './CssSelectionExtension';

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
      applyActions: (actions: ActionNameWithProps[]) => ReturnType;
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
      // TODO: the next one should go in a file of its own
      applyActions:
        (actions: ActionNameWithProps[]) =>
          ({ state, dispatch, view }) => applyActions(actions)(state, dispatch, view),
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

function applyTextTransformsCommand(transforms: TextTransform[]): Command {
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

function actionNameWithPropsToCommand(
  action: ActionNameWithProps,
): Command {
  const { name, props } = action
  switch (name) {
    case ACTION_ADD_MARK.name:
    case ACTION_REMOVE_MARK.name:
      {
        const { markType, attrs } = (props || {}) as AddOrRemoveMarkActionProps
        return applyTextTransformsCommand([{
          type: ACTION_ADD_MARK.name === name ? 'add-mark' : 'remove-mark',
          mark: markType,
          attrs: attrs
        } as MarkTransform])
      }
      break
    case ACTION_ADD_CUSTOM_STYLE.name:
    case ACTION_REMOVE_CUSTOM_STYLE.name:
      {
        const { styleName } = (props || {}) as AddOrRemoveCustomStyleActionProps
        const attrs = {
          customStyle: styleName,
          kv: {
            'custom-style': styleName,
          }
        }
        return applyTextTransformsCommand([{
          type: ACTION_ADD_CUSTOM_STYLE.name === name ? 'add-mark' : 'remove-mark',
          mark: MARK_NAME_SPAN,
          attrs
        } as MarkTransform])
      }
      break
    case ACTION_LOWERCASE.name:
      return applyTextTransformsCommand([{ type: 'lowercase' } as CapitalizeTransform])
    case ACTION_UPPERCASE.name:
      return applyTextTransformsCommand([{ type: 'uppercase' } as CapitalizeTransform])
    case ACTION_UPPERCASE_FIRST.name:
      return applyTextTransformsCommand([{ type: 'uppercase-first' } as CapitalizeTransform])
    case ACTION_SET_SPAN.name:
      {
        const { classes, attrs } = (props || {}) as SetSpanActionProps
        return applyTextTransformsCommand([{
          type: 'add-mark',
          mark: MARK_NAME_SPAN,
          attrs: { classes, kv: attrs }
        } as MarkTransform])
      }
      break
    case ACTION_SET_INDEX_REF.name:
      {
        const { indexName } = (props || {}) as SetIndexRefActionProps
        return setIndexRefCommand(indexName)
      }
      break
    case ACTION_INSERT_RAW_INLINE.name:
      {
        const { format, where, content } = (props || {}) as InsertRawInlineActionProps
        const isSingleAfter = where === 'after' && isString(content)
        return insertRawInlineCommand(format, isSingleAfter ? ['', content] : content)
      }
      break
    case ACTION_DELETE_CSS_SELECTED.name:
      return deleteCssSelectedCommand;
    case ACTION_UNWRAP_CSS_SELECTED.name:
      return unwrapCssSelectedCommand;
    case ACTION_ADD_CUSTOM_CLASS.name:
    case ACTION_REMOVE_CUSTOM_CLASS.name:
    case ACTION_ADD_CLASS.name:
    case ACTION_REMOVE_CLASS.name:
    default:
      // pass-through command
      return () => true
  }
}

const applyActions: (actions: ActionNameWithProps[]) => Command =
  (actions: ActionNameWithProps[]) => {
    const commands = actions.map(a => actionNameWithPropsToCommand(a))
    return (state, dispatch, view) => {
      return commands.every(cmd => cmd(state, dispatch, view))
    }
  }
