import {
  projectSourceVariants,
  type ProjectComponent,
} from './project';

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
    const listedSourceVariants = projectSourceVariants(
      sourceMatch[1],
      projectPath,
    );
    if ([...sourceVariants].some((source) => listedSourceVariants.has(source)))
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

/**
 * Finds a project component by source, accepting project-relative and
 * absolute source paths.
 */
export function projectComponentForSource(
  structure: ProjectComponent,
  source: string,
  projectPath?: string,
): ProjectComponent | undefined {
  const sourceVariants = projectSourceVariants(source, projectPath);
  const find = (component: ProjectComponent): ProjectComponent | undefined => {
    if (
      component.src &&
      [...sourceVariants].some((variant) =>
        projectSourceVariants(component.src!, projectPath).has(variant),
      )
    )
      return component;
    for (const child of component.children || []) {
      const found = find(child);
      if (found) return found;
    }
    return undefined;
  };
  return find(structure);
}

/**
 * Returns the widest page range from an ordered list of page ranges.
 */
export function widestPageRangeFromRanges(
  pageRanges: [number, number][],
): [number, number] | undefined {
  return pageRanges.reduce<[number, number] | undefined>(
    (widest, current) =>
      !widest || current[1] - current[0] > widest[1] - widest[0]
        ? current
        : widest,
    undefined,
  );
}
