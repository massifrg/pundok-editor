export type PundokBookmarkType = 'document' | 'project';

export interface DocumentBookmark {
  type: 'document';
  id?: string;
  path: string;
  configurationName?: string;
}

export interface ProjectBookmark {
  type: 'project';
  name: string;
  path: string;
}

/**
 * A document or a project recently opened.
 */
export type PundokBookmark = DocumentBookmark | ProjectBookmark;
