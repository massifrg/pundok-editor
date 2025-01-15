import { Fragment, Node as PmNode, Schema, Slice } from '@tiptap/pm/model';
import { Command, Transaction } from '@tiptap/pm/state';
import { textNode } from '../schema';

interface TextTransformState {
  wordBoundaryLeft?: boolean;
}

type TextTransform = (t: string, state?: TextTransformState) => string;

function lowerCaseTransform(locales?: string | string[]): TextTransform {
  return (t) => t.toLocaleLowerCase(locales);
}

function upperCaseTransform(locales?: string | string[]): TextTransform {
  return (t) => t.toLocaleUpperCase(locales);
}

function upperCaseFirstTransform(locales?: string | string[]): TextTransform {
  return (t, state) => {
    if (t.length === 0) {
      state = { wordBoundaryLeft: true };
      return '';
    }
    const pattern = state?.wordBoundaryLeft
      ? /(\P{L}|^)(\p{L})(\p{L}*)/gu
      : /(\P{L})(\p{L})(\p{L}*)/gu;
    const regex = new RegExp(pattern);
    let result = t.replace(regex, (_, non_letter, letter, other_letters) => {
      return (
        non_letter +
        letter.toLocaleUpperCase(locales) +
        other_letters.toLocaleLowerCase(locales)
      );
    });
    if (state) state.wordBoundaryLeft = !!t.match(/\P{L}$/u);
    return result;
  };
}

type TextTransformTransaction = (
  tr: Transaction,
  schema: Schema,
  transform: TextTransform,
) => Transaction;

const textTrasformTransaction: TextTransformTransaction = (
  tr,
  schema,
  transform,
) => {
  const { empty, from, to } = tr.selection;
  if (empty) return tr;
  const { doc } = tr;
  const slice = doc.slice(from, to);
  const { content, openStart, openEnd } = slice;
  const nodes: PmNode[] = [];
  const state: Record<string, any> = {};
  let firstTextFound = false;
  for (let i = 0; i < content.childCount; i++) {
    const child = content.child(i);
    if (child && child.isText) {
      if (!firstTextFound) {
        state.wordBoundaryLeft = true;
        firstTextFound = true;
      }
      const node = textNode(schema, transform(child.text!, state), child.marks)
      if (node) nodes.push(node);
    } else nodes.push(child);
  }
  return tr.replace(
    from,
    to,
    new Slice(Fragment.from(nodes), openStart, openEnd),
  );
};

function textTransformCommand(transform: TextTransform): Command {
  return (state, dispatch) => {
    if (state.selection.empty) return false;
    if (dispatch)
      dispatch(textTrasformTransaction(state.tr, state.schema, transform));
    return true;
  };
}

export function lowerCaseTransaction(
  tr: Transaction,
  schema: Schema,
  locales?: string | string[],
): Transaction {
  return textTrasformTransaction(tr, schema, lowerCaseTransform(locales));
}

export function upperCaseTransaction(
  tr: Transaction,
  schema: Schema,
  locales?: string | string[],
): Transaction {
  return textTrasformTransaction(tr, schema, upperCaseTransform(locales));
}

export function upperCaseFirstTransaction(
  tr: Transaction,
  schema: Schema,
  locales?: string | string[],
): Transaction {
  return textTrasformTransaction(tr, schema, upperCaseFirstTransform(locales));
}

export const lowerCaseCommand: (locales?: string | string[]) => Command = (
  locales,
) => textTransformCommand(lowerCaseTransform(locales));

export const upperCaseCommand: (locales?: string | string[]) => Command = (
  locales,
) => textTransformCommand(upperCaseTransform(locales));

export const upperCaseFirstCommand: (locales?: string | string[]) => Command = (
  locales,
) => textTransformCommand(upperCaseFirstTransform(locales));
