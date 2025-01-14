<template>
  <node-view-wrapper class="meta-bool-wrapper meta-value meta-bool" as="div">
    <q-checkbox v-model="label" true-value="True" false-value="False" :label="label" size="sm"
      @update:model-value="updateValue" />
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  computed: {
    label() {
      return this.node.attrs.value
    },
  },

  methods: {
    updateValue(newValue: string | number | null) {
      this.updateAttributes({ value: newValue })
    }
  }
};
</script>

<style lang="scss">
.meta-bool-wrapper {
  margin: 0;
  padding: 0;

  & div {
    margin: 0;
    padding: 0;
  }
}
</style>
