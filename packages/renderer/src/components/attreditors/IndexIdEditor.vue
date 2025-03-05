<template>
  <q-input class="q-mx-xs" v-model="searchText" label="text to search" stack-label debounce="500"
    @update:model-value="updateSearchText">
    <template v-slot:append>
      <q-btn-dropdown v-if="variants.length > 0" title="what to search" color="primary" size="sm" auto-close
        :label="optionVariant">
        <q-list>
          <q-item v-for="variant in variants" dense clickable @click="setVariant(variant)">
            <q-item-section>{{ variant }}</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn color="primary" size="sm" @click="optionEveryWord = !optionEveryWord" :label="labelEveryWord" />
      <q-btn-dropdown v-if="sources.length > 0" color="primary" size="sm" auto-close :icon="sourceIcon()"
        :label="sourceLabel()" :title="sourceTitle()">
        <q-list>
          <q-item v-for="(s, i) in (sources as IndexSource[])" dense clickable :title="sourceTitle(s)"
            @click="switchToSource(i)">
            <q-item-section side>
              <q-icon :name="sourceIcon(s)" />
            </q-item-section>
            <q-item-section>{{ sourceLabel(s) }}</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn v-if="currentSource.type !== 'json-file'" icon="mdi-refresh" color="primary" size="sm"
        title="refresh project indices" @click="refreshIndicesCache" />
    </template>
  </q-input>
  <q-banner v-if="lastError" inline-actions class="text-white bg-red q-my-xs">
    {{ lastError }}
    <template v-slot:action>
      <q-btn flat color="white" label="hide" @click="lastError = undefined" />
    </template>
  </q-banner>
  <q-table :rows="results" :columns="columns" :loading="pendingSearch" row-key="id" @row-click="selectResult"
    @row-dblclick="selectResultAndCommit">
    <template v-slot:loading>
      <q-inner-loading showing color="primary" />
    </template>
  </q-table>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { useBackend, useProjectCache } from '../../stores';
import {
  DEFAULT_INDEX_NAME,
  IndexSource,
  IndexSourceJsonFile,
  IndexTermQuery,
  ProjectIndexQuery,
  QueryResult,
  searchQueryResults
} from '../../common';
import { QTableProps } from 'quasar';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { getDocState, termsOfDocumentIndex } from '../../schema';
import { Editor } from '@tiptap/vue-3';

const SEARCHTEXT_MIN_LENGTH = 1
export type SearchTextVariant =
  | 'first-3-words'
  | 'first-2-words'

const columns: QTableProps['columns'] = [
  {
    name: 'id',
    label: 'id',
    align: 'left',
    field: 'id',
    sortable: true,
  },
  {
    name: 'text',
    label: 'text',
    align: 'left',
    field: (row: QueryResult) => row.text,
    sortable: true,
  },
]

