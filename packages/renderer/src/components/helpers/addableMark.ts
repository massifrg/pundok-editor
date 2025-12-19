import { Mark, Schema } from '@tiptap/pm/model';
import {
  CustomStyleInstance,
  SearchAndReplaceMark,
  CustomSpan,
} from '../../common';
import { iconFor, SearchMarkSpec } from '../../schema';

export interface AddableMark {
  name: string;
  title: string;
  icon?: string;
  label?: string;
  kind: 'base' | 'style' | 'span';
  markspec: SearchMarkSpec;
}

const BASE_ADDABLE_MARKS: Partial<AddableMark>[] = [
  { name: 'emph', title: 'Emph', icon: 'mdi-format-italic' },
  { name: 'strong', title: 'Strong', icon: 'mdi-format-bold' },
  { name: 'underline', title: 'Underline', icon: 'mdi-format-underline' },
  { name: 'strikeout', title: 'Strikeout', icon: 'mdi-format-strikethrough' },
  { name: 'superscript', title: 'Superscript', icon: 'mdi-format-superscript' },
  { name: 'subscript', title: 'Subscript', icon: 'mdi-format-subscript' },
  { name: 'smallcaps', title: 'SmallCaps', label: 'K' },
  { name: 'singleQuoted', title: 'Quoted(Single)', label: '‘a’' },
  { name: 'doubleQuoted', title: 'Quoted(Double)', label: '“a”' },
];

export function baseAddableMarks(
  actives?: string[],
  acc?: AddableMark[],
): AddableMark[] {
  const result = acc || [];
  BASE_ADDABLE_MARKS.forEach((bam) => {
    const { name, title, icon, label } = bam;
    result.push({
      kind: 'base',
      name: name as SearchAndReplaceMark,
      title: title || (name as string),
      icon: name && iconFor(name) || icon,
      label: label,
      markspec: { typeName: bam.name! },
    });
  });
  return result;
}

export function customStylesToAddableMarks(
  styles: CustomStyleInstance[],
  actives?: string[],
  acc?: AddableMark[],
): AddableMark[] {
  const result = acc || [];
  styles
    .filter((s) => s.element === 'span')
    .forEach((s) => {
      const { name, description } = s.styleDef;
      result.push({
        kind: 'style',
        name: name,
        title: description || `custom style "${name}"`,
        label: name,
        markspec: {
          typeName: 'span',
          attrs: {
            customStyle: name,
            kv: { 'custom-style': name },
          },
        },
      });
    });
  return result;
}

export function customSpanToAddableMarks(
  spans: CustomSpan[],
  actives?: string[],
  acc?: AddableMark[],
): AddableMark[] {
  const result = acc || [];
  spans.forEach((s) => {
    const { name, description, icon, classes, kv } = s;
    result.push({
      kind: 'span',
      name: name,
      title: description || `"${name}" span`,
      label: name,
      icon,
      markspec: {
        typeName: 'span',
        attrs: {
          classes,
          kv,
        },
      },
    });
  });
  return result;
}

export function addableMarkToMark(schema: Schema, am: AddableMark): Mark | undefined {
  const { typeName, attrs } = am.markspec
  const markType = schema.marks[typeName]
  return markType && markType.create(attrs)
}