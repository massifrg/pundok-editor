import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
    const normalizedBookmarks = bookmarks.map((bookmark) => {
      const url =
        bookmark.path && !bookmark.url
          ? normalizeBookmarkUrl(bookmark.path)
          : normalizeBookmarkUrl(bookmark.url);
      return { ...bookmark, url, path: undefined };
    });
    const seen = new Set<string>();
    return normalizedBookmarks.filter((bookmark) => {
      const key = `${bookmark.type}:${bookmark.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
  const normalizedBookmark = {
    ...bookmark,
    url: normalizeBookmarkUrl(bookmark.url),
  };
  let documents =
    MAX_RECENT_DOCS - (normalizedBookmark.type === 'document' ? 1 : 0);
  let projects =
    MAX_RECENT_PROJECTS - (normalizedBookmark.type === 'project' ? 1 : 0);
  return [
    normalizedBookmark,
    ...bookmarks.filter((current) => {
      if (
        current.type === normalizedBookmark.type &&
        current.url === normalizedBookmark.url
      )
        return false;
      if (current.type === 'document') return documents-- > 0;
      if (current.type === 'project') return projects-- > 0;
      return true;
    }),
  ];
}

function normalizeBookmarkUrl(url: string): string {
  if (isAbsolute(url)) return pathToFileURL(url).href;

  if (url.startsWith('file://')) {
    try {
      return pathToFileURL(fileURLToPath(url)).href;
    } catch {
      try {
        return pathToFileURL(decodeURIComponent(url.slice('file://'.length)))
          .href;
      } catch {
        return url;
      }
    }
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'file:'
      ? pathToFileURL(fileURLToPath(parsedUrl)).href
      : url;
  } catch {
    return pathToFileURL(resolve(url)).href;
  }
}
