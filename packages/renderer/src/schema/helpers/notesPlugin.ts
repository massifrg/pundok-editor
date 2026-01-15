import { EditorState, Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import { DecorationSet } from "@tiptap/pm/view";
import { CachedNote, META_REFRESH_NOTES } from "./notes";
import { deltaNodes } from "./whatChanged";
import { NODE_NAME_NOTE } from "../../common";
import { Note } from "../nodes";
import { useNotes } from "../../stores";

class NotesState {
  constructor(readonly decorations: DecorationSet, readonly notes: CachedNote[]) {

  }

  apply(tr: Transaction, newState: EditorState, oldState: EditorState): NotesState {
    let notes: CachedNote[] | undefined = undefined
    if (tr.getMeta(META_REFRESH_NOTES) as boolean) {
      notes = refreshCachedNotes(newState);
    } else if (tr.docChanged) {
      if (
        deltaNodes(
          tr,
          oldState.doc,
          (n) => n.type.name === NODE_NAME_NOTE,
        ) !== 0
      ) {
        notes = refreshCachedNotes(newState);
      }
    }
    return notes
      ? new NotesState(this.decorations, notes)
      : this
  }
}

export function refreshCachedNotes(newState: EditorState): CachedNote[] {
  const notes: CachedNote[] = [];
  const noteName = NODE_NAME_NOTE;
  const counters: Record<string, number> = {};
  const noteTypeIndex = Object.fromEntries(
    Note.options.noteTypes.map((t, i) => [t, i]),
  );
  newState.doc.descendants((node, pos) => {
    if (node.type.name === noteName) {
      const noteType = node.attrs.noteType;
      const counter = (counters[noteType] || 0) + 1;
      notes.push({
        node,
        pos,
        noteNumber: counter,
        noteTypeIndex: noteTypeIndex[noteType] || -1,
      });
      counters[noteType] = counter;
    }
  });
  console.log(notes)
  return notes;
};

export const notesPluginKey = new PluginKey('notes')

export const notesPlugin = new Plugin({
  key: notesPluginKey,
  props: {
    decorations(state) {
      return this.getState(state).decorations;
    },
  },
  state: {
    init: (config, state) => {
      return new NotesState(DecorationSet.empty, [])
    },
    apply: (tr, notesState, oldState, newState) => {
      const newNotesState = notesState.apply(tr, newState, oldState)
      if (newNotesState !== notesState)
        useNotes().nextTick();
      return newNotesState
    },
  },
})