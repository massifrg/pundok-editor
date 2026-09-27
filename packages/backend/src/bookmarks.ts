import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PundokBookmark, PundokBookmarkType } from '../../common/src';
import type { BackendDirectories } from './resourceManager';

export const BOOKMARKS_FILENAME = 'bookmarks.json';
const MAX_RECENT_DOCS = 20;
const MAX_RECENT_PROJECTS = 10;

export async function getBookmarks(
  directories: BackendDirectories,
  type?: PundokBookmarkType,
): Promise<PundokBookmark[]> {
  const bookmarks = await readBookmarks(directories);
  return type
    ? bookmarks.filter((bookmark) => bookmark.type === type)
    : bookmarks;
}

export async function updateBookmarks(
  directories: BackendDirectories,
  newBookmarks: PundokBookmark[],
): Promise<boolean> {
  let bookmarks = await readBookmarks(directories);
  for (const bookmark of newBookmarks)
    bookmarks = addBookmark(bookmarks, bookmark);
  try {
    await writeFile(bookmarkFilename(directories), JSON.stringify(bookmarks));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function readBookmarks(
  directories: BackendDirectories,
): Promise<PundokBookmark[]> {
  try {
    const bookmarks = JSON.parse(
      await readFile(bookmarkFilename(directories), 'utf8'),
    ) as (PundokBookmark & { path?: string })[];
    return bookmarks.map((bookmark) =>
      bookmark.path && !bookmark.url
        ? {
            ...bookmark,
            url: `file://${encodeURIComponent(bookmark.path)}`,
            path: undefined,
          }
        : bookmark,
    );
  } catch {
    return [];
  }
}

function bookmarkFilename(directories: BackendDirectories): string {
  return resolve(directories.userDataDir, BOOKMARKS_FILENAME);
}

function addBookmark(
  bookmarks: PundokBookmark[],
  bookmark: PundokBookmark,
): PundokBookmark[] {
  const existingIndex = bookmarks.findIndex(
    (current) =>
      current.type === bookmark.type &&
      (!current.url ||
        !bookmark.url ||
        decodeURIComponent(current.url) === decodeURIComponent(bookmark.url)),
  );
  let documents = MAX_RECENT_DOCS - (bookmark.type === 'document' ? 1 : 0);
  let projects = MAX_RECENT_PROJECTS - (bookmark.type === 'project' ? 1 : 0);
  return [
    bookmark,
    ...bookmarks.filter((current, index) => {
      if (index === existingIndex) return false;
      if (current.type === 'document') return documents-- > 0;
      if (current.type === 'project') return projects-- > 0;
      return true;
    }),
  ];
}
