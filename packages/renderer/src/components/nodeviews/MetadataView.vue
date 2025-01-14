<template>
  <node-view-wrapper>
    <div spellcheck="false">
      <q-btn class="metadata-btn" no-caps size="sm" color="primary" :icon="icon" :label="label"
        @click="toggleMetadata" />
      <node-view-content :class="classAttr" style="margin-top: 0.3rem" />
      <div :style="{ display: showMetadata ? 'inline-block' : 'none' }">
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaString')" label="append a string"
          title="append MetaString" @click="appendMetaString" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaInlines')" label="append a line"
          title="append MetaInlines" @click="appendMetaInlines" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaBlocks')" label="append blocks"
          title="append MetaBlocks" @click="appendMetaBlocks" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaBool')" label="append boolean"
          title="append MetaBool" @click="appendMetaBool" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaList')" label="append list" title="append MetaList"
          @click="appendMetaList" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaMap')" label="append map" title="append MetaMap"
          @click="appendMetaMap" />
        <q-btn-dropdown no-caps size="sm" color="primary" icon="mdi-help-circle-outline" label="append custom"
          title="append custom metadata from configuration">
          <q-list>
            <q-item v-for="cm in customMetadata" :key="cm.name" :title="cm.description" dense clickable v-close-popup
              color="primary" @click="appendCustomMetaMapEntry(cm)">
              <q-item-section side>
                <q-icon :name="iconForCustomMeta(cm)" color="primary" text-color="white" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ cm.name }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps, Editor } from '@tiptap/vue-3';
import { CustomMetadata } from '../../common';
import {
  anyToMetaValue,
  getEditorConfiguration,
  metaValueNameToNodeTypeName,
  nodeIcon,
  nodeOrMarkToPandocName
} from '../../schema/helpers';

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  data() {
    return {
      showMetadata: false
    }
  },

  computed: {
    configuration() {
      return getEditorConfiguration(this.editor as Editor)
    },
    customMetadata(): CustomMetadata[] {
      return this.configuration?.customMetadata || []
    },
    icon() {
      return this.showMetadata ? 'mdi-minus' : 'mdi-plus'
    },
    label() {
      return this.showMetadata ? 'hide document metadata' : 'show document metadata'
    },
    classAttr() {
      return this.showMetadata ? 'metadata-visible' : 'metadata-hidden'
    },
  },

  methods: {
    toggleMetadata() {
      this.showMetadata = !this.showMetadata
    },
    iconFor(nodetypename?: string) {
      return nodetypename && nodeIcon(nodetypename)
    },
    labelFor(nodetypename: string) {
      return `append a ${nodeOrMarkToPandocName(nodetypename)}`
    },
    iconForCustomMeta(cm: CustomMetadata) {
      return this.iconFor(metaValueNameToNodeTypeName(this.editor.state.schema, cm.type))
    },
    appendCustomMetaMapEntry(cm: CustomMetadata) {
      const schema = this.editor.state.schema
      const value = anyToMetaValue(schema, cm.default, cm.type)
        || metaValueNameToNodeTypeName(schema, cm.type)
      if (value) {
        this.editor.chain().appendMetaMapEntry(cm.name, value).focus().run()
      }
    },
    appendMetaMap() {
      this.editor.chain().appendMetaMapEntry('map', 'metaMap').focus().run()
    },
    appendMetaList() {
      this.editor.chain().appendMetaMapEntry('list', 'metaList').focus().run()
    },
    appendMetaInlines() {
      this.editor.chain().appendMetaMapEntry('inlines', 'metaInlines').focus().run()
    },
    appendMetaBlocks() {
      this.editor.chain().appendMetaMapEntry('blocks', 'metaBlocks').focus().run()
    },
    appendMetaBool() {
      this.editor.chain().appendMetaMapEntry('bool', 'metaBool').focus().run()
    },
    appendMetaString() {
      this.editor.chain().appendMetaMapEntry('string', 'metaString').focus().run()
    }
  }
};
</script>

<style lang="scss">
.metadata-btn {
  font-family: monospace;
}

.metadata-visible {
  display: block
}

.metadata-hidden {
  display: none
}
</style>