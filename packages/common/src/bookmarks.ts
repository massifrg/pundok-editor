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
