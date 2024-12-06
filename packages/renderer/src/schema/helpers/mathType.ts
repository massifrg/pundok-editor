const MATH_TYPES_CLASS_MAP: [kebab: string, pandoc: string][] = [
  ['display-math', 'DisplayMath'],
  ['inline-math', 'InlineMath'],
];
export const PANDOC_MATH_TYPES = MATH_TYPES_CLASS_MAP.map( t => t[1]);
export const PANDOC_DEFAULT_MATH_TYPE = PANDOC_MATH_TYPES[0];

export function domToMathType(e: HTMLElement): string {
  const classes = Array.from(e.classList);
  const found = MATH_TYPES_CLASS_MAP.find(mtc => classes.includes(mtc[0]));
  return found ? found[1] : PANDOC_DEFAULT_MATH_TYPE;
}

export function mathTypeToHtmlAttributes(mathType: string) {
  const found = MATH_TYPES_CLASS_MAP.find(mtc => mtc[1] === mathType);
  return found ? { class: found[0] } : {};
}