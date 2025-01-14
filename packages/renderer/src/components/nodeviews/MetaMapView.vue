<template>
  <node-view-wrapper as="div" class="meta-value meta-map">
    <node-view-content class="meta-map-content" as="div" />
    <q-card-actions class="meta-plural-commands" spellcheck="false">
      <q-btn rounded size="xs" :icon="iconFor('metaString')" title="new MetaString"
        @click="appendMetaItem('metaString', 'string')" />
      <q-btn rounded size="xs" :icon="iconFor('metaInlines')" title="new MetaInlines"
        @click="appendMetaItem('metaInlines', 'inlines')" />
      <q-btn rounded size="xs" :icon="iconFor('metaBlocks')" title="new MetaBlocks"
        @click="appendMetaItem('metaBlocks', 'blocks')" />
      <q-btn rounded size="xs" :icon="iconFor('metaBool')" title="new MetaBool"
        @click="appendMetaItem('metaBool', 'bool')" />
      <q-btn rounded size="xs" :icon="iconFor('metaList')" title="new MetaList"
        @click="appendMetaItem('metaList', 'list')" />
      <q-btn rounded size="xs" :icon="iconFor('metaMap')" title="new MetaMap"
        @click="appendMetaItem('metaMap', 'map')" />
      <q-space />
    </q-card-actions>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { nodeIcon } from '../../schema/helpers';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  methods: {
    iconFor(nodetypename: string) {
      return nodeIcon(nodetypename)
    },
    appendMetaItem(metaType: string, key: string) {
      const pos = this.getPos() + this.node.content.size + 1
      this.editor.commands.appendMetaMapEntry(key, metaType, pos)
    },
  }
};
</script>