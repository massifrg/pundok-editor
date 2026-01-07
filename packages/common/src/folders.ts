export type Folder = {
  name: string
}

export type Document = {
  name: string
}

export interface FolderContents {
  base: string[],
  folders: Folder[],
  documents: Document[],
  separator: string,
}