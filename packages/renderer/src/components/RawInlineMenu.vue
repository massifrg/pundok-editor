<template>
  <ToolbarButton icon="mdi-code-tags" v-if="formats.length > 0" title="insert or convert RawInline">
    <q-popup-proxy @update:model-value="popupStateChange">
      <q-splitter v-model="splitterModel" style="min-width: 400px">
        <template v-slot:before>
          <q-tabs v-model="currentTab" vertical dense class="text-grey" active-color="primary" indicator-color="primary"
            align="justify" size="xs" @update:model-value="changeTab">
            <q-tab v-for="tab in tabs()" :name="tab" :label="tab" :title="titleForTab(tab)" />
          </q-tabs>
        </template>
        <template v-slot:after>
          <q-tab-panels v-model="currentTab" animated swipeable vertical transition-prev="jump-up"
            transition-next="jump-up">
            <q-tab-panel v-if="!isSelectionEmpty()" :name="allFormatsTabName" class="q-pa-sm">
              <div>
                <q-btn v-if="editor.can().rawInlineToText()" color="primary" label="RawInlines to text" size="sm"
                  class="q-ma-xs" title="convert RawInlines in selection to text"
                  @click="editor.commands.rawInlineToText()" />
                <q-space v-if="editor.can().rawInlineToText()" />
                <q-btn v-for="format in formats" color="secondary" :label="format" size="sm" class="q-ma-xs"
                  :title='`make current selection a RawInline of format "${format}"`'
                  @click="editor.commands.insertRawInline(format)" />
              </div>
            </q-tab-panel>
            <q-tab-panel v-for="format in formatsWithRaws" :name="format" class="q-pa-sm">
              <div>
                <q-btn v-for="raw in rawsOfFormat[format]" color="secondary" :title="raw.title" :label="labelFor(raw)"
                  no-caps size="md" class="q-pa-xs q-ma-xs"
                  :disabled="!editor.can().insertRawInline(format, raw.content)"
                  @click="insertRawInline(raw.format, raw.content)" />
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
import { intersection, isArray, isString, union, uniq } from 'lodash';
import { DEFAULT_RAW_INLINES, InsertableRaw } from '../common';
import { getEditorConfiguration } from '../schema';
import { marksStarting } from '../schema/helpers';

const ALL_FORMATS_TAB_NAME = 'all'

const makeRawInlines: InsertableRaw[] = DEFAULT_RAW_INLINES.map(r => ({
  format: r,
  title: r
}))

const RAW_INLINE_USE_SPAN = 100

interface RawInlineUsage {
  lastHit: number;
  hitCount: number;
}

const rawInlineUsage: Record<string, RawInlineUsage> = {}

export default {
  components: {
    ToolbarButton,
  },
  props: ['editor', 'sortable'],
  data() {
    return {
      tic: 0,
      raws: makeRawInlines,
      allFormatsTabName: ALL_FORMATS_TAB_NAME,
      currentFormat: ALL_FORMATS_TAB_NAME,
      splitterModel: 20,
    };
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    rawInlines() {
      return this.configuration?.rawInlines || []
    },
    sortedRaws(): InsertableRaw[] {
      const ri = this.rawInlines
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
    currentTab() {
      const emptySelection = this.isSelectionEmpty()
      if (emptySelection && this.currentFormat === ALL_FORMATS_TAB_NAME) {
        const firstFormat = this.formats[0]
        this.currentFormat = this.isSelectionEmpty() && firstFormat
          ? firstFormat : ALL_FORMATS_TAB_NAME
      }
      return this.currentFormat
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
      return this.isSelectionEmpty() ? this.formatsWithRaws : [this.allFormatsTabName, ...this.formatsWithRaws]
    },
    titleForTab(tab: string) {
      if (tab === this.allFormatsTabName) return 'transform selected text into a RawInline of the desired format'
      return `RawInline samples for format "${tab}"`
    },
    changeTab(newTab: string) {
      this.currentFormat = newTab
    },
    labelFor(raw: InsertableRaw) {
      const content = raw.content
      if (isArray(content)) return content.join('...');
      return content
    },
    keyFor(format: string, content: string | string[] | undefined) {
      if (!content) return format
      return `${format}-${isString(content) ? content : content.join('...')}`
    },
    hitsFor(raw: InsertableRaw) {
      const key = this.keyFor(raw.format, raw.content)
      const usage = rawInlineUsage[key]
      return usage ? usage.hitCount : 0
    },
    updateUsageInfoFor(format: string, content: string | string[] | undefined) {
      const key = this.keyFor(format, content)
      const tic = ++this.tic
      const rawUsage: RawInlineUsage = rawInlineUsage[key] || {
        hitCount: 0,
        lastHit: tic
      }
      rawUsage.hitCount = tic - rawUsage.lastHit < RAW_INLINE_USE_SPAN ? rawUsage.hitCount + 1 : 1
      rawUsage.lastHit = tic
      rawInlineUsage[key] = rawUsage
    },
    insertRawInline(format: string, content: string | string[] | undefined) {
      const editor = this.editor
      if (editor && editor.can().insertRawInline(format, content)) {
        const isPair = Array.isArray(content) && content.length > 1
        const { doc, selection } = editor.state

        // alert when the two RawInlines don't share the same node or marks
        if (!selection.empty && isPair) {
          const { $from, from, $to } = selection
          const notSameNode = $from.node() !== $to.node()
          const fromMarks = [...$from.marks(), ...marksStarting(doc, from)]
          const toMarks = $to.marks()
          const notSameMarks = fromMarks.length !== toMarks.length
            || intersection(fromMarks, toMarks).length !== union(fromMarks, toMarks).length
          if (notSameNode)
            console.log('NOT THE SAME NODE')
          if (notSameMarks)
            console.log('NOT THE SAME MARKS')
        }

        const description = isPair
          ? `insert "${content[0]}" and "${content[1]}" RawInlines (format: ${format}) around the selection`
          : `insert a "${content}" RawInline (format: ${format}) at the cursor`
        editor.commands.runRepeatableCommand(
          'insertRawInline',
          description,
          format,
          content
        )

        // editor.commands.insertRawInline(format, content)
        this.updateUsageInfoFor(format, content)
      }
    },
    popupStateChange(showing: any) {
      if (!showing && this.sortable)
        this.raws.sort((r1, r2) => this.hitsFor(r2) - this.hitsFor(r1))
    }
  },
};
</script>
