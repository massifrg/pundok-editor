import { isArray, isString } from 'lodash';
import { visibleAttrsForNodeOrMark } from './attributes';
import { LabeledNodeOrMark } from './selection';
import { Mark, Node } from '@tiptap/pm/model';
import { PmColSpec, colSpecToCompactString } from './colSpec';

export const TOOLTIP_CLASSES: Record<string, string> = {
  nodeName: 'tt-node-name',
  markName: 'tt-mark-name',
  markedText: 'tt-marked-text',
  attrNamePrefix: 'tt-attr-name-',
  attrName: 'tt-attr-name',
  attrNameId: 'tt-attr-id',
  attrNameClasses: 'tt-attr-classes',
  attrNameKv: 'tt-attr-kv',
  attrValue: 'tt-attr-value',
  attrValueStart: 'tt-attr-value-start',
  attrValueNumDelim: 'tt-attr-value-num-delim',
  attrValueNumStyle: 'tt-attr-value-num-style',
  kvName: 'tt-kv-name',
  kvValue: 'tt-kv-value',
};
const TC = TOOLTIP_CLASSES;

export function tooltipFor(
  labeled: LabeledNodeOrMark,
  doc?: Node,
  classes?: string[]
): string | undefined {
  let lines = attributesToHtml(labeled.node || labeled.mark, classes);
  if (labeled.mark) {
    const { from, to } = labeled;
    const markedText = doc && doc.textBetween(from, to);
    const markedHtml =
      (markedText &&
        ` on <span class="${TC.markedText}">${markedText}</span>`) ||
      '';
    if (markedHtml)
      lines.unshift(
        `<span class="${TC.markName}">${labeled.label}</span>${markedHtml}`
      );
  } else if (labeled.node) {
    lines.unshift(`<span class="${TC.nodeName}">${labeled.label}</span>`);
  }
  return lines.length > 0 ? lines.join('<br />') : undefined;
}

function attrNameToHtml(name: string, classes: string[]) {
  if (name && name.trim().length > 0) {
    let classAttr = [...classes, TC.attrNamePrefix + name].join(' ');
    if (classAttr.length > 0) classAttr = ` class="${classAttr}"`;
    return `<span${classAttr}>${name}</span>`;
  }
  return undefined;
}

function attrValueToHtml(value: string, tag: string, classes: string[]) {
  if (value) {
    let classAttr = [...classes, TC.attrValue].join(' ');
    if (classAttr.length > 0) classAttr = ` class="${classAttr}"`;
    return `<${tag}${classAttr}>${value}</${tag}>`;
  }
  return undefined;
}

export function attributeToHtml(
  attrName: string,
  value: any,
  classes?: string[]
): string | undefined {
  const emptyValue =
    value === undefined ||
    value === null ||
    (isArray(value) && value.length === 0);
  let name: string = attrName;
  let htmlClasses: string[] = [TC.attrName, `${TC.attrNamePrefix}${attrName}`];
  let htmlValue: string | undefined = undefined;
  if (attrName && value) {
    switch (attrName) {
      case 'id':
        htmlClasses.push(TC.attrNameId);
        htmlValue = attrValueToHtml(value, 'span', [TC.attrValueId]);
        break;
      case 'classes':
        htmlClasses.push(TC.attrNameClasses);
        htmlValue = emptyValue
          ? undefined
          : attrValueToHtml(
              (value as string[]).map((c) => `"${c}"`).join(', '),
              'span',
              [TC.attrValueClasses]
            );
        break;
      case 'kv':
        if (Object.keys(value).length === 0) return undefined;
        name = 'attributes';
        htmlClasses.push(TC.attrNameKv);
        htmlValue = Object.entries(value)
          .map(
            ([k, v]) =>
              `<br />\n– <span class="${TC.kvName}">${k}</span>: <span class="${TC.kvValue}">${v}</span>`
          )
          .join('');
        break;
      case 'colSpec':
        htmlClasses.push('col-spec');
        htmlValue = (value as PmColSpec[])
          .map((cs) => colSpecToCompactString(cs))
          .join(', ');
        break;
      case 'colwidth':
        htmlValue = attrValueToHtml(
          !value || value == 0 ? 'ColWidthDefault' : value,
          'span',
          ['colwidth-value']
        );
        break;
      case 'start':
        htmlValue = attrValueToHtml(value || 1, 'span', [TC.attrValueStart]);
        break;
      case 'numberStyle':
        htmlValue = attrValueToHtml(value || 'DefaultStyle', 'span', [
          TC.attrValueNumStyle,
        ]);
        break;
      case 'numberDelim':
        htmlValue = attrValueToHtml(value || 'DefaultDelim', 'span', [
          TC.attrValueNumDelim,
        ]);
        break;
      default:
        htmlValue = emptyValue ? undefined : attrValueToHtml(value, 'span', []);
        break;
    }
  }
  const htmlName = attrNameToHtml(name, htmlClasses);
  const ret = htmlName && htmlValue ? `${htmlName}: ${htmlValue}` : undefined;
  return ret;
}

export function attributesToHtml(
  nom: Node | Mark | undefined,
  classes?: string[]
): string[] {
  const attrNames = visibleAttrsForNodeOrMark(nom);
  if (attrNames) {
    // filter kv
    let filtered_kv: Record<string, string> | undefined = undefined;
    if (attrNames.indexOf('kv') >= 0) {
      filtered_kv = { ...nom?.attrs.kv };
      Object.keys(filtered_kv!).forEach((k) => {
        const camel = k.replace(/-([a-z])/g, (m, first) => first.toUpperCase());
        if (attrNames.indexOf(camel) >= 0) delete filtered_kv![k];
      });
    }
    return attrNames
      .map((an) =>
        attributeToHtml(
          an,
          an === 'kv' && filtered_kv ? filtered_kv : nom?.attrs[an],
          classes
        )
      )
      .filter((s) => isString(s)) as string[];
  }
  return [];
}
