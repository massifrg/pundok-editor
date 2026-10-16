<template>
  <q-btn-dropdown :label="selectedStyleName" no-caps>
    <q-list>
      <q-item v-for="s in styles" :key="s.styleDef.name" dense clickable v-close-popup :title="s.styleDef.description"
        @click="setStyleName(s.styleDef.name)">
        <q-item-section><q-item-label>{{ s.styleDef.name }}</q-item-label></q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import {
  AddRemoveCustomStyleActionProps,
  CustomStyleInstance,
} from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { getEditorConfiguration } from '../../schema';

export default {
  props: ['editor', 'index', 'action'],
  emits: ['set-props'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    styles(): CustomStyleInstance[] {
      const styles = new Map<string, CustomStyleInstance>();
      for (const style of this.configuration?.customStylesInstances || []) {
        if (!styles.has(style.styleDef.name)) styles.set(style.styleDef.name, style);
      }
      return [...styles.values()];
    },
    selectedStyleName() {
      return (this.action?.props as AddRemoveCustomStyleActionProps)?.styleName || ""
    }
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    setStyleName(styleName: string) {
      this.$emit('set-props', this.index, { styleName } as AddRemoveCustomStyleActionProps)
    }
  }
}
</script>