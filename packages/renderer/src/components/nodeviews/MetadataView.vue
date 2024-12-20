<template>
  <node-view-wrapper>
    <div spellcheck="false">
      <q-btn class="metadata-btn" no-caps size="sm" color="primary" :icon="icon" :label="label"
        @click="toggleMetadata" />
      <q-btn v-if="showMetadata" no-caps size="sm" color="primary" :icon="iconFor('metaString')" label="append a string"
        title="append MetaString" @click="appendMetaString" />
      <q-btn v-if="showMetadata" no-caps size="sm" color="primary" :icon="iconFor('metaInlines')" label="append a line"
        title="append MetaInlines" @click="appendMetaInlines" />
      <q-btn v-if="showMetadata" no-caps size="sm" color="primary" :icon="iconFor('metaBlocks')" label="append blocks"
        title="append MetaBlocks" @click="appendMetaBlocks" />
      <q-btn v-if="showMetadata" no-caps size="sm" color="primary" :icon="iconFor('metaBool')" label="append boolean"
        title="append MetaBool" @click="appendMetaBool" />
      <q-btn v-if="showMetadata" no-caps size="sm" color="primary" :icon="iconFor('metaList')" label="append list"
        title="append MetaList" @click="appendMetaList" />
      <q-btn v-if="showMetadata" no-caps size="sm" color="primary" :icon="iconFor('metaMap')" label="append map"
        title="append MetaMap" @click="appendMetaMap" />
    </div>
    <node-view-content :class="classAttr" />
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { nodeIcon, nodeOrMarkToPandocName } from '../../schema/helpers';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  data() {
    return {
      showMetadata: false
    }
  },

  computed: {
    icon() {
      return this.showMetadata ? 'mdi-minus' : 'mdi-plus'
    },
    label() {
      return this.showMetadata ? 'hide document metadata' : 'show document metadata'
    },
    classAttr() {
      return this.showMetadata ? 'metadata-visible' : 'metadata-hidden'
    },
  },

  methods: {
    toggleMetadata() {
      this.showMetadata = !this.showMetadata
    },
    iconFor(nodetypename: string) {
      return nodeIcon(nodetypename)
    },
    labelFor(nodetypename: string) {
      return `append a ${nodeOrMarkToPandocName(nodetypename)}`
    },
    appendMetaMap() {
      this.editor.commands.appendMetaMapEntry('map', 'metaMap')
    },
    appendMetaList() {
      this.editor.commands.appendMetaMapEntry('list', 'metaList')
    },
    appendMetaInlines() {
      this.editor.commands.appendMetaMapEntry('inlines', 'metaInlines')
    },
    appendMetaBlocks() {
      this.editor.commands.appendMetaMapEntry('blocks', 'metaBlocks')
    },
    appendMetaBool() {
      this.editor.commands.appendMetaMapEntry('bool', 'metaBool')
    },
    appendMetaString() {
      this.editor.commands.appendMetaMapEntry('string', 'metaString')
    }
  }
};
</script>

<style lang="scss">
.metadata-btn {
  font-family: monospace;
}

.metadata-visible {
  display: block
}

.metadata-hidden {
  display: none
}
</style>