<template>
  <q-input
    class="q-mx-xs"
    v-model="searchText"
    label="text to search"
    stack-label
    debounce="500"
    @update:model-value="updateSearchText"
    autofocus
    @keyup="keyup"
  >
    <template v-slot:append>
      <q-btn-dropdown
        v-if="variants.length > 0"
        title="what to search"
        color="primary"
        size="sm"
        auto-close
        :label="optionVariant"
      >
        <q-list>
          <q-item
            v-for="variant in variants"
            dense
            clickable
            @click="setVariant(variant)"
          >
            <q-item-section>{{ variant }}</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn
        color="primary"
        size="sm"
        @click="optionEveryWord = !optionEveryWord"
        :label="labelEveryWord"
      />
      <q-btn-dropdown
        v-if="sources.length > 0"
        color="primary"
        size="sm"
        :icon="sourceIcon()"
        :label="sourceLabel()"
        :title="sourceTitle()"
      >
        <q-list>
          <q-item
            v-for="(s, i) in orderedSources"
            :key="sourceKey(s, i)"
            dense
            clickable
            :title="sourceTitle(s)"
            @click="toggleSource(i)"
          >
            <q-item-section side>
              <q-icon
                :name="
                  selectedSourceIndices.includes(i)
                    ? 'checkbox'
                    : 'checkbox_outline_blank'
                "
              />
            </q-item-section>
            <q-item-section side
              ><q-icon :name="sourceIcon(s)"
            /></q-item-section>
            <q-item-section>{{ sourceLabel(s) }}</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn
        v-if="currentSources.some((s) => s.type !== 'json-file')"
        icon="reload"
        color="primary"
        size="sm"
        title="refresh project indices"
        @click="refreshIndicesCache"
      />
    </template>
  </q-input>
  <q-banner v-if="lastError" inline-actions class="text-white bg-red q-my-xs">
    {{ lastError }}
    <template v-slot:action>
      <q-btn flat color="white" label="hide" @click="lastError = undefined" />
    </template>
  </q-banner>
  <q-table
    :rows="results"
    :columns="columns"
    :loading="pendingSearch"
    row-key="id"
  >
    <template v-slot:loading>
      <q-inner-loading showing color="primary" />
    </template>
    <template v-slot:body="props">
      <q-tr
        :props="props"
        @click="selectResult($event, props.row, props.rowIndex)"
        @dblclick="selectResultAndCommit($event, props.row, props.rowIndex)"
      >
        <q-td
          v-for="col in props.cols"
          :key="col.name"
          :props="props"
          :class="
            col.name === 'source' ? sourceResultClass(props.row.source) : ''
          "
          :style="
            col.name === 'source'
              ? resultRowStyle(props.row)
              : col.name === 'id'
                ? idColumnStyle()
                : undefined
          "
        >
          <q-icon
            v-if="col.name === 'source'"
            :name="resultSourceIcon(props.row.source)"
            :title="resultSourceName(props.row.source)"
            size="1.25rem"
          />
          <template v-else>{{ col.value }}</template>
        </q-td>
      </q-tr>
    </template>
  </q-table>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from '../helpers';
setupQuasarIcons();
</script>

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
  searchQueryResults,
} from '../../common';
import { QTableProps } from 'quasar';
import type { ResourceFile } from '../../common';
import {
  getDocState,
  SearchTextVariant,
  termsOfDocumentIndex,
} from '../../schema';

const SEARCHTEXT_MIN_LENGTH = 1;

function sourcePriority(source: IndexSource): number {
  switch (source.type) {
    case 'document':
      return 0;
    case 'project':
      return 1;
    case 'json-file':
      return 2;
  }
}

function orderedIndexSources(sources: IndexSource[]): IndexSource[] {
  return [...sources].sort((a, b) => sourcePriority(a) - sourcePriority(b));
}

const columns: QTableProps['columns'] = [
  {
    name: 'id',
    label: 'id',
    align: 'left',
    field: 'id',
    sortable: true,
  },
  {
    name: 'source',
    label: 'source',
    align: 'left',
    field: (row: QueryResult) => row.source,
    sortable: true,
  },
  {
    name: 'text',
    label: 'text',
    align: 'left',
    field: (row: QueryResult) => row.text,
    sortable: true,
  },
];

