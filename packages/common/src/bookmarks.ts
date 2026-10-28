import { splitFolderAndDoc } from "./folders";

export type PundokBookmarkType = 'document' | 'project' | 'rendering';

export interface DocumentBookmark {
  type: 'document';
  id?: string;
  url: string;
  configurationName?: string;
}

export interface ProjectBookmark {
  type: 'project';
  name: string;
  url: string;
}

export interface RenderingBookmark {
  type: 'rendering';
  url: string;
  documentPath: string;
  converterName: string;
  configurationName?: string;
  pageBookmarks?: RenderingPageBookmark[];
}

export interface RenderingPageBookmark {
  label: string;
  page: number;
  magnify: number;
  scrollTopPerc: number;
  scrollLeftPerc: number;
  twoPageSpread?: boolean;
  firstPageOnRight?: boolean;
}

/**
 * A document, project, or rendering recently opened.
 */
export type PundokBookmark =
  | DocumentBookmark
  | ProjectBookmark
  | RenderingBookmark;

interface BookmarkLabel {
  label: string,
  sublabel: string,
  tooltip: string,
}

export function bookmarkLabel(b: PundokBookmark): BookmarkLabel {
  const { type, url } = b
  if (type === 'rendering') {
    const path = url && decodeURIComponent(url.replace(/^file:\/\//, '')) || ''
    return {
      label: b.converterName,
      sublabel: path,
      tooltip: url,
    }
  }
  const isProject = type === 'project'
  const { name } = b as ProjectBookmark
  const { id, configurationName } = b as DocumentBookmark
  const path = url && decodeURIComponent(url.replace(/^file:\/\//, '')) || ''
  const { document } = splitFolderAndDoc(path)
  const suffix = configurationName && ` [${configurationName}]` || ''
  const label = isProject ? name : (id || document || path) + suffix
  const sublabel = path
  const tooltip = url
  return { label, sublabel, tooltip }
}