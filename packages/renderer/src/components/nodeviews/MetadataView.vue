<template>
  <node-view-wrapper>
    <div spellcheck="false">
      <q-btn class="metadata-btn" no-caps size="sm" color="primary" :icon="icon" :label="label"
        @click="toggleMetadata" />
      <node-view-content :class="classAttr" style="margin-top: 0.3rem" />
      <div :style="{ display: showMetadata ? 'inline-block' : 'none' }">
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaString')"
          :label="$t('appendMeta.label.MetaString')" :title="$t('appendMeta.title.MetaString')"
          @click="appendMetaString" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaInlines')"
          :label="$t('appendMeta.label.MetaInlines')" alabel="append a line" :title="$t('appendMeta.title.MetaInlines')"
          @click="appendMetaInlines" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaBlocks')"
          :label="$t('appendMeta.label.MetaBlocks')" alabel="append blocks" :title="$t('appendMeta.title.MetaBlocks')"
          @click="appendMetaBlocks" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaBool')" :label="$t('appendMeta.label.MetaBool')"
          alabel="append boolean" :title="$t('appendMeta.title.MetaBool')" @click="appendMetaBool" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaList')" :label="$t('appendMeta.label.MetaList')"
          alabel="append list" :title="$t('appendMeta.title.MetaList')" @click="appendMetaList" />
        <q-btn no-caps size="sm" color="primary" :icon="iconFor('metaMap')" :label="$t('appendMeta.label.MetaMap')"
          alabel="append map" :title="$t('appendMeta.title.MetaMap')" @click="appendMetaMap" />
        <q-btn v-if="customMetadata.length === 1" no-caps size="sm" color="primary"
          :icon="iconForCustomMeta(customMetadata[0])"
          :label="$t('appendMeta.label.customMeta', { name: customMetadata[0].name || $t('appendMeta.label.customMetaDefaultName') })"
          :title="customMetadata[0].description" @click="appendCustomMetaMapEntry(customMetadata[0])" />
        <q-btn-dropdown v-if="customMetadata.length > 1" no-caps size="sm" color="primary" icon="metadata_custom"
          :label="$t('appendMeta.label.customMeta')" :title="$t('appendMeta.title.customMeta')">
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

<script setup lang="ts">
import { setupQuasarIcons } from '../helpers';
setupQuasarIcons()
</script>

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
import { t } from "../../i18n"

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
      return this.showMetadata ? 'collapse' : 'expand'
    },
    label() {
      const t = this.$t
      return t('showHideMetadata', { action: this.showMetadata ? t('Hide') : t('Show') })
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