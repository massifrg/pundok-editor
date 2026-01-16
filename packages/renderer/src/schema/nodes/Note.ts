import { Fragment } from '@tiptap/pm/model';
import { mergeAttributes, Node } from '@tiptap/core';
import { Editor, VueNodeViewRenderer } from '@tiptap/vue-3';
import { DEFAULT_NOTE_TYPE, NODE_NAME_PARAGRAPH, SK } from '../../common';
import { Component } from 'vue';
import { getEditorDocState, META_REFRESH_NOTES, notesPlugin } from '../helpers';
import { NoteView } from '../../components';

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
      // id: {
      //   default: null,
      //   parseHTML: (e) => e.getAttribute('id'),
      //   renderHTML: (attrs) => (attrs.id ? { id: attrs.id } : {}),
      // },
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
      insertNote:
        (note_type?: string, text?: string) =>
          ({ commands, dispatch, editor, state, tr }) => {
            const schema = state.schema;
            const noteNodeType = schema.nodes[this.name];
            if (!noteNodeType) return false;
            const docState = getEditorDocState(editor as Editor);
            const noteStyles = docState?.configuration?.noteStyles;
            const noteTypes =
              (noteStyles && noteStyles.map((ns) => ns.noteType)) ||
              this.options.noteTypes ||
              [];
            const noteType = note_type && noteTypes.includes(note_type)
              ? note_type
              : noteTypes[0] || DEFAULT_NOTE_TYPE;
            const selection = state.selection;
            let content = Fragment.empty;
            if (selection.empty) {
              content = Fragment.from(
                schema.nodes[NODE_NAME_PARAGRAPH].createChecked(
                  null,
                  schema.text(text || this.options.placeHolderText(noteType)),
                ),
              );
            } else {
              const slice = selection.content();
              content = slice.content;
              // console.log(`openStart=${slice.openStart}, openEnd=${slice.openEnd}`)
              // console.log(slice)
              if (
                !(
                  content.childCount === 1 &&
                  slice.content.child(0).type.name === 'paragraph'
                )
              ) {
                return commands.wrapIn('note', {
                  attrs: {
                    noteType: note_type,
                    kv: { 'note-type': noteType },
                  },
                });
              }
            }
            try {
              const newNote = noteNodeType.createChecked(
                { noteType, kv: { 'note-type': noteType } },
                Fragment.from(content),
              );
              if (dispatch) {
                dispatch(
                  tr
                    .replaceSelectionWith(newNote)
                    .setMeta(META_REFRESH_NOTES, true),
                );
              }
            } catch (error) {
              return false;
            }
            return true;
          },
      refreshNotes:
        () =>
          ({ dispatch, tr }) => {
            if (dispatch) dispatch(tr.setMeta(META_REFRESH_NOTES, true));
            return true;
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      [SK.INSERT_NOTE]: () => this.editor.commands.insertNote()
    }
  }
});
