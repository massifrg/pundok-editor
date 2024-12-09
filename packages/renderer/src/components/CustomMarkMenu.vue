<template>
  <q-menu auto-close>
    <q-list v-if="styles.length > 0">
      <q-item v-for="(styleItem, index) in styles" :key="index" clickable density="compact" :value="index"
        :title="description(styleItem)" dense @click="toggleStyle(styleItem)">
        <q-item-section side>
          <q-icon :name="isStyleActive(styleItem.styleDef.name) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
            size="xs" />
        </q-item-section>
        <q-item-section no-wrap v-html="styleLabel(styleItem)" />
      </q-item>
    </q-list>
  </q-menu>
</template>

<script lang="ts">
import { CustomStyleInstance, PundokEditorConfig, customStylesForType } from '../common';
import { getEditorConfiguration } from '../schema';

export default {
  components: {},
  props: ['editor', 'activeCustomStyles'],
  emits: ['unsetCustomMark', 'setCustomMark'],
  computed: {
    configuration(): PundokEditorConfig | undefined {
      const conf = getEditorConfiguration(this.editor)
      if (conf) return new PundokEditorConfig(conf) // TODO: fix this
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    styles() {
      return customStylesForType(this.customStyles, 'span')
    },
    styleNames() {
      return this.styles.map((s) => s.styleDef.name);
    },
    activeStyles() {
      return this.activeCustomStyles || []
    },
  },
  methods: {
    isStyleActive(name: string) {
      return this.activeStyles.includes(name)
    },
    toggleStyle(cs: CustomStyleInstance) {
      if (this.isStyleActive(cs.styleDef.name)) {
        this.$emit('unsetCustomMark', 'span', cs)
      } else {
        this.$emit('setCustomMark', 'span', cs)
      }
    },
    description(cs: CustomStyleInstance): string {
      return [cs.styleDef.description || '', cs.deprecated ? '(deprecated)' : ''].join(' ')
    },
    styleLabel(cs: CustomStyleInstance) {
      return cs.deprecated ? `<del>${cs.styleDef.name}</del>` : cs.styleDef.name
    }
  },
};
</script>
