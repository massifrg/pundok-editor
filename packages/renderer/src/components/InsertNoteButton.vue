<template>
  <!-- <ToolbarButton v-if="noteTypes.length <= 1" :disabled="disabled" icon="mdi-note-plus" @click="$emit('insertNote')" /> -->
  <q-btn-dropdown auto-close icon="mdi-note-plus" color="grey-5" split dense size="sm" dropdown-icon="mdi-menu-down"
    :title="title" :disable-main-btn="disabled" :disable-dropdown="disabled" @click="$emit('insertNote')">
    <q-list>
      <q-item v-for="nt in noteTypes" :key="nt" density="compact" :value="nt" :title="`insert a new ${nt}`" dense
        @click="$emit('insertNote', nt)">
        <q-item-section>
          <q-btn icon="mdi-note-plus" :label="nt" :title="`insert a new ${nt}`" no-caps
            @click="$emit('insertNote', nt)" />
        </q-item-section>
        <q-item-section side>
          <q-btn-group>
            <q-btn icon="mdi-arrow-expand" :title='`expand all notes of type "${nt}"`' @click="expandAll(nt)" />
            <q-btn icon="mdi-close-box-multiple-outline" :title='`close all notes of type "${nt}"`'
              @click="closeAll(nt)" />
          </q-btn-group>
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-btn icon="mdi-refresh" label="all notes" title="refresh/fix note numbers" no-caps
            @click="editor?.commands.refreshNotes()" />
        </q-item-section>
        <q-item-section side>
          <q-btn-group>
            <q-btn icon="mdi-arrow-expand-all" title='expand all notes of any type' @click="expandAll()" />
            <q-btn icon="mdi-close-box-multiple" title='close all notes of any type' @click="closeAll()" />
          </q-btn-group>
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

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
