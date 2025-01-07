<template>
  <node-view-wrapper as="dl" class="meta-value meta-map">
    <dt>
      <q-card-actions class="no-padding" spellcheck="false">
        <q-btn size="md" :label="node.attrs.text" @click="editKey" no-caps />
        <q-space />
        <q-btn v-if="aroundListOrMap" rounded size="xs" :icon="iconFor('metaString')" title="new MetaString"
          @click="appendMetaItem('metaString', 'string')" />
        <q-btn v-if="aroundListOrMap" rounded size="xs" :icon="iconFor('metaInlines')" title="new MetaInlines"
          @click="appendMetaItem('metaInlines', 'inlines')" />
        <q-btn v-if="aroundListOrMap" rounded size="xs" :icon="iconFor('metaBlocks')" title="new MetaBlocks"
          @click="appendMetaItem('metaBlocks', 'blocks')" />
        <q-btn v-if="aroundListOrMap" rounded size="xs" :icon="iconFor('metaBool')" title="new MetaBool"
          @click="appendMetaItem('metaBool', 'bool')" />
        <q-btn v-if="aroundListOrMap" rounded size="xs" :icon="iconFor('metaList')" title="new MetaList"
          @click="appendMetaItem('metaList', 'list')" />
        <q-btn v-if="aroundListOrMap" rounded size="xs" :icon="iconFor('metaMap')" title="new MetaMap"
          @click="appendMetaItem('metaMap', 'map')" />
        <q-space />
        <q-btn icon="mdi-pencil" rounded size="xs" title="edit the metadata key" @click="editKey" />
        <q-btn icon="mdi-arrow-up" rounded size="xs" title="move this metadata entry up"
          @click="editor.commands.moveMetaMapEntryUp(getPos())" />
        <q-btn icon="mdi-arrow-down" rounded size="xs" title="move this metadata entry down"
          @click="editor.commands.moveMetaMapEntryDown(getPos())" />
        <q-btn icon="mdi-trash-can" rounded size="xs" title="remove this metadata entry" @click="deleteEntry" />
      </q-card-actions>
    </dt>
    <dd><node-view-content /></dd>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { ACTION_EDIT_META_MAP_TEXT } from '../../actions';
import { useActions } from '../../stores';
import { editorKeyFromState } from '../../schema';
import { nodeIcon } from '../../schema/helpers';
import { NODE_NAME_META_LIST, NODE_NAME_META_MAP, NODE_NAME_METADATA } from '../../common';

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
    containsMetaMap() {
      return this.metaValue?.type.name === NODE_NAME_META_MAP
    },
    containsMetaList() {
      return this.metaValue?.type.name === NODE_NAME_META_LIST
    },
    aroundListOrMap() {
      return this.containsMetaList || this.containsMetaMap
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
    appendMetaItem(metaType: string, key: string) {
      const pos = this.metaValue ? this.getPos() + 2 : undefined
      if (this.containsMetaMap)
        this.editor.commands.appendMetaMapEntry(key, metaType, pos)
      else if (this.containsMetaList)
        this.editor.commands.appendMetaListItem(metaType, pos)
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