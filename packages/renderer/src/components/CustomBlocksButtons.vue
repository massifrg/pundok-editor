<template>
  <span v-for="{ node } in stylableBlocks">
    <ToolbarButton icon="mdi-palette-swatch" :label="label(node)" :styleactive="customStylesOfNode(node).length > 0"
      :disabled="false" no-caps size="small" dense :title="title(node)">
      <q-menu auto-close>
        <q-list>
          <q-item v-for="(styleItem, index) in availableStylesForNode(node)" :key="index" clickable density="compact"
            :value="index" :title="description(styleItem)" dense @click="toggleStyle(styleItem, node)">
            <q-item-section side>
              <q-icon :name="isCustomStyleActive(styleItem, node) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                size="xs" />
            </q-item-section>
            <q-item-section no-wrap v-html="styleLabel(styleItem)" />
          </q-item>
        </q-list>
      </q-menu>
    </ToolbarButton>
    <span class="button-separator" />
  </span>
</template>

<script lang="ts">
import { Node } from '@tiptap/pm/model';
import { NodeWithPos } from '@tiptap/core';
import { CustomStyleInstance, PandocEditorConfig, activeCustomStyles, compatibleCustomStylesPerTypeName, isCustomStyleActive, labelForStyle } from '../common';
import ToolbarButton from './ToolbarButton.vue';
import { getEditorConfiguration } from '../schema';

export default {
  props: ['editor', 'currentBlocks'],
  emits: ['unsetCustomStyle', 'setCustomStyle'],
  components: {
    ToolbarButton
  },
  computed: {
    configuration() {
      const conf = getEditorConfiguration(this.editor)
      if (conf) return new PandocEditorConfig(conf) // TODO: fix this
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    availableStyles(): Record<string, CustomStyleInstance[]> {
      return compatibleCustomStylesPerTypeName(this.customStyles)
    },
    stylableBlocks(): NodeWithPos[] {
      const stylable = (this.currentBlocks as NodeWithPos[])
        .filter(({ node }) => this.availableStyles[node.type.name])
      // console.log(stylable.map(s => s.node.type.name).join())
      return stylable
    },
  },
  methods: {
    hasCustomStyles(nodeTypeName: string) {
      const styles = this.availableStyles[nodeTypeName]
      return styles && styles.length > 0
    },
    availableStylesForNode(n: Node): CustomStyleInstance[] {
      return this.availableStyles[n.type.name] || []
    },
    availableStyleNamesForNode(n: Node): string[] {
      return this.availableStylesForNode(n).map(cs => cs.styleDef.name)
    },
    customStylesOfNode(n: Node): string[] {
      return activeCustomStyles(n, this.availableStylesForNode(n)).map(cs => cs.styleDef.name)
    },
    title(n: Node) {
      const name = n.type.name
      const styles = this.customStylesOfNode(n)
      const currentlyActive = styles.length > 0 ? `currently active: ${styles.join(',')}` : 'none currently active'
      return `${name} custom ${name === 'paragraph' ? 'style' : 'class'} (${currentlyActive})`
    },
    label(n: Node): string {
      const styles = this.customStylesOfNode(n)
      const noStyles = styles.length === 0
      switch (n.type.name) {
        case 'paragraph':
          return 'P' + (noStyles ? '' : `(${styles.join(',')})`)
        case 'heading':
          return 'h' + n.attrs.level + (noStyles ? '' : `.${styles.join(',')}`)
        default:
          return n.type.name + (noStyles ? '' : `.${styles.join('.')}`)
      }
    },
    description(cs: CustomStyleInstance): string {
      return [cs.styleDef.description || '', cs.deprecated ? '(deprecated)' : ''].join(' ')
    },
    styleLabel(cs: CustomStyleInstance) {
      const label = labelForStyle(cs)
      return cs.deprecated ? `<del>${label}</del>` : label
    },
    setCustomStyle(nodeOrType: Node | string, cs: CustomStyleInstance) {
      this.$emit('setCustomStyle', nodeOrType, cs)
    },
    unsetCustomStyle(nodeOrType: Node | string, cs: CustomStyleInstance) {
      this.$emit('unsetCustomStyle', nodeOrType, cs)
    },
    isCustomStyleActive(cs: CustomStyleInstance, node: Node) {
      return isCustomStyleActive(cs, node)
    },
    toggleStyle(cs: CustomStyleInstance, node: Node) {
      if (isCustomStyleActive(cs, node)) {
        this.$emit('unsetCustomStyle', node.type, cs)
      } else {
        // it should be only one active style
        const activeStyles = activeCustomStyles(node, this.availableStyles)
        activeStyles.forEach(active => {
          this.$emit('unsetCustomStyle', node.type, active)
        })
        this.$emit('setCustomStyle', node.type, cs)
      }
    },
  }
}
</script>