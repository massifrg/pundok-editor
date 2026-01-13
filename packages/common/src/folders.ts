export type Folder = {
  name: string
}

export type Document = {
  name: string
}

export type Place = {
  name: string,
  href: string,
}

export interface FolderContents {
  base: string[],
  folders: Folder[],
  documents: Document[],
  places: Place[],
  separator: string,
  platform?: string,
}