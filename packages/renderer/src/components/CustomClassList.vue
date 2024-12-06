<template>
  <q-list v-if="validCustomStyles.length > 0">
    <q-item v-for="(styleItem, index) in validCustomStyles" :key="index" clickable density="compact" :value="index"
      :title="description(styleItem)" dense @click="$emit('chosen-class', styleItem.styleDef.name)">
      <q-item-section avatar v-if="!noAvatar"><q-icon v-if="isClassPresent(styleItem.styleDef.name)" name="mdi-check"
          size="xs" /></q-item-section>
      <q-item-section no-wrap v-html="classLabel(styleItem)" />
    </q-item>
  </q-list>
</template>

<script lang="ts">
import { CustomStyleInstance, customStylesForType } from '../common';
import { getEditorConfiguration } from '../schema';

export default {
  components: {},
  props: ['editor', 'type', 'currentClasses', 'customStyleDescription', 'noAvatar'],
  emits: ['chosen-class'],
  data() { },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    validCustomStyles(): CustomStyleInstance[] {
      return customStylesForType(this.customStyles, this.type)
    },
    classNames() {
      return this.validCustomStyles.map((c) => c.styleDef.name);
    }
  },
  methods: {
    isClassPresent(name: string) {
      return this.currentClasses && this.currentClasses.includes(name)
    },
    description(cs: CustomStyleInstance): string {
      const description = cs.styleDef.description || ''
      return [description, cs.deprecated ? '(deprecated)' : ''].join(' ')
    },
    classLabel(cs: CustomStyleInstance) {
      return cs.deprecated ? `<del>${cs.styleDef.name}</del>` : cs.styleDef.name
    }
  },
};
</script>
