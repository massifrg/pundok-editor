<template>
  <q-dialog :model-value="visible" :position="dialogPosition" seamless>
    <q-card style="max-width: 60vw">
      <q-card-section class="q-ma-xs" horizontal>
        <q-btn v-if="dialogPosition != 'top'" dense class="q-px-md" icon="mdi-arrow-up"
          title="move this dialog to the top" size="xs" @click="() => { dialogPosition = 'top' }"></q-btn>
        <q-btn v-if="dialogPosition != 'bottom'" dense class="q-px-md" icon="mdi-arrow-down"
          title="move this dialog to the bottom" size="xs" @click="() => { dialogPosition = 'bottom' }"></q-btn>
        <q-btn v-if="dialogPosition != 'right'" dense class="q-px-md" icon="mdi-arrow-right"
          title="move this dialog to the right" size="xs" @click="() => { dialogPosition = 'right' }"></q-btn>
        <q-btn dense class="q-px-md" :icon="expandIcon" :title="expandTooltip" size="xs"
          @click="() => { showFields = !showFields }"></q-btn>
        <q-space />
        <q-btn dense icon="mdi-reload" size:xs title="reset" @click="resetDialog()" />
        <q-space />
        <q-btn dense icon="mdi-close" size:xs title="close" @click="closeDialog()" />
      </q-card-section>
      <q-card-section>
        <div v-if="showFields">
          <q-card-section horizontal>
            <q-input autofocus class="search-and-replace-textfield q-mx-xs" :model-value="textToSearch" label="search"
              stack-label @update:model-value="updateTextToSearch" @keypress="keypressed" @keyup="keyup" />
            <!-- <q-space /> -->
            <MarksPaletteDropdown :editor="editor" title="search for this Mark(s) or style(s)"
              :addableMarks="marksToSearch" :logicalOperator="optionMarksLogicalOperator" showLogicalOperator="true"
              @selected-logical-operator="selectMarksLogicalOperator" @selected-marks="selectMarksToSearch"
              menu-anchor="bottom end" menu-self="bottom start" />
          </q-card-section>
          <q-card-section v-if="!optionSearchOnly" horizontal>
            <q-input class="search-and-replace-textfield q-mx-xs" :model-value="textToReplace" label="replace with"
              stack-label @update:model-value="updateTextToReplace" @keyup="keyup" />
            <!-- <q-space /> -->
            <MarksPaletteDropdown :editor="editor" title="add/remove Mark(s) or custom style(s) to replaced text"
              :addableMarks="marksOnReplacedText" :operations="(['add', 'remove', 'remove all'] as MarkOperationType[])"
              :default-operation="selectedMarkOperationTypeOnReplacedText" @selected-marks="setMarksOnReplacedText"
              @selected-operation="selectMarkOperationOnReplacedText" menu-anchor="bottom end"
              menu-self="bottom start" />
          </q-card-section>
        </div>
      </q-card-section>
      <q-card-section v-if="showFields" horizontal class="q-pa-sm">
        <q-btn v-if="searchAndReplaces.length > 0" class="q-ma-xs" size="sm" rounded color="primary" label=""
          title="load a predefined search and replace config" icon="mdi-playlist-star">
          <q-menu anchor="bottom start" self="bottom end">
            <q-list>
              <q-item v-for="sar in searchAndReplaces" clickable v-close-popup dense :title="sar.description"
                @click="loadSearchAndReplace(sar)">
                <q-item-section>{{ sar.name }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionCaseInsensitive"
          icon="mdi-format-letter-case" title="case insensitive search"
          @click="optionCaseInsensitive = !optionCaseInsensitive" />
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionRegex" icon="mdi-regex"
          title="search with regular expressions (Unicode aware)" @click="optionRegex = !optionRegex" />
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionCycle" icon="mdi-find-replace"
          title="cycle through found texts" @click="optionCycle = !optionCycle" />
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionWholeWord" icon="whole_word"
          title="whole words" @click="optionWholeWord = !optionWholeWord" />
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionSearchOnly" icon="mdi-pencil-lock"
          title="just search, don't replace" @click="optionSearchOnly = !optionSearchOnly" />
        <!-- <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="optionSearchType !== 'marks'" icon="mdi-marker"
          title="search only for marks" @click="optionSearchType = optionSearchType === 'marks' ? 'text' : 'marks'" /> -->
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionChangeMarksOnly" icon="mdi-tag"
          title="change only marks, don't touch text" @click="optionChangeMarksOnly = !optionChangeMarksOnly" />
        <q-space />
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="optionCapitalize !== 'lower'"
          icon="mdi-format-letter-case-lower" title="lowercase replaced text"
          @click="optionCapitalize = optionCapitalize !== 'lower' ? 'lower' : 'none'" />
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="optionCapitalize !== 'upper'"
          icon="mdi-format-letter-case-upper" title="uppercase replaced text"
          @click="optionCapitalize = optionCapitalize !== 'upper' ? 'upper' : 'none'" />
        <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="optionCapitalize !== 'first'" label="Abc"
          no-caps title="uppercase words' first letter in replaced text"
          @click="optionCapitalize = optionCapitalize !== 'first' ? 'first' : 'none'">
        </q-btn>
      </q-card-section>
      <q-card-section horizontal class="q-ma-xs">
        <q-chip :color="foundItemsColor" text-color="white" icon="mdi-text-search" :title="foundItemsText">{{
          currentFoundItemText }}</q-chip>
        <q-space />
        <q-toggle v-model="showIndicesButtons" icon="mdi-cursor-pointer" title="show buttons for indices" />
      </q-card-section>
      <q-card-actions>
        <q-btn icon="mdi-magnify" title="search" size="md" padding="md" @click="startSearch()" />
        <!-- <q-btn :disabled="foundCount === 0 || (!optionCycle && foundIndex <= 0)" icon="mdi-chevron-left" size="md"
          padding="md" title="select previous found" @click="prevFound()" />
        <q-btn :disabled="foundCount === 0 || (!optionCycle && foundIndex >= foundCount - 1)" icon="mdi-chevron-right"
          size="md" padding="md" title="select next found" @click="nextFound()" /> -->
        <q-btn icon="mdi-chevron-left" size="md" padding="md" title="select previous found" @click="prevFound()" />
        <q-btn icon="mdi-chevron-right" size="md" padding="md" title="select next found" @click="nextFound()" />
        <q-btn v-if="!optionSearchOnly" :disabled="!editor.can().replaceSelectedText()" icon="mdi-autorenew" size="md"
          padding="md" title="replace selected" @click="replaceSelected" />
        <q-btn v-if="!optionSearchOnly" :disabled="!editor.can().replaceNextText(optionCycle)" size="md" padding="md"
          title="replace & select next found" @click="replaceNextText">
          <q-icon name="mdi-autorenew"></q-icon>
          <q-icon name="mdi-chevron-right"></q-icon>
        </q-btn>
        <q-btn v-if="!optionSearchOnly" :disabled="!editor.can().replaceAll()" size="md" padding="md"
          title="replace all" @click="replaceAll">
          <q-icon name="mdi-autorenew"></q-icon>
          <q-icon name="mdi-chevron-double-right"></q-icon>
        </q-btn>
        <q-space style="min-width: 1rem" />
        <IndicesButtons v-if="showIndicesButtons" :editor="editor" size="md" padding="md" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import {
  Capitalize,
  CustomStyleInstance,
  SearchAndReplace,
  getSearchAndReplaces
} from '../common';
import {
  CapitalizeTransform,
  FoundTextRange,
  MarkOperationType,
  MarkTransform,
  MarksLogicalOperator,
  SearchMarkSpec,
  TextTransform,
  getEditorConfiguration,
} from '../schema';
import {
  AddableMark,
  baseAddableMarks,
  customStylesToAddableMarks,
  searchAndReplaceSpanToAddableMarks
} from '.';
import MarksPaletteDropdown from './MarksPaletteDropdown.vue'
import IndicesButtons from './IndicesButtons.vue';
import { setupQuasarIcons } from './helpers/quasarIcons'
import { SearchQuery, SearchResultFilter, getMatchHighlights } from '../schema/helpers';
import { Mark } from '@tiptap/pm/model';
import { useActions } from '../stores';
import { mapState } from 'pinia';
import {
  ACTION_REPLACE_AND_SELECT_NEXT,
  ACTION_SELECT_NEXT,
  ACTION_SELECT_PREV
} from '../actions';

type DialogPosition = "top" | "bottom" | "standard" | "right" | "left" | undefined

const allMarksFilter: (marks: Mark[]) => SearchResultFilter = (marks) => (state, result) => {
  if (marks) {
    const { from, to } = result
    return marks.every(mark => state.doc.rangeHasMark(from, to, mark))
  }
  return true
}

const oneOfMarksFilter: (marks: Mark[]) => SearchResultFilter = (marks) => (state, result) => {
  if (marks) {
    const { from, to } = result
    return !!marks.find(mark => state.doc.rangeHasMark(from, to, mark))
  }
  return true
}

export default {
  components: {
    IndicesButtons,
    MarksPaletteDropdown
  },
  props: ['visible', 'editor'],
  emits: ['hideSearchAndReplaceDialog'],
  setup() {
    setupQuasarIcons()
  },
  data() {
    return {
      query: undefined as SearchQuery | undefined,
      showIndicesButtons: false,
      searchStarted: false,
      dialogPosition: "top" as DialogPosition,
      showFields: true,
      // optionSearchType: 'text' as SearchType,
      textToSearch: '',
      textToReplace: '',
      optionSearchOnly: false,
      optionChangeMarksOnly: false,
      optionCaseInsensitive: false,
      optionCapitalize: 'none' as Capitalize,
      optionRegex: false,
      optionCycle: false,
      optionWholeWord: false,
      marksToSearch: [] as AddableMark[],
      optionMarksLogicalOperator: 'and' as MarksLogicalOperator,
      selectedMarksToSearch: [] as SearchMarkSpec[],
      marksOnReplacedText: [] as AddableMark[],
      selectedMarksOnReplacedText: [] as AddableMark[],
      selectedMarkOperationTypeOnReplacedText: 'none',
      foundIndex: -1,
    };
  },
  computed: {
    ...mapState(useActions, ['lastAction']),
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    searchAndReplaces() {
      return getSearchAndReplaces(this.configuration)
    },
    ranges(): FoundTextRange[] {
      return this.editor.state && getMatchHighlights(this.editor.state).find()
    },
    foundCount(): number {
      return this.ranges.length
    },
    foundItemsText() {
      if (this.searchStarted) {
        if (this.foundCount > 0) {
          let text = `found ${this.foundCount} occurrencies of "${this.textToSearch}"`;
          if (this.foundIndex >= 0) text += ` (#${this.foundIndex + 1} selected)`;
          return text;
        } else {
          return 'no occurrencies found';
        }
      }
    },
    foundItemsColor() {
      if (this.searchStarted) {
        return this.foundCount > 0 ? 'positive' : 'negative'
      }
      return 'secondary'
    },
    currentFoundItemText() {
      if (this.searchStarted) {
        const which = this.foundIndex >= 0 ? `#${this.foundIndex + 1} of ` : ''
        return this.foundCount > 0
          ? `${which}${this.foundCount} items found`
          : "no items found"
      }
      return 'press the "search" button to start searching'
    },
    expandIcon() {
      return this.showFields ? 'mdi-arrow-collapse-vertical' : 'mdi-arrow-expand-vertical'
    },
    expandTooltip() {
      return `show ${this.showFields ? 'less' : 'more'}`
    },
    textTransforms(): TextTransform[] {
      const transforms: TextTransform[] = []
      const op = this.selectedMarkOperationTypeOnReplacedText
      const marks = this.selectedMarksOnReplacedText
      const capitalize = this.optionCapitalize
      if (marks || capitalize) {
        const schema = this.editor.state.schema
        marks.forEach(({ markspec }) => {
          const { typeName, attrs } = markspec
          const mark = schema.marks[typeName].create(attrs)
          if (mark) {
            if (op === 'add')
              transforms.push({ type: 'add-mark', mark: typeName, attrs } as MarkTransform)
            else if (op === 'remove')
              transforms.push({ type: 'remove-mark', mark: typeName, attrs } as MarkTransform)
          }
        })
        switch (capitalize) {
          case 'lower':
            transforms.push({ type: 'lowercase' } as CapitalizeTransform)
            break
          case 'upper':
            transforms.push({ type: 'uppercase' } as CapitalizeTransform)
            break
          case 'first':
          // TODO:
          default:
        }
      }
      return transforms
    }
  },
  watch: {
    customStyles() {
      this.marksOnReplacedText = this.baseMarksAndCustomStyles()
      this.marksToSearch = this.baseMarksAndCustomStyles()
    },
    optionMarksLogicalOperator() {
      this.startSearch()
    },
    selectedMarksToSearch() {
      this.startSearch()
    },
    optionCaseInsensitive() {
      this.startSearch()
    },
    optionRegex() {
      this.startSearch()
    },
    optionWholeWord() {
      this.startSearch()
    },
    lastAction(action) {
      if (action.name === ACTION_SELECT_PREV.name)
        this.prevFound()
      else if (action.name === ACTION_SELECT_NEXT.name)
        this.nextFound()
      else if (action.name === ACTION_REPLACE_AND_SELECT_NEXT.name)
        this.replaceNextText()
    }
  },
  methods: {
    keypressed(e: KeyboardEvent) {
      if (this.editor) {
        console.log(e.key)
        if (e.key === 'Enter') {
          this.startSearch();
        }
      } else {
        console.log('no editor');
      }
    },
    keyup(e: KeyboardEvent) {
      if (this.editor) {
        if (e.key === 'Escape')
          this.closeDialog()
      }
    },
    closeDialog() {
      this.editor.chain().hideFoundTexts().focus().run()
      this.hideDialog()
    },
    startSearch() {
      const editor = this.editor
      if (editor) {
        const schema = editor.state.schema
        const marks: Mark[] = []
        this.selectedMarksToSearch.forEach(({ typeName, attrs }) => {
          const a = !!attrs ? attrs : null
          const mark = schema.marks[typeName].create(a)
          if (mark) marks.push(mark)
        })
        const query = new SearchQuery({
          search: this.textToSearch,
          caseSensitive: !this.optionCaseInsensitive,
          literal: true,
          regexp: !!this.optionRegex,
          replace: this.textToReplace,
          wholeWord: !!this.optionWholeWord,
          filterResult: this.optionMarksLogicalOperator === 'and'
            ? allMarksFilter(marks)
            : oneOfMarksFilter(marks)
        })
        editor.chain().startSearch(query).focus().selectNextFoundText().run();
        this.query = query
        this.searchStarted = true
        this.updateCountAndIndex()
      }
    },
    updateCountAndIndex() {
      const state = this.editor?.state
      if (state) {
        const ranges = getMatchHighlights(state).find();
        this.foundCount = ranges.length
        const { from: selFrom, to: selTo } = state.selection;
        this.foundIndex = ranges.findIndex(({ from, to }) => from === selFrom && to === selTo)
      } else {
        this.foundCount = 0
        this.foundIndex = -1
      }
    },
    hideDialog() {
      if (this.editor) {
        this.editor.commands.hideFoundTexts();
      }
      this.showFields = true;
      this.$emit('hideSearchAndReplaceDialog');
    },
    updateTextToSearch(v: string | number | null) {
      const newValue = v ? v.toString() : ''
      this.textToSearch = newValue;
      this.searchStarted = false
    },
    updateTextToReplace(v: string | number | null) {
      const newValue = v ? v.toString() : ''
      this.textToReplace = newValue;
    },
    prevFound() {
      this.editor.chain().selectPrevFoundText(this.optionCycle).focus().run()
      this.updateCountAndIndex()
    },
    nextFound() {
      this.editor.chain().selectNextFoundText(this.optionCycle).focus().run()
      this.updateCountAndIndex()
    },
    replaceSelected() {
      this.editor.chain()
        .replaceSelectedText()
        .applyTextTransforms(this.textTransforms)
        .focus().run()
      this.updateCountAndIndex()

    },
    replaceNextText() {
      this.editor.chain()
        .replaceSelectedText()
        .applyTextTransforms(this.textTransforms)
        .selectNextFoundText()
        .focus().run()
      this.updateCountAndIndex()
    },
    replaceAll() {
      this.editor.chain().replaceAll().focus().run()
      this.updateCountAndIndex()
    },
    baseMarksAndCustomStyles(selected?: string[]): AddableMark[] {
      const editor = this.editor
      if (editor) {
        const am: AddableMark[] = baseAddableMarks(selected)
        customStylesToAddableMarks(this.customStyles, selected, am)
        return am
      }
      return []
    },
    resetDialog() {
      this.textToSearch = ''
      this.textToReplace = ''
      this.optionSearchOnly = false
      this.optionChangeMarksOnly = false
      this.optionCaseInsensitive = false
      this.optionCapitalize = 'none' as Capitalize
      this.optionRegex = false
      this.optionCycle = false
      this.optionWholeWord = false
      this.marksToSearch = [] as AddableMark[]
      this.optionMarksLogicalOperator = 'and' as MarksLogicalOperator
      this.selectedMarksToSearch = [] as SearchMarkSpec[]
      this.selectedMarksOnReplacedText = [] as AddableMark[]
      this.selectedMarkOperationTypeOnReplacedText = 'none'
      this.foundIndex = -1
    },
    loadSearchAndReplace(sar: SearchAndReplace) {
      this.textToSearch = sar.search;
      this.updateTextToSearch(this.textToSearch)
      this.textToReplace = sar.replace || '';
      this.updateTextToReplace(this.textToReplace)
      this.optionSearchOnly = !!sar.optionSearchOnly || (!sar.replace && sar.replace !== '')
      this.optionCaseInsensitive = !!sar.optionCaseInsensitive
      this.optionRegex = !!sar.optionRegex;
      this.optionCycle = !!sar.optionCycle;
      this.optionCapitalize = sar.capitalize || 'none';
      this.optionWholeWord = !!sar.optionWholeWord;
      const am: AddableMark[] = baseAddableMarks(sar.addMarks || [])
      customStylesToAddableMarks(this.customStyles, sar.addStyles, am)
      if (sar.addSpans && sar.addSpans.length > 0) {
        searchAndReplaceSpanToAddableMarks(sar.addSpans, [sar.addSpans[0].name], am)
      }
      this.marksOnReplacedText = am
      this.selectedMarksOnReplacedText = am.filter(m => m.active)
      this.selectedMarkOperationTypeOnReplacedText = 'add'
      if (this.editor) {
        this.editor.chain().hideFoundTexts().run()
        this.searchStarted = false
      }
    },
    markspecsOnReplacedText(): SearchMarkSpec[] {
      return this.selectedMarksOnReplacedText.map(am => am.markspec)
    },
    setMarksOnReplacedText(marks: AddableMark[]) {
      this.selectedMarksOnReplacedText = marks
    },
    selectMarksToSearch(marks: AddableMark[]) {
      this.selectedMarksToSearch = marks.map(m => m.markspec)
      // console.log(this.selectedMarksToSearch)
    },
    selectMarkOperationOnReplacedText(operation: MarkOperationType) {
      this.selectedMarkOperationTypeOnReplacedText = operation
    },
    selectMarksLogicalOperator(operator: MarksLogicalOperator) {
      this.optionMarksLogicalOperator = operator
    }
  },
};
</script>

<style lang="scss">
.search-and-replace-textfield {
  min-width: 300px;
}
</style>