import { NodeWithPos } from "@tiptap/core";

export const META_REFRESH_NOTES = 'refresh-notes';

export interface CachedNote extends NodeWithPos {
  noteTypeIndex: number;
  noteNumber: number;
}
