import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { userAppDataDir } from './resourcesManager';
import { PundokBookmark, PundokBookmarkType } from './common';

export const BOOKMARKS_FILENAME = 'bookmarks.json';
export const MAX_RECENT_DOCS = 20;
export const MAX_RECENT_PROJECTS = 10;

async function readBookmarksFile(): Promise<PundokBookmark[]> {
  try {
    const buf = await readFile(resolve(userAppDataDir(), BOOKMARKS_FILENAME));
    const bm = JSON.parse(buf.toString()) as (PundokBookmark & { path?: string })[];
    // fix older bookmarks with path
    return bm.map(b => {
      return b.path && !b.url
        ? { ...b, url: `file://${encodeURIComponent(b.path)}`, path: undefined }
        : b
    })
  } catch (err) {
    return Promise.resolve([]);
  }
}

async function saveBookmarksFile(bookmarks: PundokBookmark[]): Promise<boolean> {
  try {
    await writeFile(resolve(userAppDataDir(), BOOKMARKS_FILENAME), JSON.stringify(bookmarks));
    return true;
  } catch (err) {
    console.log(err);
    return Promise.resolve(false);
  }
}

function sameBookmark(b1: PundokBookmark, b2: PundokBookmark): boolean {
  return !(b1.type !== b2.type || (b1.url && decodeURIComponent(b1.url) !== decodeURIComponent(b2.url)));
}

function updateBookmarks(
  bookmarks: PundokBookmark[],
  bookmark: PundokBookmark,
): PundokBookmark[] {
  const index = bookmarks.findIndex((b) => sameBookmark(b, bookmark));
  let docs = MAX_RECENT_DOCS - (bookmark.type === 'document' ? 1 : 0);
  let projects = MAX_RECENT_PROJECTS - (bookmark.type === 'project' ? 1 : 0);
  return [
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
  newBookmarks: PundokBookmark[],
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
  type?: PundokBookmarkType,
): Promise<PundokBookmark[]> {
  const bookmarks = await readBookmarksFile();
  return type ? bookmarks.filter((b) => b.type === type) : bookmarks;
}
