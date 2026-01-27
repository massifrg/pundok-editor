export type Folder = {
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
  base: string[],
  folders: Folder[],
  documents: Document[],
  places: Place[],
  separator: string,
  platform?: string,
}