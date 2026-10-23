<template>
  <q-btn-group v-if="transforms.length > 0" class="toolbar-button">
    <q-btn dense size="sm" color="grey-5" title="whole-document transformation" @click="mainClicked">
      <q-circular-progress v-if="remoteWorkInProgress" indeterminate rounded color="red" />
      <q-icon v-else name="document_transform" />
    </q-btn>
    <q-btn-dropdown ref="menu" dense size="sm" color="grey-5" dropdown-icon="menu_down"
      title="make a transformation of the whole document">
    <q-list>
      <q-item v-for="(t, index) in transforms" :key="index" :title="t.description" clickable v-close-popup
        density="compact" dense @click="transformWith(t)">
        <q-item-section :title="t.description">{{ t.name }}</q-item-section>
      </q-item>
    </q-list>
    </q-btn-dropdown>
  </q-btn-group>
  <TransformationDialog :visible="dialogVisible" :active="remoteWorkInProgress"
    :failed="transformationFailed"
    :log="transformationLog" @close="dialogVisible = false" @stop="stopTransformation" />
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { mapState } from 'pinia';
import { useActions, useBackend } from '../stores';
import { ACTION_DOCUMENT_TRANSFORM, setActionCommand } from '../actions';
import { getPandocFilterTransforms, PandocFilterTransform, SetDocumentFormatActionProps, TransformDocumentActionProps } from '../common';
import { editorKeyFromState, getEditorConfiguration } from '../schema';
import TransformationDialog from './TransformationDialog.vue';

export default {
  components: { TransformationDialog },
  props: ['editor', 'transformationLog', 'transformationFailed'],
  computed: {
    ...mapState(useActions, ['remoteWorkInProgress']),
    ...mapState(useBackend, ['backend']),
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    transforms() {
      return getPandocFilterTransforms(this.configuration)
    }
  },
  data() {
    return {
      dialogVisible: false,
    }
  },
  methods: {
    mainClicked() {
      if (this.remoteWorkInProgress) {
        this.dialogVisible = true;
      } else {
        (this.$refs.menu as { show: () => void } | undefined)?.show();
      }
    },
    transformWith(transform: PandocFilterTransform) {
      setActionCommand(this.editor.state, ACTION_DOCUMENT_TRANSFORM,
        { transform } as TransformDocumentActionProps)
    },
    async stopTransformation() {
      const editorKey = editorKeyFromState(this.editor?.state);
      if (!editorKey) return;
      await this.backend?.stopTransformation(editorKey);
    }
  }
}
</script>