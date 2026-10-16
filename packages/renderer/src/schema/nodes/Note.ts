import { Fragment } from '@tiptap/pm/model';
import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { DEFAULT_NOTE_TYPE, NODE_NAME_NOTE, NODE_NAME_PARAGRAPH, SK } from '../../common';
import { Component } from 'vue';
import { depthOfInnerNodeType, getDocState, META_REFRESH_NOTES, notesPlugin } from '../helpers';
import NoteView from '../../components/nodeviews/NoteView.vue';
import { NodeSelection } from '@tiptap/pm/state';
import type { Command } from '@tiptap/pm/state';
import { wrapIn } from '@tiptap/pm/commands';
import { asTiptapCommand } from '../helpers';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    notes: {
      /**
       * Insert a note
       */
      insertNote: (note_type?: string, text?: string) => ReturnType;
      /**
       * Refresh notes (decorations)
       */
      refreshNotes: () => ReturnType;
      /**
       * Split the current paragraph at the note marker and unwrap the Note blocks into the main text.
       */
      noteToText: () => ReturnType;
    };
  }
}

export interface NoteOptions {
  HTMLAttributes: Record<string, any>;
  noteTypes: string[];
  placeHolderText: (noteType: string) => string;
}

export const DEFAULT_NOTE_OPTIONS: NoteOptions = {
  noteTypes: ['footnote', 'endnote', 'marginnote'],
  HTMLAttributes: {},
  placeHolderText: (noteType: string) =>
    `${noteType || DEFAULT_NOTE_TYPE} text`,
};

export const Note = Node.create<NoteOptions>({
  name: 'note',
  inline: true,
  group: 'inline',
  atom: true,
  content: 'block+',
  draggable: true,
  isolating: false, // IMPORTANT!
  marks: '_', // allow all marks (Note has no inline content, so marks are not allowed by default)

  addOptions() {
    return DEFAULT_NOTE_OPTIONS;
  },

  addProseMirrorPlugins() {
    return [notesPlugin];
  },

  addAttributes() {
    return {
      noteType: {
        default: this.options.noteTypes[0] || DEFAULT_NOTE_TYPE,
        parseHTML: (e) =>
          this.options.noteTypes.find((t) => e.classList.contains(t)) || null,
        renderHTML: (attrs) =>
          attrs.noteType ? { class: attrs.noteType } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'note' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'note',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(NoteView as Component);
  },

  addCommands() {
    return {
      insertNote: (note_type?: string, text?: string) =>
        asTiptapCommand(insertNoteCommand(this.options, note_type, text)),
      refreshNotes: () => asTiptapCommand(refreshNotesCommand),
      noteToText: () => asTiptapCommand(noteToTextCommand),
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.INSERT_NOTE]: () => this.editor.commands.insertNote()
    }
  }
});

const insertNoteCommand = (options: NoteOptions, note_type?: string, text?: string): Command => (state, dispatch) => {
  const schema = state.schema;
  const noteNodeType = schema.nodes[NODE_NAME_NOTE];
  if (!noteNodeType) return false;
  const docState = getDocState(state);
  const noteTypes = docState?.configuration?.noteStyles?.map((ns) => ns.noteType) || options.noteTypes || [];
  const noteType = note_type && noteTypes.includes(note_type) ? note_type : noteTypes[0] || DEFAULT_NOTE_TYPE;
  const selection = state.selection;
  let content = Fragment.empty;
  if (selection.empty) {
    content = Fragment.from(schema.nodes[NODE_NAME_PARAGRAPH].createChecked(null, schema.text(text || options.placeHolderText(noteType))));
  } else {
    const slice = selection.content();
    content = slice.content;
    if (!(content.childCount === 1 && slice.content.child(0).type.name === 'paragraph')) return wrapIn(noteNodeType)(state, dispatch);
  }
  try {
    const newNote = noteNodeType.createChecked({ noteType, kv: { 'note-type': noteType } }, content);
    if (dispatch) dispatch(state.tr.replaceSelectionWith(newNote).setMeta(META_REFRESH_NOTES, true));
  } catch { return false; }
  return true;
};

const refreshNotesCommand: Command = (state, dispatch) => {
  if (dispatch) dispatch(state.tr.setMeta(META_REFRESH_NOTES, true));
  return true;
};

const noteToTextCommand: Command = (state, dispatch) => {
  const { $from } = state.selection;
  const d = depthOfInnerNodeType($from, [NODE_NAME_NOTE]);
  if (!d) return false;
  const pos = $from.start(d) - 1;
  const note = state.doc.nodeAt(pos);
  if (!note) return false;
  if (dispatch) dispatch(state.tr.setSelection(new NodeSelection(state.doc.resolve(pos))).deleteSelection().split(pos).insert(pos, note.content));
  return true;
};
