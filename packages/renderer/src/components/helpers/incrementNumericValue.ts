const KNOWN_UNITS = ["mm", "pt", "%"]

function incrementValue(
  value: string,
  decimals_part: string,
  sign: 1 | -1,
  increment?: number
): string {
  const numeric_value = parseFloat(value)
  let inc = 1
  let decimals = decimals_part ? decimals_part.length - 1 : 0
  if (increment)
    inc = increment
  else
    for (let i = decimals; i > 0; i--) inc /= 10;
  return (numeric_value + sign * inc).toFixed(decimals)
}

export function nudgeNumericValue(s: string, sign: 1 | -1, increment?: number, units?: string[]) {
  let modified = s.replace(/^[+-]?\d+([.]\d+)?$/, (v, dec) => incrementValue(v, dec, sign, increment))
  if (s === modified) {
    const units_re = (units || KNOWN_UNITS).join('|')
    const regex = "([+-]?\\d+([.]\\d+)?)(" + units_re + ")\\b"
    modified = s.replace(new RegExp(regex), (match, v, dec, unit) => {
      const incremented = incrementValue(v, dec, sign, increment)
      return incremented ? incremented + unit : match
    })
  }
  return s != modified ? modified : undefined
}

export function nudgeNumericValueAtIndex(
  s: string,
  index: number,
  sign: 1 | -1,
  increment?: number
): { start: number, end: number, value: string } | undefined {
  let start = -1
  let end = -1
  let modified: string | undefined = undefined
  s.replace(/\b[+-]?\d+([.]\d+\b)?/g, (v, dec, i) => {
    const current_end = i + v.length
    if (!modified && index >= i && index <= current_end) {
      modified = incrementValue(v, dec, sign, increment)
      start = i
      end = current_end
    }
    return v
  })
  return s != modified ? { start, end, value: modified! } : undefined
}

export const incrementNumericValue = (
  s: string,
  increment?: number,
  units?: string[],
) => nudgeNumericValue(s, 1, increment, units)

export const decrementNumericValue = (
  s: string,
  decrement?: number,
  units?: string[],
) => nudgeNumericValue(s, -1, decrement, units)
