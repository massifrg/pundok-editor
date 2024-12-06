<template>
  <q-btn-dropdown v-if="transforms.length > 0" title="make a transformation of the whole document"
    icon="mdi-file-replace-outline" color="grey-5" dense size="sm" dropdown-icon="mdi-menu-down">
    <q-list>
      <q-item v-for="(t, index) in transforms" :key="index" :title="t.description" clickable v-close-popup
        density="compact" dense @click="transformWith(t)">
        <q-item-section :title="t.description">{{ t.name }}</q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { setActionTransformDocument } from '../actions';
import { getPandocFilterTransforms, PandocFilterTransform } from '../common';
import { getEditorConfiguration } from '../schema';

export default {
  props: ['editor'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    transforms() {
      return getPandocFilterTransforms(this.configuration)
    }
  },
  methods: {
    transformWith(t: PandocFilterTransform) {
      setActionTransformDocument(this.editor.state, t)
    }
  }
}
</script>