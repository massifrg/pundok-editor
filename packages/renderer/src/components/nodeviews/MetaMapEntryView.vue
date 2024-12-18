<template>
  <node-view-wrapper as="dl" class="meta-value meta-map">
    <dt>
      <q-card-actions class="no-padding" spellcheck="false">
        <q-btn size="md" :label="node.attrs.text" @click="editKey" no-caps />
        <q-space />
        <q-btn v-if="containsMetaMap" no-caps size="xs" color="primary" :icon="iconFor('metaString')"
          title="new MetaString" @click="appendMetaString" />
        <q-btn v-if="containsMetaMap" no-caps size="xs" color="primary" :icon="iconFor('metaInlines')"
          title="new MetaInlines" @click="appendMetaInlines" />
        <q-btn v-if="containsMetaMap" no-caps size="xs" color="primary" :icon="iconFor('metaBlocks')"
          title="new MetaBlocks" @click="appendMetaBlocks" />
        <q-btn v-if="containsMetaMap" no-caps size="xs" color="primary" :icon="iconFor('metaBool')" title="new MetaBool"
          @click="appendMetaBool" />
        <q-btn v-if="containsMetaMap" no-caps size="xs" color="primary" :icon="iconFor('metaList')" title="new MetaList"
          @click="appendMetaList" />
        <q-btn v-if="containsMetaMap" no-caps size="xs" color="primary" :icon="iconFor('metaMap')" title="new MetaMap"
          @click="appendMetaMap" />
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
import { editorKeyFromState, MetaMap } from '../../schema';
import { nodeIcon } from '../../schema/helpers';

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
      return this.metaValue?.type.name === MetaMap.name
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
    appendMetaMap() {
      const pos = this.metaValue ? this.getPos() + 2 : undefined
      this.editor.commands.appendMetaMapEntry('map', 'metaMap', pos)
    },
    appendMetaList() {
      const pos = this.metaValue ? this.getPos() + 2 : undefined
      this.editor.commands.appendMetaMapEntry('list', 'metaList', pos)
    },
    appendMetaInlines() {
      const pos = this.metaValue ? this.getPos() + 2 : undefined
      this.editor.commands.appendMetaMapEntry('inlines', 'metaInlines', pos)
    },
    appendMetaBlocks() {
      const pos = this.metaValue ? this.getPos() + 2 : undefined
      this.editor.commands.appendMetaMapEntry('blocks', 'metaBlocks', pos)
    },
    appendMetaBool() {
      const pos = this.metaValue ? this.getPos() + 2 : undefined
      this.editor.commands.appendMetaMapEntry('bool', 'metaBool', pos)
    },
    appendMetaString() {
      const pos = this.metaValue ? this.getPos() + 2 : undefined
      this.editor.commands.appendMetaMapEntry('string', 'metaString', pos)
    },
    deleteEntry() {
      const $pos = this.editor.state.doc.resolve(this.getPos())
      const parent = $pos.node()
      console.log(parent.type.name)
      if (parent.childCount > 1) {
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