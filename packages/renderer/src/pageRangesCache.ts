import type {
  ProjectComponent,
  RenderingBookmark,
} from './common';
import {
  pageRangesFromSynctex,
  withPageRangesFromSynctex,
} from './common';

type PageRange = [start: number, end: number];

interface PageRangesCacheEntry {
  timestamp: number;
  synctexFile: string;
  projectPath: string;
  output: string;
  structure: ProjectComponent;
  sourceRanges: Map<string, PageRange[]>;
}

const pageRangesCache = new Map<string, PageRangesCacheEntry>();

export async function pageRangesForRendering(
  rendering: RenderingBookmark,
  synctexFile: string,
  structure: ProjectComponent,
  projectPath: string,
  listSynctexFile: (path: string) => Promise<string>,
): Promise<{
  structure: ProjectComponent;
  pageRangesForSource: (source: string) => PageRange[];
}> {
  if (typeof rendering.timestamp !== 'number') {
    const output = await listSynctexFile(synctexFile);
    return createPageRangesResult(output, structure, projectPath);
  }

  const cached = pageRangesCache.get(rendering.url);
  if (
    cached &&
    cached.timestamp === rendering.timestamp &&
    cached.synctexFile === synctexFile &&
    cached.projectPath === projectPath
  )
    return createPageRangesResult(
      undefined,
      cached.structure,
      projectPath,
      cached,
    );

  const output = await listSynctexFile(synctexFile);
  const entry: PageRangesCacheEntry = {
    timestamp: rendering.timestamp,
    synctexFile,
    projectPath,
    output,
    structure: withPageRangesFromSynctex(structure, output, projectPath),
    sourceRanges: new Map(),
  };
  pageRangesCache.set(rendering.url, entry);
  return createPageRangesResult(
    undefined,
    entry.structure,
    projectPath,
    entry,
  );
}

function createPageRangesResult(
  output: string | undefined,
  structure: ProjectComponent,
  projectPath: string,
  cache?: PageRangesCacheEntry,
): {
  structure: ProjectComponent;
  pageRangesForSource: (source: string) => PageRange[];
} {
  const sourceRanges = cache?.sourceRanges || new Map<string, PageRange[]>();
  const synctexOutput = cache?.output || output;
  const rangedStructure = cache?.structure || (
    synctexOutput
      ? withPageRangesFromSynctex(structure, synctexOutput, projectPath)
      : structure
  );
  return {
    structure: rangedStructure,
    pageRangesForSource: (source: string) => {
      const cachedRanges = sourceRanges.get(source);
      if (cachedRanges) return cachedRanges;
      if (!synctexOutput)
        return [];
      const ranges = pageRangesFromSynctex(synctexOutput, source, projectPath);
      sourceRanges.set(source, ranges);
      return ranges;
    },
  };
}
