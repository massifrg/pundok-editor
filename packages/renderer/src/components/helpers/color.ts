function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: string): number | undefined {
  const hex = color.replace(/^#/, '');
  const normalized = hex.length === 3
    ? hex.split('').map(channel => channel + channel).join('')
    : hex;

  if (!/^[\da-f]{6}$/i.test(normalized)) return undefined;

  const red = srgbToLinear(parseInt(normalized.slice(0, 2), 16));
  const green = srgbToLinear(parseInt(normalized.slice(2, 4), 16));
  const blue = srgbToLinear(parseInt(normalized.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastingColor(color: string): string {
  const luminance = relativeLuminance(color);
  if (luminance === undefined) return 'black';
  return luminance > 0.179 ? 'black' : 'white';
}
