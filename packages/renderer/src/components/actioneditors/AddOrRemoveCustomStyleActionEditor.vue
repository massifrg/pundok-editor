<template>
  <q-btn-dropdown :label="selectedStyleName" no-caps>
    <q-list>
      <q-item v-for="s in styles" dense clickable v-close-popup :title="s.styleDef.description"
        @click="setStyleName(s.styleDef.name)">
        <q-item-section><q-item-label>{{ s.styleDef.name }}</q-item-label></q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import {
  AddOrRemoveCustomStyleActionProps,
  appliesTo,
  CustomStyleInstance,
  MARK_NAME_SPAN
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
      return (this.configuration?.customStylesInstances || [])
        .filter(cs => appliesTo(cs, MARK_NAME_SPAN))
    },
    selectedStyleName() {
      return (this.action?.props as AddOrRemoveCustomStyleActionProps)?.styleName || ""
    }
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    setStyleName(styleName: string) {
      this.$emit('set-props', this.index, { styleName } as AddOrRemoveCustomStyleActionProps)
    }
  }
}
</script>