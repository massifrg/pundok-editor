import { Fragment } from '@tiptap/pm/model';
import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';
import { mergeAttributes, Node, NodeWithPos } from '@tiptap/core';
import { Editor, VueNodeViewRenderer } from '@tiptap/vue-3';
import { DEFAULT_NOTE_TYPE, NODE_NAME_PARAGRAPH } from '../../common';
import { NoteView, getEditorDocState } from '../index';
import { deltaNodes } from '../helpers/whatChanged';
import { useNotes } from '../../stores';
import { Component } from 'vue';

const META_REFRESH_NOTES = 'refresh-notes';

export interface CachedNote extends NodeWithPos {
  noteTypeIndex: number;
  noteNumber: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    notes: {
      /**
       * Insert a note
       */
      insertNote: (note_type: string, text?: string) => ReturnType;
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

  addStorage() {
    return {
      notes: [] as CachedNote[],
    };
  },

  addProseMirrorPlugins() {
    const { options, storage } = this;
    const refreshCachedNotes = (newState: EditorState) => {
      const notes: CachedNote[] = [];
      const noteName = this.name;
      const counters: Record<string, number> = {};
      const noteTypeIndex = Object.fromEntries(
        options.noteTypes.map((t, i) => [t, i]),
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
      storage.notes = notes;
      useNotes().nextTick();
    };
    return [
      new Plugin({
        key: new PluginKey('notes'),
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        state: {
          init: (config, state) => {
            return DecorationSet.empty;
          },
          apply: (tr, decorationSet, oldState, newState) => {
            const refresh: boolean = tr.getMeta(META_REFRESH_NOTES);
            if (refresh) refreshCachedNotes(newState);
            if (tr.docChanged) {
              if (
                deltaNodes(
                  tr,
                  oldState.doc,
                  (n) => n.type.name === this.name,
                ) !== 0
              ) {
                refreshCachedNotes(newState);
              }
            }
          },
        },
      }),
    ];
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
        (note_type: string, text?: string) =>
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
            const noteType = noteTypes.includes(note_type)
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
});
