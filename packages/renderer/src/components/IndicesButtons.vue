<template>
  <ToolbarButton v-if="buttonStyle == 'menubar'" v-for="index in allIndices" :key="index.indexName" :size="size"
    :styleactive="isActive('span', { indexName: index.indexName })" :title='`reference for index "${index.indexName}"`'
    :disabled="!editor.can().addIndexRef(index)" @click="addIndexRef(index)">
    <q-icon :name="index.iconSvg || defaultIndexIconSvg()" :style="{ color: index.color || defaultIndexColor() }" />
  </ToolbarButton>
  <q-btn v-if="buttonStyle !== 'menubar'" v-for="index in allIndices" :key="index.indexName" :size="size || 'md'"
    :padding="padding || 'md'" :title='`reference for index "${index.indexName}"`'
    :disabled="!editor.can().addIndexRef(index)" @click="addIndexRef(index)">
    <q-icon :name="index.iconSvg || defaultIndexIconSvg()" :style="{ color: index.color || defaultIndexColor() }" />
  </q-btn>
</template>

<script lang="ts">
import { DEFAULT_INDEX_COLOR, Index } from '../common'
import { getEditorConfiguration } from '../schema';
import { mergeIndices } from '../schema/helpers/indices';
import { getIndexingState } from '../schema/extensions/IndexingExtension';
import ToolbarButton from './ToolbarButton.vue';

export default {
  props: ['editor', 'size', 'padding', 'buttonStyle'],
  components: { ToolbarButton },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    indices() {
      return this.configuration?.indices || []
    },
    allIndices(): Index[] {
      if (this.editor) {
        const indexingState = getIndexingState(this.editor.state)
        if (indexingState)
          return mergeIndices(indexingState.indices, indexingState.docIndices)
      }
      return []
    },
  },
  methods: {
    isActive(name: string, attrs?: Record<string, any>) {
      return this.editor && this.editor.isActive(name, attrs);
    },
    defaultIndexIconSvg() {
      // return 'M14,3V13L17.2,11.31L17.42,11.28C17.71,11.28 17.97,11.4 18.16,11.6L18.9,12.37L14,16.57C13.74,16.84 13.39,17 13,17H6.5C5.73,17 5,16.3 5,15.5V11.14C5,10.53 5.35,10 5.85,9.8L10.79,7.6L12,7.47V3A1,1 0 0,1 13,2A1,1 0 0,1 14,3M5,19H13V22H5V19Z';
      return 'mdi-cursor-pointer'
    },
    defaultIndexColor() {
      return DEFAULT_INDEX_COLOR
    },
    addIndexRef(index: Index) {
      this.editor.commands.runRepeatableCommandsChain(
        [
          ['focus'],
          ['addIndexRef', index]
        ],
        `add reference to index "${index.indexName}"`
      )
      // editor.chain().focus().addIndexRef(index).run()
    }
  }
}
</script>