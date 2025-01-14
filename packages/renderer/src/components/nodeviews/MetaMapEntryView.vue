<template>
  <node-view-wrapper as="div" class="meta-value meta-map-entry">
    <div class="meta-map-entry-key" :style="entryKeyStyle">
      <q-card-actions class="no-padding" spellcheck="false">
        <q-btn size="sm" :icon="iconForContent" :label="node.attrs.text" :title="titleForContent" @click="editKey"
          no-caps />
        <!-- <q-space /> -->
        <!-- <q-btn icon="mdi-pencil" rounded size="xs" title="edit the metadata key" @click="editKey" /> -->
        <q-btn icon="mdi-arrow-up" rounded size="xs" title="move this metadata entry up"
          @click="editor.commands.moveMetaMapEntryUp(getPos())" />
        <q-btn icon="mdi-arrow-down" rounded size="xs" title="move this metadata entry down"
          @click="editor.commands.moveMetaMapEntryDown(getPos())" />
        <q-btn icon="mdi-trash-can" rounded size="xs" title="remove this metadata entry" @click="deleteEntry" />
      </q-card-actions>
    </div>
    <div class="meta-map-entry-value" :style="entryValueStyle">
      <node-view-content as="div" />
    </div>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { ACTION_EDIT_META_MAP_TEXT } from '../../actions';
import { useActions } from '../../stores';
import { editorKeyFromState } from '../../schema';
import { nodeIcon, nodeOrMarkToPandocName } from '../../schema/helpers';
import { NODE_NAME_META_BOOL, NODE_NAME_META_INLINES, NODE_NAME_META_LIST, NODE_NAME_META_MAP, NODE_NAME_META_STRING, NODE_NAME_METADATA } from '../../common';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  computed: {
    metaValue() {
      const doc: ProsemirrorNode = this.editor.state.doc
      const node = doc && doc.nodeAt(this.getPos())
      return node?.firstChild || null
    },
    iconForContent() {
      const contentTypename = this.metaValue?.type.name
      return contentTypename && this.iconFor(contentTypename)
    },
    titleForContent() {
      return `this entry contains a ${this.metaValuePandocName()}`
    },
    containsInline() {
      const contentTypename = this.metaValue?.type.name
      return contentTypename === NODE_NAME_META_BOOL
        || contentTypename === NODE_NAME_META_STRING
        || contentTypename === NODE_NAME_META_INLINES
    },
    containsMetaMap() {
      return this.metaValue?.type.name === NODE_NAME_META_MAP
    },
    containsMetaList() {
      return this.metaValue?.type.name === NODE_NAME_META_LIST
    },
    entryKeyStyle() {
      return this.containsInline ? 'display: inline-block' : ''
    },
    entryValueStyle() {
      return this.containsInline ? 'display: inline-block' : ''
    }
  },

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
    },
    iconFor(nodetypename: string) {
      return nodeIcon(nodetypename)
    },
    metaValuePandocName() {
      return this.metaValue && nodeOrMarkToPandocName(this.metaValue)
    },
    deleteEntry() {
      const $pos = this.editor.state.doc.resolve(this.getPos())
      const parent = $pos.node()
      console.log(parent.type.name)
      if (parent.childCount > 1 || parent.type.name === NODE_NAME_METADATA) {
        this.deleteNode()
      } else {
        const ppos = $pos.start(-1) - 1
        console.log(`ppos=${ppos}`)
        this.editor.commands.deleteNodeAtPos(ppos)
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