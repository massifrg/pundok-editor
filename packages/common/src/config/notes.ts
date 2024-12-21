export const DEFAULT_NOTE_TYPE = 'footnote';
export const DEFAULT_NOTE_TEXT_COLOR = 'black';
export const DEFAULT_NOTE_BACKGROUND_COLOR = 'white';
export const NOTE_TYPE_ATTRIBUTE = 'note-type'

export interface NoteStyle {
  noteType: string;
  default?: boolean;
  markerConversion?: string | string[];
  markerBefore?: string;
  markerAfter?: string;
  backgroundColor?: string;
  textColor?: string;
}
