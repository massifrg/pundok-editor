export type MathType = 'DisplayMath' | 'InlineMath'

const MATH_TYPES_CLASS_MAP: [kebab: string, pandoc: MathType][] = [
  ['display-math', 'DisplayMath'],
  ['inline-math', 'InlineMath'],
];
export const PANDOC_MATH_TYPES = MATH_TYPES_CLASS_MAP.map(t => t[1]);
export const PANDOC_DEFAULT_MATH_TYPE = PANDOC_MATH_TYPES[0];

export function domToMathType(e: HTMLElement): MathType {
  const classes = Array.from(e.classList);
  const found = MATH_TYPES_CLASS_MAP.find(mtc => classes.includes(mtc[0]));
  return found ? found[1] : PANDOC_DEFAULT_MATH_TYPE;
}

export function mathTypeToHtmlAttributes(mathType: MathType) {
  const found = MATH_TYPES_CLASS_MAP.find(mtc => mtc[1] === mathType);
  return found ? { class: found[0] } : {};
}

export function nextMathType(mathType: MathType) {
  const index = PANDOC_MATH_TYPES.findIndex(t => t === mathType)
  return PANDOC_MATH_TYPES[(index + 1) % PANDOC_MATH_TYPES.length]
}