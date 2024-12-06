<template>
  <ToolbarButton icon="code_block_tags" title="insert or convert a RawBlock">
    <q-popup-proxy @update:model-value="popupStateChange">
      <q-splitter v-model="splitterModel" style="min-width: 400px">
        <template v-slot:before>
          <q-tabs v-model="currentFormat" vertical dense class="text-grey" active-color="primary"
            indicator-color="primary" align="justify" size="xs">
            <q-tab v-for="tab in tabs()" :name="tab" :label="tab" :title="titleForTab(tab)" />
          </q-tabs>
        </template>
        <template v-slot:after>
          <q-tab-panels v-model="currentFormat" animated swipeable vertical transition-prev="jump-up"
            transition-next="jump-up">
            <q-tab-panel :name="allFormatsTabName" class="q-pa-sm">
              <div>
                <q-btn v-if="editor.can().rawBlockToText()" color="primary" label="RawBlocks to text" size="sm"
                  class="q-ma-xs" title="convert RawBlocks in selection to text"
                  @click="editor.commands.rawBlockToText()" />
                <q-space v-if="editor.can().rawBlockToText()" />
                <q-btn v-for="format in formats" color="secondary" :label="format" size="sm" class="q-ma-xs"
                  :title='`make current selection a RawBlock of format "${format}"`'
                  @click="editor.commands.insertRawBlock(format)" />
              </div>
            </q-tab-panel>
            <q-tab-panel v-for="format in formatsWithRaws" :name="format" class="q-pa-sm">
              <div>
                <q-btn v-for="raw in rawsOfFormat[format]" color="secondary" :title="raw.title" :label="labelFor(raw)"
                  no-caps size="md" class="q-pa-xs q-ma-xs"
                  :disabled="!editor.can().insertRawBlock(format, raw.content)"
                  @click="insertRawBlock(raw.format, raw.content)" />
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </template>
      </q-splitter>
    </q-popup-proxy>
  </ToolbarButton>
</template>

<script lang="ts">
import ToolbarButton from './ToolbarButton.vue';
import { isArray, isString, uniq } from 'lodash';
import { DEFAULT_RAW_INLINES, InsertableRaw } from '../common';
import { setupQuasarIcons } from './helpers/quasarIcons';
import { getEditorConfiguration } from '../schema';

const ALL_FORMATS_TAB_NAME = 'all'

const makeRawBlocks: InsertableRaw[] = DEFAULT_RAW_INLINES.map(r => ({
  format: r,
  title: r
}))

const RAW_BLOCK_USE_SPAN = 100

interface RawBlockUsage {
  lastHit: number;
  hitCount: number;
}

const rawBlockUsage: Record<string, RawBlockUsage> = {}

export default {
  setup() {
    setupQuasarIcons()
  },
  components: {
    ToolbarButton,
  },
  props: ['editor', 'sortable'],
  data() {
    return {
      tic: 0,
      raws: makeRawBlocks,
      allFormatsTabName: ALL_FORMATS_TAB_NAME,
      currentFormat: ALL_FORMATS_TAB_NAME,
      splitterModel: 20,
    };
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    rawBlocks() {
      return this.configuration?.rawBlocks || []
    },
    sortedRaws(): InsertableRaw[] {
      const ri = this.rawBlocks
      if (this.tic === 0 && ri) {
        this.raws = ri
        if (this.sortable)
          this.raws.sort((r1, r2) => this.hitsFor(r2) - this.hitsFor(r1))
      }
      return this.raws
    },
    formats() {
      return uniq(this.sortedRaws.map((r) => r.format));
    },
    rawsOfFormat(): Record<string, InsertableRaw[]> {
      const rof: Record<string, InsertableRaw[]> = {}
      this.formats.forEach(f => {
        const raws = this.sortedRaws.filter((r) => r.format === f && r.content)
        if (raws.length > 0) rof[f] = raws
      })
      return rof
    },
    formatsWithRaws(): string[] {
      return Object.keys(this.rawsOfFormat)
    },
  },
  methods: {
    isSelectionEmpty() {
      return this.editor.state.selection.empty
    },
    tabs(): string[] {
      return [this.allFormatsTabName, ...this.formatsWithRaws]
    },
    labelFor(raw: InsertableRaw) {
      const content = raw.content
      if (isArray(content)) return content.join('...');
      return content
    },
    titleForTab(tab: string) {
      if (tab === this.allFormatsTabName) return 'transform selected text into a RawBlock of the desired format'
      return `RawBlock samples for format "${tab}"`
    },
    keyFor(format: string, content: string | string[] | undefined) {
      if (!content) return format
      return `${format}-${isString(content) ? content : content.join('...')}`
    },
    hitsFor(raw: InsertableRaw) {
      const key = this.keyFor(raw.format, raw.content)
      const usage = rawBlockUsage[key]
      return usage ? usage.hitCount : 0
    },
    updateUsageInfoFor(format: string, content: string | string[] | undefined) {
      const key = this.keyFor(format, content)
      const tic = ++this.tic
      const rawUsage: RawBlockUsage = rawBlockUsage[key] || {
        hitCount: 0,
        lastHit: tic
      }
      rawUsage.hitCount = tic - rawUsage.lastHit < RAW_BLOCK_USE_SPAN ? rawUsage.hitCount + 1 : 1
      rawUsage.lastHit = tic
      rawBlockUsage[key] = rawUsage
      console.log(rawBlockUsage)
    },
    insertRawBlock(format: string, content: string | string[] | undefined) {
      const editor = this.editor
      if (editor && editor.can().insertRawBlock(format, content)) {
        const description = Array.isArray(content) && content.length > 1
          ? `insert "${content[0]}" and "${content[1]}" RawBlocks (format: ${format}) around the selection`
          : `insert a "${content}" RawBlock (format: ${format}) at the cursor`
        editor.commands.runRepeatableCommand(
          'insertRawBlock',
          description,
          format,
          content
        )
        // editor.commands.insertRawBlock(format, content)
        this.updateUsageInfoFor(format, content)
      }
    },
    popupStateChange(showing: any) {
      if (!showing && this.sortable)
        this.raws.sort((r1, r2) => this.hitsFor(r2) - this.hitsFor(r1))
    }
  },
}
</script>