export default {
  setup() {
    setupQuasarIcons();
  },
  props: [
    'editor',
    'indexName',
    'idAttr',
    'startValue',
    'startingSearchText',
    'startingSearchTextVariant',
    'searchEveryWord',
    'sources',
    'defaultSource'
  ],
  emits: ['selected', 'update-attribute', 'change-search-text-variant', 'commit'],
  data() {
    let sourceIndex = (this.sources as IndexSource[]).findIndex(s => s.type === this.defaultSource)
    sourceIndex = sourceIndex >= 0 ? sourceIndex : 0
    return {
      selected: this.startValue as string | undefined,
      searchText: this.startingSearchText || '',
      optionEveryWord: !!this.searchEveryWord,
      optionSourceIndex: sourceIndex,
      optionVariant: (this.startingSearchTextVariant || 'first-3-words') as SearchTextVariant,
      variants: ['first-3-words', 'first-2-words'] as SearchTextVariant[],
      results: [] as QueryResult[],
      lastError: undefined as string | undefined,
      pendingSearch: false,
      columns: columns.map(c => ({
        ...c,
        classes: (row: any) => this.isSelected(row) ? 'bg-amber-4' : ''
      })),
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    ...mapState(useProjectCache, ['indicesCache']),
    indexTermsCache(): QueryResult[] | undefined {
      const indices = useProjectCache().indicesCache
      return indices && this.indexName && indices[this.indexName]
    },
    lastSaveResponse() {
      return getDocState((this.editor as Editor)?.state)?.lastSaveResponse
    },
    labelEveryWord() {
      return this.optionEveryWord ? 'every word' : 'exact text'
    },
    titleEveryWord() {
      return this.optionEveryWord
        ? "search terms that contain all this words (click to switch to searching exact text)"
        : "search exact text (click to swith searching words)"
    },
    currentSource(): IndexSource {
      return this.sources[this.optionSourceIndex] as IndexSource
    },
  },
  mounted() {
    if (this.searchText.length >= SEARCHTEXT_MIN_LENGTH) this.doSearch()
  },
  watch: {
    optionEveryWord(newValue, oldValue) {
      if (newValue !== oldValue) this.doSearch()
    },
    startingSearchText(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.searchText = newValue
        this.doSearch()
      }
    }
  },
  methods: {
    sourceLabel(source?: IndexSource) {
      const sourceType = (source || this.currentSource).type
      switch (sourceType) {
        case 'json-file':
          return 'JSON file'
        case 'document':
        case 'project':
        default:
          return sourceType
      }
    },
    sourceIcon(source?: IndexSource) {
      const sourceType = (source || this.currentSource).type
      switch (sourceType) {
        case 'document':
          return 'mdi-file-document-outline'
        case 'project':
          return 'mdi-file-tree'
        case 'json-file':
          return 'mdi-code-json'
        default:
          return 'mdi-book-alphabet'
      }
    },
    sourceTitle(source?: IndexSource) {
      const sourceType = (source || this.currentSource).type
      switch (sourceType) {
        case 'document':
          return 'search among the index terms defined in this document (in metadata too)'
        case 'project':
          return 'search among the index terms defined in this project'
        case 'json-file':
          const s = (source || this.currentSource) as IndexSourceJsonFile
          return `search in an external "${s.filename || 'index.json'}" file with { "id": "...", "text": "..." }`
        default:
          return undefined
      }
    },
    async doSearch(text?: string) {
      let searchText: string | string[] = text || this.searchText
      if (this.optionEveryWord)
        searchText = (searchText as string).split(/[ .,/-]+/).filter(w => w.length > 0)
      if (searchText.length < SEARCHTEXT_MIN_LENGTH) {
        // this.results = []
        return
      }
      switch (this.currentSource.type) {
        case 'document':
          if (!this.indexTermsCache) this.refreshDocumentIndices()
          this.results = searchQueryResults(this.indexTermsCache!, searchText)
          break
        case 'project':
          if (!this.indexTermsCache) await this.refreshProjectIndices()
          this.results = searchQueryResults(this.indexTermsCache!, searchText)
          break
        case 'json-file':
          const docState = getDocState(this.editor?.state)
          const query: IndexTermQuery = {
            type: 'index-term',
            indexName: this.indexName || DEFAULT_INDEX_NAME,
            searchText,
            options: {
              kind: 'index',
              project: docState?.project,
              configurationName: docState?.configuration?.name,
              // path: this.lastSaveResponse?.doc.path,
            }
          }
          this.pendingSearch = true
          this.backend?.queryDatabase(query)
            .then(results => {
              this.results = results
              this.pendingSearch = false
            })
            .catch(err => {
              this.lastError = `ERROR: ${err}`
              this.pendingSearch = false
            })
          break
      }
    },
    async refreshIndicesCache() {
      switch (this.currentSource.type) {
        case 'document':
          this.refreshDocumentIndices()
          break
        case 'project':
          this.refreshProjectIndices()
          break
        default:
      }
    },
    refreshDocumentIndices() {
      this.pendingSearch = true
      const nodes = termsOfDocumentIndex(this.editor?.state.doc, this.indexName)
      const index_terms: QueryResult[] = nodes.map(n => ({
        id: n.attrs.id,
        text: n.textContent
      }))
      if (index_terms)
        useProjectCache().setIndex(this.indexName, index_terms)
      this.pendingSearch = false
    },
    async refreshProjectIndices() {
      const docState = getDocState(this.editor?.state)
      const query: ProjectIndexQuery = {
        type: 'project-index',
        indexName: this.indexName || DEFAULT_INDEX_NAME,
        options: {
          kind: 'index',
          project: docState?.project,
          configurationName: docState?.configuration?.name,
          // path: this.lastSaveResponse?.doc.path,
        }
      }
      this.pendingSearch = true
      const index_terms = await this.backend?.queryDatabase(query)
      if (index_terms)
        useProjectCache().setIndex(this.indexName, index_terms)
      this.pendingSearch = false
    },
    updateSearchText(text: string | number | null) {
      if (text !== null) {
        this.doSearch(text.toString())
      }
    },
    selectResult(evt: Event, row: QueryResult, index: number) {
      this.selected = row.id
      this.$emit('selected', row.id)
      this.$emit('update-attribute', this.idAttr || 'id', row.id)
    },
    selectResultAndCommit(evt: Event, row: QueryResult, index: number) {
      this.selectResult(evt, row, index)
      this.$emit('commit')
    },
    isSelected(row: any): boolean {
      return this.selected == row.id
    },
    async switchToSource(index: number) {
      const oldIndex = this.optionSourceIndex
      const newIndex = index % this.sources.length
      this.optionSourceIndex = newIndex
      this.indexTermsCache = undefined
      if (oldIndex !== this.optionSourceIndex) {
        this.doSearch()
      }
    },
    setVariant(variant: SearchTextVariant) {
      this.optionVariant = variant
      this.$emit('change-search-text-variant', variant)
    }
  }
}
</script>