<template>
  <q-card-section align="center">
    <q-btn no-caps :label="selectedLabel">
      <q-menu auto-close>
        <q-list v-if="noteTypes.length > 0">
          <q-item v-for="(nt, index) in noteTypes" :key="index" clickable v-close-popup density="compact" :value="index"
            :title="nt" dense @click="updateValue(nt)">
            <q-item-section avatar><q-icon v-if="value === nt" name="mdi-check" size="xs" /></q-item-section>
            <q-item-section no-wrap>{{ nt }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </q-card-section>
  <q-card-section>
    <!-- <span v-if="value"><b>{{ selectedLabel }}</b>: </span>{{ customStyleDescription(selectedStyle) }} -->
  </q-card-section>
</template>

<script lang="ts">
import { DEFAULT_NOTE_TYPE, NoteStyle } from '../../common';
import { getEditorConfiguration } from '../../schema';

export default {
  props: ['editor', 'type', 'originalValue'],
  emits: ['update-attribute'],
  data() {
    return {
      value: this.originalValue || DEFAULT_NOTE_TYPE
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    noteStyles(): NoteStyle[] {
      return this.configuration?.noteStyles || []
    },
    noteTypes() {
      const types = this.noteStyles.map(ns => ns.noteType)
      if (types.length === 0) types.push(DEFAULT_NOTE_TYPE)
      console.log(types)
      return this.noteStyles.map(ns => ns.noteType)
    },
    selectedLabel() {
      return this.value
    },
  },
  methods: {
    updateValue(newValue: string | number | null) {
      const value = this.value
      this.value = value === newValue ? null : newValue
      this.$emit('update-attribute', 'noteType', this.value);
    },
  },
};
</script>