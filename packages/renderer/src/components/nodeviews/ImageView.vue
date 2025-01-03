<template>
  <node-view-wrapper class="inline-wrapper draggable-item">
    <node-view-content as="span" class="content">
      <img :src="src" />
    </node-view-content>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps, Editor } from '@tiptap/vue-3';
import { getEditorConfiguration, getEditorDocState } from '../../schema';

function baseUrl(editor: Editor): string {
  let baseUrl = ''
  const docState = getEditorDocState(editor)
  if (docState)
    baseUrl = docState.project?.path
      || docState.lastSaveResponse?.doc.path
      || docState.lastExportResponse?.doc.path
      || ''
  console.log(`image baseUrl: "${baseUrl}"`)
  console.log(editor)
  return baseUrl
}

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
    src() {
      return baseUrl(this.editor as Editor) + this.node.attrs.src
    }
  }
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
