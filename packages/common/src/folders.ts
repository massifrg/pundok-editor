import { documentPathBaseName, documentPathDirName, normalizeDocumentPath } from './documentPath';

export type Folder = {
  // baseUrl: string,
  name: string
}

export type Document = {
  name: string,
  size?: number,
  /** Modification time in milliseconds since the Unix epoch. */
  lastModified?: number,
}

export type Place = {
  name: string,
  href: string,
  type: 'disk' | 'known' | 'user'
}

export interface FolderContents {
  baseUrl: string,
  folders: Folder[],
  documents: Document[],
  places: Place[],
  // separator: string,
  platform?: string,
}

export function splitFolderAndDoc(path: string) {
  const normalized = normalizeDocumentPath(path)
  return {
    folder: documentPathDirName(normalized),
    document: documentPathBaseName(normalized)
  }
}
