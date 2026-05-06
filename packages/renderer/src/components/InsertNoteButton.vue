<template>
  <q-btn-dropdown auto-close icon="note_add" color="grey-5" split dense size="sm" dropdown-icon="menu_down"
    :title="title" :disable-main-btn="disabled" :disable-dropdown="disabled" @click="$emit('insertNote')">
    <q-list>
      <q-item v-for="nt in noteTypes" :key="nt" density="compact" :value="nt" :title="`insert a new ${nt}`" dense
        @click="$emit('insertNote', nt)">
        <q-item-section>
          <q-btn icon="note_add" :label="nt" :title="`insert a new ${nt}`" no-caps @click="$emit('insertNote', nt)" />
        </q-item-section>
        <q-item-section side>
          <q-btn-group>
            <q-btn icon="notes_expand_all_of_type" :title='`expand all notes of type "${nt}"`' @click="expandAll(nt)" />
            <q-btn icon="notes_close_all_of_type" :title='`close all notes of type "${nt}"`' @click="closeAll(nt)" />
          </q-btn-group>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-btn icon="note_refresh_all" label="all notes" title="refresh/fix note numbers" no-caps
            @click="editor?.commands.refreshNotes()" />
        </q-item-section>
        <q-item-section side>
          <q-btn-group>
            <q-btn icon="notes_expand_all" title='expand all notes of any type' @click="expandAll()" />
            <q-btn icon="notes_close_all" title='close all notes of any type' @click="closeAll()" />
          </q-btn-group>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import ToolbarButton from './ToolbarButton.vue'
import { DEFAULT_NOTE_TYPE, NoteStyle, shortcutSuffix } from '../common'
import { getEditorConfiguration } from '../schema';
import { setViewActionCloseNotes, setViewActionExpandNotes } from '../actions';

export default {
  props: ['editor', 'disabled', 'shortcut'],
  emits: ['insertNote'],
  components: {
    ToolbarButton
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    noteStyles(): NoteStyle[] {
      return this.configuration?.noteStyles || []
    },
    noteTypes(): string[] {
      return this.noteStyles?.map(ns => ns.noteType) || [DEFAULT_NOTE_TYPE]
    },
    defaultNoteType() {
      const index = this.noteStyles?.findIndex(ns => ns.default === true)
      return this.noteTypes[index >= 0 ? index : 0]
    },
    title() {
      return `insert a new ${this.defaultNoteType}` + shortcutSuffix(this.shortcut)
    }
  },
  methods: {
    expandAll(noteType?: string) {
      setViewActionExpandNotes(this.editor.state, noteType)
    },
    closeAll(noteType?: string) {
      setViewActionCloseNotes(this.editor.state, noteType)
    }
  }
}
</script>
