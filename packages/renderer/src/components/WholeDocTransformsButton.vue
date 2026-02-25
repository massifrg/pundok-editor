<template>
  <q-btn-dropdown v-if="transforms.length > 0" title="make a transformation of the whole document" color="grey-5" dense
    size="sm" dropdown-icon="mdi-menu-down">
    <template v-slot:label>
      <q-circular-progress v-if="remoteWorkInProgress" indeterminate rounded color="red" />
      <q-icon v-if="!remoteWorkInProgress" name="mdi-file-replace-outline" />
    </template>
    <q-list>
      <q-item v-for="(t, index) in transforms" :key="index" :title="t.description" clickable v-close-popup
        density="compact" dense @click="transformWith(t)">
        <q-item-section :title="t.description">{{ t.name }}</q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { useActions } from '../stores';
import { ACTION_DOCUMENT_TRANSFORM, setActionCommand } from '../actions';
import { getPandocFilterTransforms, PandocFilterTransform, SetDocumentFormatActionProps, TransformDocumentActionProps } from '../common';
import { getEditorConfiguration } from '../schema';

export default {
  props: ['editor'],
  computed: {
    ...mapState(useActions, ['remoteWorkInProgress']),
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    transforms() {
      return getPandocFilterTransforms(this.configuration)
    }
  },
  methods: {
    transformWith(transform: PandocFilterTransform) {
      setActionCommand(this.editor.state, ACTION_DOCUMENT_TRANSFORM,
        { transform } as TransformDocumentActionProps)
    }
  }
}
</script>