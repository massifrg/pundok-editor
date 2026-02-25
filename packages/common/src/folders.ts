export type Folder = {
  // baseUrl: string,
  name: string
}

export type Document = {
  name: string
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
  const folder = path.replace(/^file:\/\//, '').replaceAll('\\', '/').split('/')
  const document = folder.pop()
  return {
    folder: folder.join('/'),
    document
  }
}
