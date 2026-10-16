import {
  getBookmarks as getBackendBookmarks,
  updateBookmarks as updateBackendBookmarks,
} from './backend';
import { backendDirectories } from './resourcesManager';
import { PundokBookmark, PundokBookmarkType } from './common';

export async function updateBookmarksFile(
  newBookmarks: PundokBookmark[],
): Promise<boolean> {
  return updateBackendBookmarks(backendDirectories(), newBookmarks);
}

export async function getBookmarks(
  type?: PundokBookmarkType,
): Promise<PundokBookmark[]> {
  return getBackendBookmarks(backendDirectories(), type);
}
