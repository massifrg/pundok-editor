<template>
  <node-view-wrapper as="dl" class="meta-value meta-map">
    <dt>
      <q-card-actions class="no-padding" spellcheck="false">
        <q-btn size="md" :label="node.attrs.text" @click="editKey" no-caps />
        <q-space />
        <q-btn icon="mdi-pencil" rounded size="xs" title="edit the metadata key" @click="editKey" />
        <q-btn icon="mdi-arrow-up" rounded size="xs" title="move this metadata entry up"
          @click="editor.commands.moveMetaMapUp(getPos())" />
        <q-btn icon="mdi-arrow-down" rounded size="xs" title="move this metadata entry down"
          @click="editor.commands.moveMetaMapDown(getPos())" />
        <q-btn icon="mdi-close" rounded size="xs" title="remove this metadata entry" @click="deleteNode" />
      </q-card-actions>
    </dt>
    <dd><node-view-content /></dd>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { ACTION_EDIT_META_MAP_TEXT } from '../../actions';
import { useActions } from '../../stores';
import { editorKeyFromState } from '../../schema';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  methods: {
    editKey() {
      const node = this.node
      const pos = this.getPos()
      const editorKey = editorKeyFromState(this.editor.state)
      if (editorKey) {
        useActions().setAction({
          ...ACTION_EDIT_META_MAP_TEXT,
          nodeOrMark: {
            node,
            pos,
            name: node.type.name,
            from: pos,
            to: pos
          },
          editorKey
        })
      }
    }
  }
};
</script>

<style lang="scss">
.meta-map-wrapper {
  margin: 0;
  padding: 0;
}
</style>