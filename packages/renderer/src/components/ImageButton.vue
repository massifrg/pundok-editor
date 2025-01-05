<template>
  <!-- <ToolbarButton v-if="noteTypes.length <= 1" :disabled="disabled" icon="mdi-note-plus" @click="$emit('insertNote')" /> -->
  <q-btn-dropdown auto-close icon="mdi-image-outline" title="insert Image" color="grey-5" split dense size="sm"
    dropdown-icon="mdi-menu-down" :disable-main-btn="false" :disable-dropdown="false"
    @click="editor.commands.setImage({ src: '', title: 'new image' })">
    <q-list>
      <q-item density="compact" title="make absolute src relative in selection" dense style="cursor: pointer" clickable
        @click="editor.commands.fixImageSrc()">
        <q-item-section side><q-icon name="image_check_outline" no-caps /></q-item-section>
        <q-item-section>fix absolute src</q-item-section>
      </q-item>
      <q-item density="compact" title="make absolute src relative in the whole document" dense style="cursor: pointer"
        clickable @click="editor.commands.fixAllImagesSrc()">
        <q-item-section side><q-icon name="image_check" no-caps /></q-item-section>
        <q-item-section>fix all absolute src</q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { docBasePath, getDocState } from '../schema';
import { setupQuasarIcons } from './helpers/quasarIcons'

export default {
  props: ['editor'],
  computed: {
    docState() {
      return this.editor && getDocState(this.editor)
    },
    basePath() {
      return this.docState && docBasePath(this.docState)
    },
  },
  setup() {
    setupQuasarIcons()
  }
}
</script>
