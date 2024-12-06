import { readFile, writeFile } from 'fs/promises';
import { sep as pathSeparator } from 'path';
import { userAppDataDir } from './resourcesManager';
import { DocBookmark, DocBookmarkType } from './common';

export const BOOKMARKS_FILENAME = 'bookmarks.json';
export const MAX_RECENT_DOCS = 20;
export const MAX_RECENT_PROJECTS = 10;

async function readBookmarksFile(): Promise<DocBookmark[]> {
  try {
    const buf = await readFile(
      `${userAppDataDir()}${pathSeparator}${BOOKMARKS_FILENAME}`,
    );
    return JSON.parse(buf.toString()) as DocBookmark[];
  } catch (err) {
    return Promise.resolve([]);
  }
}

async function saveBookmarksFile(bookmarks: DocBookmark[]): Promise<boolean> {
  try {
    await writeFile(
      `${userAppDataDir()}${pathSeparator}${BOOKMARKS_FILENAME}`,
      JSON.stringify(bookmarks),
    );
    return true;
  } catch (err) {
    console.log(err);
    return Promise.resolve(false);
  }
}

function sameBookmark(b1: DocBookmark, b2: DocBookmark): boolean {
  return !(b1.type !== b2.type || (b1.path && b1.path !== b2.path));
}

function updateBookmarks(
  bookmarks: DocBookmark[],
  bookmark: DocBookmark,
): DocBookmark[] {
  const index = bookmarks.findIndex((b) => sameBookmark(b, bookmark));
  let docs = MAX_RECENT_DOCS - (bookmark.type === 'document' ? 1 : 0);
  let projects = MAX_RECENT_PROJECTS - (bookmark.type === 'project' ? 1 : 0);
  return index === 0
    ? bookmarks
    : [
        bookmark,
        ...bookmarks.filter((b, i) => {
          if (i === index) return false;
          if (b.type === 'document') {
            docs--;
            return docs >= 0;
          } else if (b.type === 'project') {
            projects--;
            return projects >= 0;
          }
          return true;
        }),
      ];
}

/**
 * Update the bookmarks file.
 * @param bookmark the bookmark to be added as most recent.
 * @returns `true` if the operation succeeds
 */
export async function updateBookmarksFile(
  newBookmarks: DocBookmark[],
): Promise<boolean> {
  let bookmarks = await readBookmarksFile();
  newBookmarks.forEach((bookmark) => {
    bookmarks = updateBookmarks(bookmarks, bookmark);
  });
  return saveBookmarksFile(bookmarks);
}

/**
 * Get bookmarks (recent documents and projects).
 * @param type get only the bookmarks of this type.
 * @returns
 */
export async function getBookmarks(
  type?: DocBookmarkType,
): Promise<DocBookmark[]> {
  const bookmarks = await readBookmarksFile();
  return type ? bookmarks.filter((b) => b.type === type) : bookmarks;
}
