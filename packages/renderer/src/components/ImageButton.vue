<template>
  <q-btn-dropdown auto-close icon="image" :title="title" color="grey-5" split dense size="sm" dropdown-icon="menu_down"
    :disable-main-btn="false" :disable-dropdown="false"
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

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { shortcut } from '../common';
import { getDocState } from '../schema';

export default {
  props: ['editor'],
  computed: {
    docState() {
      return this.editor && getDocState(this.editor)
    },
    title() {
      const sc = shortcut('INSERT_IMAGE')
      return "insert Image" + (sc && sc.length > 0 ? ` [${sc}]` : '')
    },
    basePath() {
      const { imagesFolder, workingFolder } = this.docState
      return imagesFolder || workingFolder
    },
  },
}
</script>
