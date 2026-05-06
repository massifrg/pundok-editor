<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import {
  ACTION_DOCUMENT_SAVE,
  ACTION_DOCUMENT_SAVE_AS,
  ACTION_DOCUMENT_SAVE_COPY,
  setActionCommand
} from '../actions';
import { editorKeyFromState, getDocState } from '../schema';
import ToolbarButton from './ToolbarButton.vue';

export default {
  props: ['editor', 'textColor'],
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
    compactItemIcon() {
      return this.isCompact ? 'expand' : 'collapse'
    },
    compactItemText() {
      return this.isCompact ? 'expand' : 'compact'
    },
    compactItemTitle() {
      return this.isCompact ? 'show all buttons for save/save as/save a copy' : 'show save/save as/save a copy as a dropdown button'
    },
  },
  methods: {
    docState() {
      return getDocState(this.editor)
    },
    dropDownIcon() {
      return this.isCompact ? 'document_save' : 'document_save_copy'
    },
    dropDownTitle() {
      return this.isCompact ? 'save' : 'save a copy'
    },
    dropDownClick() {
      if (this.isCompact)
        this.save()
      else
        this.saveCopy()
    },
    save() {
      if (this.editorKey) setActionCommand(this.editorKey, ACTION_DOCUMENT_SAVE, {})
    },
    saveAs() {
      if (this.editorKey) setActionCommand(this.editorKey, ACTION_DOCUMENT_SAVE_AS, {})
    },
    saveCopy() {
      if (this.editorKey) setActionCommand(this.editorKey, ACTION_DOCUMENT_SAVE_COPY, {})
    }
  }
}
</script>

<template>
  <q-btn-group class="toolbar-button">
    <ToolbarButton v-if="!isCompact" class="q-px-xs" size="sm" icon="document_save" title="save" :text-color="textColor"
      @click="save">
    </ToolbarButton>
    <ToolbarButton v-if="!isCompact" class="q-px-xs" size="sm" icon="document_save_as" title="save as"
      :text-color="textColor" @click="saveAs" />
    <q-btn-dropdown class="toolbar-button" :title="dropDownTitle()" split dense dropdown-icon="menu_down"
      @click="dropDownClick()" elevation="3" size="xs" color="grey-5" auto-close>
      <template v-slot:label>
        <div :class="`row, items-center no-wrap text-${textColor}`">
          <q-icon :name="dropDownIcon()" :text-color="textColor" size="xs" />
        </div>
      </template>
      <q-list dense>
        <q-item v-if="isCompact" key="save" title="save" clickable @click="save()">
          <q-item-section avatar>
            <q-icon name="document_save" :text-color="textColor" />
          </q-item-section>
          <q-item-section>Save</q-item-section>
        </q-item>
        <q-item v-if="isCompact" key="saveAs" title="save as" clickable @click="saveAs()">
          <q-item-section avatar><q-icon name="document_save_as" :text-color="textColor" /></q-item-section>
          <q-item-section>Save as</q-item-section>
        </q-item>
        <q-item v-if="isCompact" key="saveCopy" title="save a copy" clickable @click="saveCopy()">
          <q-item-section avatar><q-icon name="document_save_copy" :text-color="textColor" /></q-item-section>
          <q-item-section>Save a copy</q-item-section>
        </q-item>
        <q-item key="compact" :title="compactItemTitle" clickable @click="isCompact = !isCompact">
          <q-item-section avatar><q-icon :name="compactItemIcon" :text-color="textColor" /></q-item-section>
          <q-item-section>{{ compactItemText }}</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-btn-group>
</template>