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
      return this.$t(this.isCompact ? 'expand' : 'compact')
    },
    compactItemTitle() {
      return this.$t(this.isCompact ? 'show.saveButtonsLine' : 'show.saveButtonsDropdown');
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
      return this.isCompact ? this.$t('save') : this.$t('saveCopy')
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
    <ToolbarButton v-if="!isCompact" class="q-px-xs" size="sm" icon="document_save" :title="$t('save')"
      text-color="textColor" @click="save">
    </ToolbarButton>
    <ToolbarButton v-if="!isCompact" class="q-px-xs" size="sm" icon="document_save_as" :title="$t('saveAs')"
      :text-color="textColor" @click="saveAs" />
    <q-btn-dropdown class="toolbar-button" :title="dropDownTitle()" split dense dropdown-icon="menu_down"
      @click="dropDownClick()" elevation="3" size="xs" color="grey-5" auto-close>
      <template v-slot:label>
        <div :class="`row, items-center no-wrap text-${textColor}`">
          <q-icon :name="dropDownIcon()" :text-color="textColor" size="xs" />
        </div>
      </template>
      <q-list dense>
        <q-item v-if="isCompact" key="save" clickable @click="save()">
          <q-item-section avatar>
            <q-icon name="document_save" :text-color="textColor" />
          </q-item-section>
          <q-item-section>{{ $t('save') }}</q-item-section>
        </q-item>
        <q-item v-if="isCompact" key="saveAs" clickable @click="saveAs()">
          <q-item-section avatar><q-icon name="document_save_as" :text-color="textColor" /></q-item-section>
          <q-item-section>{{ $t('saveAs') }}</q-item-section>
        </q-item>
        <q-item v-if="isCompact" key="saveCopy" clickable @click="saveCopy()">
          <q-item-section avatar><q-icon name="document_save_copy" :text-color="textColor" /></q-item-section>
          <q-item-section>{{ $t('saveCopy') }}</q-item-section>
        </q-item>
        <q-item key="compact" :title="compactItemTitle" clickable @click="isCompact = !isCompact">
          <q-item-section avatar><q-icon :name="compactItemIcon" :text-color="textColor" /></q-item-section>
          <q-item-section>{{ compactItemText }}</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-btn-group>
</template>