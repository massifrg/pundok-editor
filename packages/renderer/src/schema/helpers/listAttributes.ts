import type { PandocJson } from '../../pandoc';

export interface PMListAttributes {
  start: number,
  numberStyle: string,
  numberDelim: string
}

const LIST_STYLES_MAP: [css: string | null, pandoc: string][] = [
  [null, 'DefaultStyle'],
  [null, 'Example'],
  ['decimal', 'Decimal'],
  ['lower-roman', 'LowerRoman'],
  ['upper-roman', 'UpperRoman'],
  ['lower-alpha', 'LowerAlpha'],
  ['upper-alpha', 'UpperAlpha'],
];

const LIST_DELIMS_MAP: [kebab: string, pandoc: string][] = [
  ['default-delim', 'DefaultDelim'],
  ['period', 'Period'],
  ['one-paren', 'OneParen'],
  ['two-parens', 'TwoParens'],
];

export const PANDOC_NUMBER_STYLES = LIST_STYLES_MAP.map(s => s[1]);
export const PANDOC_DEFAULT_NUMBER_STYLE = PANDOC_NUMBER_STYLES[0];
export const PANDOC_NUMBER_DELIMS = LIST_DELIMS_MAP.map(d => d[1]);
export const PANDOC_DEFAULT_NUMBER_DELIM = PANDOC_NUMBER_DELIMS[0];
const DELIM_CLASS_PREFIX = 'delim-';

export function listAttributesToPMAttrs(listattrs: [start: number, style: PandocJson, delim: PandocJson]): PMListAttributes {
  return {
    start: listattrs[0],
    numberStyle: listattrs[1].t,
    numberDelim: listattrs[2].t,
  };
}

export function pandocListAttributesAsPMAttrs() {
  return {
    start: {
      default: 1,
    },
    numberStyle: {
      default: PANDOC_DEFAULT_NUMBER_STYLE,
    },
    numberDelim: {
      default: PANDOC_DEFAULT_NUMBER_DELIM,
    },
  };
}

export function domToListNumberStyle(e: HTMLElement): string {
  const pandocStyle = LIST_STYLES_MAP.find(([css, pandoc]) => css === e.style.listStyleType);
  return (pandocStyle ? pandocStyle[1] : null) || PANDOC_DEFAULT_NUMBER_STYLE;
}

export function domToListNumberDelim(e: HTMLElement): string {
  const delims = Array.from(e.classList).filter(c => c.startsWith(DELIM_CLASS_PREFIX)).map(c => c.substring(DELIM_CLASS_PREFIX.length));
  const found = LIST_DELIMS_MAP.find(d => delims.includes(d[0]) || delims.includes(d[1]));
  return found ? found[1] : PANDOC_DEFAULT_NUMBER_DELIM;
}

export function pandocNumberDelimToHtmlClass(delim: string): string {
  const found = LIST_DELIMS_MAP.find(d => d[1] === delim) || LIST_DELIMS_MAP[0];
  return DELIM_CLASS_PREFIX + found[0];
}

export function pandocNumberStyleToHtmlStyle(style: string): Record<string, any> {
  const found = LIST_STYLES_MAP.find(([css, pandoc]) => pandoc === style);
  return found && found[0] ? { style: `list-style-type: ${found[0]}` } : {};
}

// start: {
//   default: 1,
//     parseHTML: element => {
//       return element.hasAttribute('start')
//         ? parseInt(element.getAttribute('start') || '', 10)
//         : 1
//     },
// },
// numberStyle: {
//   default: this.options.defaultNumberStyle || null,
//     parseHTML: element => {
//       const pandocStyle = LIST_STYLES_MAP.find(([css, pandoc]) => css === element.style.listStyleType)
//       return (pandocStyle ? pandocStyle[1] : null) || this.options.defaultNumberStyle
//     },
//       renderHTML(attributes) {
//     if (attributes.numberStyle) {
//       const ns = attributes.numberStyle
//       const found = LIST_STYLES_MAP.find(([css, pandoc]) => pandoc === ns)
//       const cssStyle = found && found[0]
//       return cssStyle ? { style: { 'list-style-type': cssStyle } } : {}
//     }
//   }
// },
// numberDelim: {
//   default: this.options.defaultDelim || null,
//     renderHTML(attributes) {
//     return attributes.numberDelim ? { class: `delim-${attributes.numberDelim}` } : {}
//   }
// }
// }