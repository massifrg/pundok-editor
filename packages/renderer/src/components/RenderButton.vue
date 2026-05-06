<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import {
  ACTION_DOCUMENT_RENDER,
  setActionCommand
} from '../actions';
import { editorKeyFromState, getDocState } from '../schema';
import ToolbarButton from './ToolbarButton.vue';

export default {
  props: ['editor'],
  data() {
    return {
      isCompact: true,
    }
  },
  components: { ToolbarButton },
  computed: {
    editorKey() {
      return editorKeyFromState(this.editor?.state)
    },
    renderConverters() {
      const docState = getDocState(this.editor?.state)
      return (docState?.configuration?.outputConverters || [])
        .filter(oc => oc.longRendering)
    },
    compactItemIcon() {
      return this.isCompact ? 'expand' : 'collapse'
    },
    compactItemText() {
      return this.isCompact ? 'expand' : 'compact'
    },
    compactItemTitle() {
      return this.isCompact ? 'show all buttons for render...' : 'show render... as a dropdown button'
    },
  },
  methods: {
    docState() {
      return getDocState(this.editor)
    },
    dropDownIcon() {
      return this.isCompact ? 'render' : 'render'
    },
    dropDownTitle() {
      return this.isCompact ? 'render document' : 'render document'
    },
    dropDownClick() {
      // if (this.isCompact)
      //   this.save()
      // else
      //   this.saveCopy()
    },
    render() {
      if (this.editorKey) setActionCommand(this.editorKey, ACTION_DOCUMENT_RENDER, {})
    },
  }
}
</script>

<template>
  <q-btn-group v-if="renderConverters.length > 0" class="toolbar-button">
    <!-- <ToolbarButton v-if="!isCompact" class="q-px-xs" size="sm" icon="mdi-content-save" title="save" @click="render">
    </ToolbarButton>
    <ToolbarButton v-if="!isCompact" class="q-px-xs" size="sm" icon="mdi-content-save-edit" title="save as"
      @click="saveAs" /> -->
    <q-btn-dropdown class="toolbar-button" :title="dropDownTitle()" split dense dropdown-icon="menu_down"
      @click="dropDownClick()" elevation="3" size="xs" color="grey-5" auto-close>
      <template v-slot:label>
        <div :class="`row, items-center no-wrap`">
          <q-icon :name="dropDownIcon()" size="xs" />
        </div>
      </template>
      <q-list dense>
        <!-- <q-item v-if="isCompact" key="save" title="save" clickable @click="save()">
          <q-item-section avatar>
            <q-icon name="mdi-content-save" />
          </q-item-section>
          <q-item-section>Save</q-item-section>
        </q-item>
        <q-item v-if="isCompact" key="saveAs" title="save as" clickable @click="saveAs()">
          <q-item-section avatar><q-icon name="mdi-content-save-edit" /></q-item-section>
          <q-item-section>Save as</q-item-section>
        </q-item> -->
        <q-item v-if="isCompact" key="render" title="render" clickable @click="render()">
          <q-item-section avatar><q-icon name="render" /></q-item-section>
          <q-item-section>Render</q-item-section>
        </q-item>
        <q-item key="compact" :title="compactItemTitle" clickable @click="isCompact = !isCompact">
          <q-item-section avatar><q-icon :name="compactItemIcon" /></q-item-section>
          <q-item-section>{{ compactItemText }}</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-btn-group>
</template>