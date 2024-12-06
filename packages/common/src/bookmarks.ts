export type DocBookmarkType = 'document' | 'project';

interface FileBookmark {
  type: 'document';
  id?: string;
  path: string;
  configurationName?: string;
}

interface ProjectBookmark {
  type: 'project';
  name: string;
  path: string;
}

/**
 * A document or a project recently opened.
 */
export type DocBookmark = FileBookmark | ProjectBookmark;
