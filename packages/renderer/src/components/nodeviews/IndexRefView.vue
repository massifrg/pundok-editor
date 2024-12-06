<template>
  <node-view-wrapper class="inline-wrapper draggable-item">
    <span class="p-pa-xs" :style="{ backgroundColor: isUnderCursor ? '#3584e4' : '' }">
      <q-icon size="sm" :name="iconSvg" :style="{ color: color }" :title="title">
        <q-badge v-if="!idref" color="red" floating rounded :style="{ color: overColor }" />
      </q-icon>
    </span>
    <node-view-content as="span" class="content" />
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps, Editor } from '@tiptap/vue-3';
import { DEFAULT_INDEX_COLOR, DEFAULT_INDEX_ICON_SVG, DEFAULT_INDEX_NAME, Index } from '../../common';
import { getEditorConfiguration } from '../../schema';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  computed: {
    configuration() {
      return getEditorConfiguration(this.editor as Editor)
    },
    indices(): Index[] {
      return this.configuration?.indices || []
    },
    index() {
      const indexName = this.node.attrs?.kv['index-name'];
      return indexName && this.indices.find(i => i.indexName === indexName)
    },
    // classes() {
    //   const classes = [...this.node.attrs.classes];
    //   if (this.isUnderCursor) classes.push('under-cursor');
    //   return classes;
    // },
    title() {
      const kv = this.node.attrs.kv || {};
      const text = kv['indexed-text'];
      const info: string[] = []
      const index = this.index
      const indexName = index && index.indexName || DEFAULT_INDEX_NAME
      info.push(`index "${indexName}"`)
      if (kv.idref)
        info.push(`term with id "${kv.idref}"`)
      else
        info.push('no idref')
      if (text) info.push(`indexed text: "${text}"`)
      return info.join(', ') || 'index ref'
    },
    idref() {
      return this.node.attrs?.kv?.idref;
    },
    iconSvg() {
      return this.index && this.index.iconSvg || DEFAULT_INDEX_ICON_SVG;
    },
    color() {
      if (this.isUnderCursor) return 'white';
      return this.index && this.index.color || DEFAULT_INDEX_COLOR;
      // return 'black'
    },
    overColor() {
      if (this.isUnderCursor) return '#e0e0e0';
      return 'red';
    },
    isUnderCursor() {
      const { from, to } = this.editor.state.selection;
      // console.log(`from=${from} to=${to} getPos=${this.getPos()}`)
      const pos = this.getPos();
      return pos >= from && pos < to && to > from;
    },
  },
};
</script>

<style lang="scss">
.inline-wrapper {
  display: inline;
}

.under-cursor {
  background-color: #3584e4 !important;
}
</style>