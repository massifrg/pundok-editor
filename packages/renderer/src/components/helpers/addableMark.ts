import { Mark, Schema } from '@tiptap/pm/model';
import {
  CustomStyleInstance,
  SearchAndReplaceMark,
  CustomSpan,
  SearchMarkSpec,
  PundokEditorConfig,
  PundokEditorConfigInit,
  customStylesFromDefs,
} from '../../common';
import { iconFor } from '../../schema';


export interface AddableMark {
  name: string;
  title: string;
  icon?: string;
  label?: string;
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
      markspec: { kind: 'base', typeName: bam.name! },
      name: name as SearchAndReplaceMark,
      title: title || (name as string),
      icon: name && iconFor(name) || icon,
      label: label,
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
        markspec: {
          kind: 'style',
          typeName: 'span',
          attrs: {
            customStyle: name,
            kv: { 'custom-style': name },
          },
        },
        name: name,
        title: description || `custom style "${name}"`,
        label: name,
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
      markspec: {
        kind: 'span',
        typeName: 'span',
        attrs: {
          classes,
          kv,
        },
      },
      name: name,
      title: description || `"${name}" span`,
      label: name,
      icon,
    });
  });
  return result;
}

export function addableMarkToMark(schema: Schema, am: AddableMark): Mark | undefined {
  const { typeName, attrs } = am.markspec
  const markType = schema.marks[typeName]
  return markType && markType.create(attrs)
}

export function searchMarkSpecToAddableMarks(
  markspecs: SearchMarkSpec[],
  schema: Schema,
  config?: PundokEditorConfig | PundokEditorConfigInit,
): AddableMark[] {
  const ams: AddableMark[] = []
  markspecs.forEach(markspec => {
    const { kind, typeName, attrs } = markspec
    let styles: CustomStyleInstance[] | undefined = undefined
    switch (kind) {
      case 'base':
        {
          const markType = schema.marks[typeName]
          const mark = markType && markType.create(attrs)
          const bam = BASE_ADDABLE_MARKS.find((bam) => bam.name === typeName)
          if (mark && bam) {
            const { name, title, icon, label } = bam;
            ams.push({
              markspec,
              name: name as SearchAndReplaceMark,
              title: title || (name as string),
              icon: name && iconFor(name) || icon,
              label: label,
            });
          }
        }
        break
      case 'style':
        {
          styles = styles !== undefined ? styles : customStylesFromDefs(config?.customStyles || [])
          const customStyle = attrs?.customStyle
          if (styles && customStyle) {
            const style = styles.find(s => s.styleDef.name === customStyle)
            if (style) {
              const { name, description } = style.styleDef;
              ams.push({
                markspec: {
                  kind: 'style',
                  typeName: 'span',
                  attrs: {
                    customStyle: name,
                    kv: { 'custom-style': name },
                  },
                },
                name: name,
                title: description || `custom style "${name}"`,
                label: name,
              });
            }
          }
        }
      case 'span':
        {
          // TODO: to be implemented in case of custom spans
        }
    }
  })
  return ams
}