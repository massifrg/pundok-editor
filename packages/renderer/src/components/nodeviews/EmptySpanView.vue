<template>
  <node-view-wrapper class="inline-wrapper draggable-item">
    <span v-if="type === 'index'" class="p-pa-xs" :style="{ backgroundColor: isUnderCursor ? '#3584e4' : '' }">
      <q-icon v-if="type === 'index'" size="sm" :name="iconSvg" :style="{ color: color }" :title="title">
        <q-badge v-if="!idref" color="red" floating rounded :style="{ color: overColor }" />
      </q-icon>
    </span>
    <span v-if="type === 'milestone'" :class="classes" :title="title">{{ node.attrs.kv['page-number'] || 'MS'
    }}</span>
    <span v-if="type === 'anchor'" :class="classes" :title="title">⚓</span>
    <node-view-content as="span" class="content" />
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps, Editor } from '@tiptap/vue-3';
import { getEditorConfiguration } from '../../schema';
import { Index } from '../../common';

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
      const indexName = this.node.attrs?.kv?.index;
      return indexName && this.indices.find(i => i.indexName === indexName);
    },
    type() {
      if (this.index) return 'index';
      const classes = this.node.attrs.classes || [];
      if (classes.includes('milestone')) return 'milestone';
      if (classes.includes('anchor')) return 'anchor';
      return 'unknown';
    },
    classes() {
      const classes = [...this.node.attrs.classes];
      if (this.isUnderCursor) classes.push('under-cursor');
      return classes;
    },
    title() {
      const classes = this.node.attrs.classes || [];
      const attributes = this.node.attrs.kv || {};
      switch (this.type) {
        case 'index':
          const text = attributes['indexed-text'];
          const info: string[] = []
          if (this.index.indexName) info.push(`${this.index.indexName} index`)
          if (attributes.idref)
            info.push(`, term with id "${attributes.idref}"`)
          else
            info.push('no idref')
          if (text) info.push(`indexed text: "${text}"`)
          return info.join(', ') || 'index ref'
        case 'milestone':
          {
            const pagenumber = attributes['page-number'];
            if (pagenumber) {
              if (classes.includes('start-of-page'))
                return `start of page ${pagenumber}`;
              if (classes.includes('end-of-page'))
                return `end of page ${pagenumber}`;
            }
          }
          return 'milestone';
        case 'anchor':
          {
            const id = this.node.attrs.id;
            if (id) return `anchor "${id}"`;
          }
          return 'anchor';
        default:
          return '';
      }
    },
    idref() {
      return this.node.attrs?.kv?.idref;
    },
    iconSvg() {
      return this.index && this.index.iconSvg;
    },
    color() {
      if (this.isUnderCursor) return 'white';
      return this.index && this.index.color;
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
