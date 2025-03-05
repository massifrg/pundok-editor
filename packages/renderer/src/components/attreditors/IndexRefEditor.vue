<template>
  <q-card>
    <q-card-section class="q-mx-sm" horizontal>
      <q-input class="q-mx-xs" :model-value="idref" label="idref" stack-label @update:model-value="updateIdref"
        style="min-width: 40%" />
      <q-space />
      <q-input class="q-mx-xs" disable :model-value="indexName" label="index-name" stack-label @update:model-value=""
        style="min-width: 40%" />
    </q-card-section>
    <q-card-section>
      <IndexIdEditor :editor="editor" :index-name="indexName" :start-value="idref" :starting-search-text="indexedText"
        search-every-word="true" :sources="sources" :default-source="defaultSource" @selected="idrefSelected"
        @commit="$emit('commit')" />
    </q-card-section>
    <q-card-actions class="q-my-md" align="center">
      <q-btn-toggle :model-value="indexRange" :options="rangeOptions()" toggle-color="primary" color="white"
        text-color="primary" @update:model-value="updateIndexRange" />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import {
  getEditorProject,
  INDEX_RANGE_NONE,
  INDEX_RANGE_START,
  INDEX_RANGE_STOP
} from '../../schema';
import {
  Index,
  INDEX_NAME_ATTR,
  INDEX_RANGE_ATTR,
  INDEXED_TEXT_ATTR,
  IndexSource,
  IndexSourceJsonFile
} from '../../common';
import IndexIdEditor from './IndexIdEditor.vue';
import { documentIndices } from '../../schema/helpers/indices';

export interface KvAttribute {
  key: string,
  value: string,
}

export default {
  components: { IndexIdEditor },
  props: ['editor', 'nodeOrMark', 'originalEntries', 'initialEntries'],
  emits: ['update-attribute', 'commit'],
  data() {
    const entries: KvAttribute[] = [...(this.initialEntries || [] as KvAttribute[])]
    return {
      entries,
      searchTerm: '',
      defaultSource: 'document',
    };
  },
  computed: {
    indexName() {
      const e = this.entryWithKey(INDEX_NAME_ATTR, this.entries)
      return e && e.value || ''
    },
    idref() {
      const e = this.entryWithKey('idref', this.entries)
      return e && e.value || ''
    },
    indexRange() {
      const e = this.entryWithKey(INDEX_RANGE_ATTR, this.entries)
      return e && e.value || INDEX_RANGE_NONE
    },
    indexedText() {
      const e = this.entryWithKey(INDEXED_TEXT_ATTR, this.entries)
      return e?.value || ''
    },
    sources(): IndexSource[] {
      const project = getEditorProject(this.editor)
      const sources: IndexSource[] = project ? [{ type: 'project' }] : []
      sources.push({
        type: 'json-file',
        filename: (this.indexName || "index") + '.json'
      } as IndexSourceJsonFile)
      const doc = this.editor?.state.doc
      const docIndices: Index[] = doc && documentIndices(doc) || []
      const index = this.indexName ? docIndices.find(i => i.indexName == this.indexName) : undefined
      if (index) {
        this.defaultSource = 'document'
        sources.push({ type: 'document' })
      }
      return sources
    }
  },
  watch: {
    initialEntries(newEntries) {
      this.entries = [...(newEntries || [])] as KvAttribute[];
    },
  },
  methods: {
    emitUpdate() {
      this.$emit('update-attribute', 'kv', Object.fromEntries((this.entries as KvAttribute[]).map(e => [e.key, e.value])))
    },
    entryWithKey(key: string, entries?: any[]): KvAttribute | undefined {
      if (entries) {
        return (entries as KvAttribute[]).find(e => e.key === key)
      }
      return undefined
    },
    remove(key: string) {
      this.entries = (this.entries as KvAttribute[]).filter(e => e.key !== key)
      this.emitUpdate()
    },
    // reset(key: string) {
    //   const originalEntry = this.entryWithKey(key, this.originalEntries)
    //   if (originalEntry !== undefined) {
    //     this.entries = (this.entries as KvAttribute[]).map(e => e.key === key ? { ...e, value: originalEntry.value } : e)
    //   }
    // },
    setNewValueForAttr(attrName: string, newAttrValue: string | number) {
      let changed = false
      let newEntries: KvAttribute[] = []
      if (this.entries.find(e => e.key === attrName)) {
        newEntries = this.entries.map(e => {
          if (e.key === attrName && e.value != newAttrValue) {
            changed = true
            return { ...e, value: newAttrValue } as KvAttribute
          } else {
            return e
          }
        })
      } else {
        newEntries = [...this.entries, { key: attrName, value: newAttrValue.toString() }]
        changed = true
      }
      if (changed) {
        this.entries = newEntries
        this.emitUpdate()
      }
    },
    updateIdref(newValue: string | number | null) {
      console.log(`updating idref to ${newValue}`)
      this.setNewValueForAttr('idref', newValue && newValue.toString() || '')
    },
    rangeOptions() {
      return [
        { label: 'punctual, no range', value: INDEX_RANGE_NONE },
        { label: 'start', value: INDEX_RANGE_START },
        { label: 'stop', value: INDEX_RANGE_STOP },
      ]
    },
    updateIndexRange(newValue: string) {
      if (!newValue || newValue === INDEX_RANGE_NONE)
        this.remove(INDEX_RANGE_ATTR)
      else
        this.setNewValueForAttr(INDEX_RANGE_ATTR, newValue)
    },
    idrefSelected(idref: string) {
      this.setNewValueForAttr('idref', idref)
    }
  },
};
</script>
