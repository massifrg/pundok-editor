import { splitFolderAndDoc } from "./folders";

export type PundokBookmarkType = 'document' | 'project';

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

/**
 * A document or a project recently opened.
 */
export type PundokBookmark = DocumentBookmark | ProjectBookmark;

interface BookmarkLabel {
  label: string,
  sublabel: string,
  tooltip: string,
}

export function bookmarkLabel(b: PundokBookmark): BookmarkLabel {
  const { type, url } = b
  const isProject = type === 'project'
  const { name } = b as ProjectBookmark
  const { id, configurationName } = b as DocumentBookmark
  const path = url?.replace(/^file:\/\//, '')
  const { document } = splitFolderAndDoc(path)
  const suffix = configurationName && ` [${configurationName}]` || ''
  const label = isProject ? name : (id || document || path) + suffix
  const sublabel = path
  const tooltip = url
  return { label, sublabel, tooltip }
}