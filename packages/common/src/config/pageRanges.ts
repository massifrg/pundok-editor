import type { ProjectComponent } from './project';

/**
 * Returns the ordered inclusive PDF page ranges where a source is referenced
 * in SyncTeX output.
 */
export function pageRangesFromSynctex(
  output: string,
  source: string,
  projectPath?: string,
): [start: number, end: number][] {
  const pages = new Set<number>();
  let page: number | undefined;
  const sourceVariants = projectSourceVariants(source, projectPath);
  for (const line of output.split(/[\r\n]+/)) {
    const pageMatch = /begin page:\s*(\d+)/.exec(line);
    if (pageMatch) {
      page = Number.parseInt(pageMatch[1], 10);
      continue;
    }
    if (page === undefined) continue;
    const sourceMatch = /\]\s*:\s*\d+\s*:\s*(.*?)\s*$/.exec(line);
    if (!sourceMatch) continue;
    if (sourceVariants.has(normalizeProjectSource(sourceMatch[1], projectPath)))
      pages.add(page);
  }

  const orderedPages = [...pages].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const current of orderedPages) {
    const previous = ranges[ranges.length - 1];
    if (previous && current <= previous[1] + 1) previous[1] = current;
    else ranges.push([current, current]);
  }
  return ranges;
}

/**
 * Adds SyncTeX page ranges to a project component and its descendants.
 */
export function withPageRangesFromSynctex(
  component: ProjectComponent,
  output: string,
  projectPath?: string,
): ProjectComponent {
  const pageRanges = component.src
    ? pageRangesFromSynctex(output, component.src, projectPath)
    : [];
  const children = component.children?.map((child) =>
    withPageRangesFromSynctex(child, output, projectPath),
  );
  return {
    ...component,
    ...(pageRanges.length > 0 ? { pageRanges } : {}),
    ...(children ? { children } : {}),
  };
}

function projectSourceVariants(source: string, projectPath?: string): Set<string> {
  const normalized = normalizeProjectSource(source, projectPath);
  const variants = new Set([normalized]);
  const project = projectPath && normalizeProjectSource(projectPath);
  if (project && normalized.startsWith(`${project}/`))
    variants.add(normalized.slice(project.length + 1));
  return variants;
}

function normalizeProjectSource(source: string, projectPath?: string): string {
  let normalized = source
    .trim()
    .replace(/^file:\/\//, '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+$/, '');
  const project = projectPath
    ?.replace(/^file:\/\//, '')
    .replaceAll('\\', '/')
    .replace(/\/+$/, '');
  if (project && normalized.startsWith(`${project}/`))
    normalized = normalized.slice(project.length + 1);
  return normalized;
}