export default {
  props: [
    'editor',
    'indexName',
    'idAttr',
    'startValue',
    'startingSearchText',
    'startingSearchTextVariant',
    'searchEveryWord',
    'sources',
    'defaultSource',
  ],
  emits: [
    'selected',
    'update-attribute',
    'change-search-text-variant',
    'commit',
    'cancel',
  ],
  data() {
    let sourceIndex = orderedIndexSources(
      this.sources as IndexSource[],
    ).findIndex((s) => s.type === this.defaultSource);
    sourceIndex = sourceIndex >= 0 ? sourceIndex : 0;
    return {
      selected: this.startValue as string | undefined,
      searchText: this.startingSearchText || '',
      optionEveryWord: !!this.searchEveryWord,
      selectedSourceIndices: [sourceIndex],
      jsonSources: [] as IndexSourceJsonFile[],
      optionVariant: (this.startingSearchTextVariant ||
        'first-3-words') as SearchTextVariant,
      variants: ['first-3-words', 'first-2-words'] as SearchTextVariant[],
      results: [] as QueryResult[],
      lastError: undefined as string | undefined,
      pendingSearch: false,
      columns,
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    orderedSources(): IndexSource[] {
      const sources = [...(this.sources as IndexSource[]), ...this.jsonSources];
      const seen = new Set<string>();
      return orderedIndexSources(
        sources.filter((source) => {
          const key =
            source.type === 'json-file'
              ? `${source.type}:${source.filename}`
              : source.type;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      );
    },
    labelEveryWord() {
      return this.optionEveryWord ? 'every word' : 'exact text';
    },
    titleEveryWord() {
      return this.optionEveryWord
        ? 'search terms that contain all this words (click to switch to searching exact text)'
        : 'search exact text (click to swith searching words)';
    },
    selectedSources(): IndexSource[] {
      return this.selectedSourceIndices
        .map((i: number) => this.orderedSources[i])
        .filter(
          (source: IndexSource | undefined): source is IndexSource => !!source,
        );
    },
    currentSources(): IndexSource[] {
      return this.selectedSources;
    },
  },
  async mounted() {
    await this.loadJsonSources();
    if (this.searchText.length >= SEARCHTEXT_MIN_LENGTH) this.doSearch();
  },
  watch: {
    optionEveryWord(newValue, oldValue) {
      if (newValue !== oldValue) this.doSearch();
    },
    startingSearchText(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.searchText = newValue;
        this.doSearch();
      }
    },
  },
  methods: {
    sourceLabel(source?: IndexSource): string {
      if (!source) {
        return this.selectedSources.length > 1
          ? `${this.selectedSources.length} sources`
          : this.sourceLabel(this.selectedSources[0]);
      }
      const sourceType = source.type;
      switch (sourceType) {
        case 'json-file':
          return (source as IndexSourceJsonFile).filename.replace(
            /\.json$/i,
            '',
          );
        case 'document':
        case 'project':
        default:
          return sourceType;
      }
    },
    sourceIcon(source?: IndexSource) {
      const sourceType = (source || this.currentSources[0]).type;
      switch (sourceType) {
        case 'document':
          return 'source_document';
        case 'project':
          return 'source_project';
        case 'json-file':
          return 'source_json';
        default:
          return 'source_generic';
      }
    },
    sourceTitle(source?: IndexSource) {
      if (!source) {
        const selected = this.selectedSources.map((selectedSource) => {
          return this.sourceLabel(selectedSource);
        });
        return `selected sources: ${selected.join(', ')}`;
      }
      const sourceType = (source || this.currentSources[0]).type;
      switch (sourceType) {
        case 'document':
          return 'search among the index terms defined in this document (in metadata too)';
        case 'project':
          return 'search among the index terms defined in this project';
        case 'json-file':
          const s = (source || this.currentSources[0]) as IndexSourceJsonFile;
          return `search in an external "${this.sourceLabel(s) || 'index'}" JSON file with { "id": "...", "text": "..." }`;
        default:
          return undefined;
      }
    },
    async loadJsonSources() {
      try {
        const indexName = this.indexName || DEFAULT_INDEX_NAME;
        const escapedIndexName = indexName.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );
        const docState = getDocState(this.editor?.state);
        const options = {
          kind: 'index' as const,
          project: docState?.project,
          configurationName: docState?.configuration?.name,
        };
        const files = await this.backend?.findResourceFiles(
          new RegExp(`^${escapedIndexName}.*\\.json$`),
          options,
        );
        this.jsonSources = (files || []).map((file: ResourceFile) => ({
          type: 'json-file',
          filename: file.path.split(/[\\/]/).pop() || file.path,
        }));
      } catch (err) {
        this.lastError = `ERROR: ${err}`;
      }
    },
    async doSearch(text?: string) {
      let searchText: string | string[] = text || this.searchText;
      if (this.optionEveryWord)
        searchText = (searchText as string)
          .split(/[ .,/-]+/)
          .filter((w) => w.length > 0);
      if (searchText.length < SEARCHTEXT_MIN_LENGTH) {
        // this.results = []
        return;
      }
      this.pendingSearch = true;
      this.lastError = undefined;
      try {
        const results = await Promise.all(
          this.selectedSources.map((source: IndexSource) =>
            this.searchSource(source, searchText),
          ),
        );
        this.results = searchQueryResults(results.flat(), searchText);
      } catch (err) {
        this.lastError = `ERROR: ${err}`;
        this.results = [];
      } finally {
        this.pendingSearch = false;
      }
    },
    async refreshIndicesCache() {
      if (
        this.selectedSources.some(
          (source: IndexSource) => source.type === 'document',
        )
      )
        this.refreshDocumentIndices();
      if (
        this.selectedSources.some(
          (source: IndexSource) => source.type === 'project',
        )
      )
        await this.refreshProjectIndices();
      if (this.searchText.length >= SEARCHTEXT_MIN_LENGTH) this.doSearch();
    },
    async searchSource(source: IndexSource, searchText: string | string[]) {
      switch (source.type) {
        case 'document':
          return searchQueryResults(this.documentIndexTerms(), searchText);
        case 'project':
          return searchQueryResults(
            (await this.refreshProjectIndices()) || [],
            searchText,
          );
        case 'json-file': {
          const docState = getDocState(this.editor?.state);
          const query: IndexTermQuery = {
            type: 'index-term',
            indexName: this.indexName || DEFAULT_INDEX_NAME,
            searchText,
            source: source.filename,
            options: {
              kind: 'index',
              project: docState?.project,
              configurationName: docState?.configuration?.name,
            },
          };
          return (await this.backend?.queryDatabase(query)) || [];
        }
      }
    },
    refreshDocumentIndices() {
      const index_terms = this.documentIndexTerms();
      if (index_terms) useProjectCache().setIndex(this.indexName, index_terms);
    },
    documentIndexTerms(): QueryResult[] {
      return termsOfDocumentIndex(this.editor?.state.doc, this.indexName).map(
        (n) => ({
          id: n.attrs.id,
          text: n.textContent,
          source: 'document',
        }),
      );
    },
    async refreshProjectIndices() {
      const docState = getDocState(this.editor?.state);
      const query: ProjectIndexQuery = {
        type: 'project-index',
        indexName: this.indexName || DEFAULT_INDEX_NAME,
        options: {
          kind: 'index',
          project: docState?.project,
          configurationName: docState?.configuration?.name,
        },
      };
      const index_terms = await this.backend?.queryDatabase(query);
      if (index_terms) useProjectCache().setIndex(this.indexName, index_terms);
      return index_terms;
    },
    updateSearchText(text: string | number | null) {
      if (text !== null) {
        this.doSearch(text.toString());
      }
    },
    selectResult(evt: Event, row: QueryResult, index: number) {
      this.selected = row.id;
      this.$emit('selected', row.id, row.text);
      this.$emit('update-attribute', this.idAttr || 'id', row.id);
    },
    selectResultAndCommit(evt: Event, row: QueryResult, index: number) {
      this.selectResult(evt, row, index);
      this.$emit('commit');
    },
    async toggleSource(index: number) {
      const selected = new Set(this.selectedSourceIndices);
      if (selected.has(index)) {
        if (selected.size === 1) return;
        selected.delete(index);
      } else {
        selected.add(index);
      }
      this.selectedSourceIndices = [...selected].sort((a, b) => a - b);
      await this.doSearch();
    },
    sourceKey(source: IndexSource, index: number) {
      return `${source.type}-${(source as IndexSourceJsonFile).filename || index}`;
    },
    sourceResultClass(source?: string) {
      switch (source) {
        case 'document':
          return 'bg-blue-3 text-blue-10';
        case 'project':
          return 'bg-green-3 text-green-10';
        default:
          return 'bg-purple-3 text-purple-10';
      }
    },
    resultSourceIcon(source?: string) {
      switch (source) {
        case 'document':
          return 'source_document';
        case 'project':
          return 'source_project';
        default:
          return 'source_json';
      }
    },
    resultSourceName(source?: string) {
      if (source === 'document' || source === 'project') return source;
      return (source || 'JSON source').replace(/\.json$/i, '');
    },
    resultRowStyle(row: QueryResult) {
      const sourceStyle = {
        width: '3rem',
        maxWidth: '3rem',
        overflow: 'hidden',
      };
      switch (row.source) {
        case 'document':
          return { ...sourceStyle, backgroundColor: '#bbdefb' };
        case 'project':
          return { ...sourceStyle, backgroundColor: '#c8e6c9' };
        default:
          return { ...sourceStyle, backgroundColor: '#e1bee7' };
      }
    },
    idColumnStyle() {
      return {
        width: '6rem',
        maxWidth: '6rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      };
    },
    setVariant(variant: SearchTextVariant) {
      this.optionVariant = variant;
      this.$emit('change-search-text-variant', variant);
    },
    keyup(e: KeyboardEvent) {
      if (
        e.code === 'Enter' &&
        e.altKey &&
        !this.selected &&
        this.results.length === 1
      ) {
        this.selectResultAndCommit(e, this.results[0], 0);
      } else if (e.code === 'Escape') {
        this.$emit('cancel');
      }
    },
  },
};
</script>
