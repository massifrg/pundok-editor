export function extractSvgPathData(svg: string): string {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const pathData = Array.from(document.querySelectorAll('path[d]'))
    .map((pathElement) => pathElement.getAttribute('d')?.trim())
    .filter((value): value is string => !!value)
    .join(' ');
  if (document.querySelector('parsererror') || !pathData) {
    throw new Error('The SVG does not contain a path with a d attribute.');
  }
  return pathData;
}
