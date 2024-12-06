import { EditorKeyType } from '../common';

export type ViewActionType = 'notes';

/**
 * View actions are a way to broadcast an event to all the node views of the same kind.
 * Their first use was to make all the footnotes views to close.
 */
export interface ViewAction /* extends Record<string, any> */ {
  type: ViewActionType;
  editorKey: EditorKeyType;
}

export interface NotesViewAction extends ViewAction {
  command: 'open' | 'close';
  noteType?: string;
}
