export type Folder = {
  name: string
}

export type Document = {
  name: string
}

export interface FolderContents {
  folders: Folder[],
  documents: Document[],
  separator: string,
}