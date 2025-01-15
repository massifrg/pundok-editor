<template>
  <node-view-wrapper>
    <div :spellcheck="false" style="position: relative">
      <pre :class="classAttr" :data-format="node.attrs.format"><node-view-content as="code" /></pre>
      <span class="format-label" :onclick="openAttributesEditor">{{ format }}</span>
    </div>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { RawBlock } from '../../schema'
import { setActionEditAttributes } from '../../actions';
import { SelectedNodeOrMark } from '../../schema/helpers';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  data() {
  },

  computed: {
    format() {
      return this.node.attrs.format
    },
    formatClass() {
      const format = this.format
      return format ? `format-${format}` : ''
    },
    classAttr() {
      const c = RawBlock.options.HTMLAttributes?.class
      return c ? `${c} ${this.formatClass}` : this.formatClass
    }
  },

  methods: {
    openAttributesEditor(event: Event) {
      const node = this.node
      if (node) {
        const pos = this.getPos()
        const selNode: SelectedNodeOrMark = {
          name: node.type.name,
          node,
          pos,
          from: pos,
          to: pos
        }
        setActionEditAttributes(this.editor.state, selNode, 'format')
      }
      event.preventDefault()
    }
  },

};
</script>

<style lang="scss">
.format-label {
  position: absolute;
  top: .3rem;
  right: 1rem;
  padding: 3px;
  border-radius: .3rem;
  background-color: rgb(125, 125, 125);
  color: white;
  opacity: .7;
  font-family: monospace;
  font-size: small;
  font-weight: bold;
  cursor: pointer;
  text-transform: uppercase;
}
</style>
