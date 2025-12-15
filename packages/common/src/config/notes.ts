export const DEFAULT_NOTE_TYPE = 'footnote';
export const DEFAULT_NOTE_TEXT_COLOR = 'black';
export const DEFAULT_NOTE_BACKGROUND_COLOR = 'white';
export const NOTE_TYPE_ATTRIBUTE = 'note-type'

export type MarkerConversion =
  | 'noConversion'
  | 'lower-alpha'
  | 'upper-alpha'
  | 'lower-roman'
  | 'upper-roman'
  | 'lower-greek'
  | 'upper-greek'

export interface NoteStyle {
  /** The note type, e.g. footnote, endnote, ... */
  noteType: string;
  /** This is the default note type, if true. */
  default?: boolean;
  /** How to convert the note number. */
  markerConversion?: MarkerConversion | string[];
  /** A text before the note marker, e.g. "(", "[" */
  markerBefore?: string;
  /** A text after the note marker, e.g. ")", "]" */
  markerAfter?: string;
  /** The background color of the note in the editor. */
  backgroundColor?: string;
  /** The foreground color of the note in the editor. */
  textColor?: string;
}
