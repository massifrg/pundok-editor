<template>
  <q-dialog :model-value="visible" :position="dialogPosition" seamless>
    <q-card style="max-width: 60vw">
      <q-card-section class="q-ma-xs" horizontal>
        <div class="flex flex-center">
          <q-chip :label="currentFoundItemShortText" :color="foundItemsColor" round class="q-pa-md" text-color="white"
            icon="mdi-text-search" :title="foundItemsText" />
        </div>
        <q-space />
        <q-btn dense class="q-px-md" size="xs" icon="mdi-reload" title="reset" @click="resetSettings()" />
        <q-space class="small" />
        <q-btn dense class="q-px-md" size="xs" icon="mdi-content-save"
          title="save the current search and replace settings">
          <SaveConfigurationElementPopup :editor="editor" :existing-ones="knownSettings" @save-settings="saveSettings"
            @delete-settings="deleteSettings" />
        </q-btn>
        <q-space class="big" />
        <q-btn round class="q-pa-sm" size="sm" icon="mdi-pencil-lock" color="primary" :outline="!optionSearchOnly"
          title="just search, don't replace" @click="optionSearchOnly = !optionSearchOnly" />
        <q-space class="small" />
        <q-btn round class="q-pa-sm" size="sm" icon="css_selectors" color="primary" :outline="!cssMode"
          title="search with CSS selectors" @click="cssMode = !cssMode" />
        <q-space v-if="!cssMode && searchAndReplaces.length > 0" class="small" />
        <q-btn v-if="!cssMode && searchAndReplaces.length > 0" round class="q-pa-sm" size="sm" color="primary" label=""
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
        <q-space v-if="cssMode && cssSelections.length > 0" class="small" />
        <q-btn v-if="cssMode && cssSelections.length > 0" round class="q-pa-sm" size="sm" color="primary" label=""
          title="load a predefined CSS selector" icon="mdi-playlist-star">
          <q-menu anchor="bottom start" self="bottom end">
            <q-list>
              <q-item v-for="sel in cssSelections" clickable v-close-popup dense :title="sel.description"
                @click="setCssSelector(sel)">
                <q-item-section>{{ sel.name }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-space class="small" />
        <!-- <q-toggle v-model="showIndicesButtons" icon="mdi-cursor-pointer" title="show buttons for indices" /> -->
        <q-btn v-if="indices.length > 0" round class="q-pa-sm" size="sm" color="primary" :outline="!showIndicesButtons"
          icon="mdi-cursor-pointer" title="show buttons for indices"
          @click="showIndicesButtons = !showIndicesButtons" />
        <q-space class="big" />
        <q-btn dense class="q-px-md" :icon="expandIcon" :title="expandTooltip" size="xs"
          @click="() => { showFields = !showFields }"></q-btn>
        <q-btn v-if="dialogPosition != 'top'" dense class="q-px-md" icon="mdi-arrow-up"
          title="move this dialog to the top" size="xs" @click="() => { dialogPosition = 'top' }"></q-btn>
        <q-btn v-if="dialogPosition != 'bottom'" dense class="q-px-md" icon="mdi-arrow-down"
          title="move this dialog to the bottom" size="xs" @click="() => { dialogPosition = 'bottom' }"></q-btn>
        <q-btn v-if="dialogPosition != 'right'" dense class="q-px-md" icon="mdi-arrow-right"
          title="move this dialog to the right" size="xs" @click="() => { dialogPosition = 'right' }"></q-btn>
        <q-space />
        <q-btn icon="mdi-close" size="xs" title="close" @click="closeDialog()" />
      </q-card-section>
      <q-card-section v-if="showFields">
        <q-card-section horizontal>
          <q-input autofocus class="search-and-replace-textfield q-mx-xs" :model-value="searchInput"
            :label="searchLabel" stack-label @update:model-value="updateSearchInput" @keypress="keypressed"
            @keyup="keyup" />
          <div class="q-pt-md q-gutter-none">
            <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionCycle" icon="mdi-find-replace"
              title="cycle through found texts" @click="optionCycle = !optionCycle" />
            <q-btn v-if="cssMode" class="q-ma-xs" size="sm" round color="primary" :outline="!optionMergeAdjacentMarks"
              icon="mdi-set-merge" title="merge adjacent text ranges with the same marks"
              @click="optionMergeAdjacentMarks = !optionMergeAdjacentMarks" />
            <q-btn v-if="!cssMode" class="q-ma-xs" size="sm" round color="primary" :outline="!optionCaseInsensitive"
              icon="mdi-format-letter-case" title="case insensitive search"
              @click="optionCaseInsensitive = !optionCaseInsensitive" />
            <q-btn v-if="!cssMode" class="q-ma-xs" size="sm" round color="primary" :outline="!optionRegex"
              icon="mdi-regex" title="search with regular expressions (Unicode aware)"
              @click="optionRegex = !optionRegex" />
            <q-btn v-if="!cssMode" class="q-ma-xs" size="sm" round color="primary" :outline="!optionWholeWord"
              icon="whole_word" title="whole words" @click="optionWholeWord = !optionWholeWord" />
            <q-btn v-if="!cssMode" class="q-ma-xs" size="sm" round color="primary" :outline="!searchFilterSwitch"
              icon="mdi-filter-outline" title="filter searched text styles"
              @click="searchFilterSwitch = !searchFilterSwitch" />
            <ActionsOnReplaceDropdown v-if="optionSearchOnly" :editor="editor" :actions="actionsOnReplace"
              title="actions on selected text" @update-actions="updateActions" />
          </div>
        </q-card-section>
        <q-card-section v-if="!cssMode && searchFilterSwitch" horizontal>
          <MarksPaletteDropdown :editor="editor" icon="mdi-filter-outline" :addable-marks="baseMarksAndCustomStyles()"
            none-selected-label="no filter" :positiveMarks="filterMarkPresence" :negativeMarks="filterMarkAbsence"
            @selected-marks="setMarksFilters" />
        </q-card-section>
        <q-card-section v-if="!optionSearchOnly" horizontal>
          <q-input class="search-and-replace-textfield q-mx-xs" :model-value="textToReplace" label="replace with"
            stack-label @update:model-value="updateTextToReplace" @keyup="keyup" />
          <ActionsOnReplaceDropdown :editor="editor" :actions="actionsOnReplace" title="actions on replaced text"
            @update-actions="updateActions" />
        </q-card-section>
      </q-card-section>
      <q-card-actions>
        <q-btn icon="mdi-magnify" title="search" size="md" padding="md" @click="startSearch()" />
        <q-btn :disabled="!canPrevFound()" icon="mdi-chevron-left" size="md" padding="md" title="select previous found"
          @click="prevFound()" />
        <q-btn :disabled="!canNextFound()" icon="mdi-chevron-right" size="md" padding="md" title="select next found"
          @click="nextFound(true)" />
        <q-btn icon="mdi-autorenew" size="md" padding="md" title="replace selected" @click="replaceSelected" />
        <q-btn size="md" padding="md" title="replace & select next found" @click="replaceNextText">
          <q-icon name="mdi-autorenew"></q-icon>
          <q-icon name="mdi-chevron-right"></q-icon>
        </q-btn>
        <q-btn size="md" padding="md" title="replace all" @click="replaceAll">
          <q-icon name="mdi-autorenew"></q-icon>
          <q-icon name="mdi-chevron-double-right"></q-icon>
        </q-btn>
        <q-space style="min-width: 1rem" />
        <IndicesButtons v-if="showIndicesButtons" enable-alternative-buttons="true" :editor="editor" size="md"
          padding="md" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import {
  ActionNameWithProps,
  AddOrRemoveCustomStyleActionProps,
  AddOrRemoveMarkActionProps,
  Automation,
  CustomStyleInstance,
  ElementsSelection,
  getElementsSelections,
  GetProjectOptions,
  getSearchAndReplaces,
  INDEXED_TEXT_ATTR,
  NODE_NAME_INDEX_REF,
  SearchAndReplace,
  SetSpanActionProps,
} from '../common';
import {
  FoundTextRange,
  getAllIndices,
  getCssSelected,
  getCssSelectionIndex,
  getEditorConfiguration,
} from '../schema';
import {
  AddableMark,
  addableMarkToMark,
  baseAddableMarks,
  customStylesToAddableMarks,
  searchMarkSpecToAddableMarks,
} from './helpers/addableMark';
import ActionsOnReplaceDropdown from './ActionsOnReplaceDropdown.vue';
import IndicesButtons from './IndicesButtons.vue';
import MarksPaletteDropdown from './MarksPaletteDropdown.vue';
import SaveConfigurationElementPopup from './SaveConfigurationElementPopup.vue';
import { setupQuasarIcons } from './helpers/quasarIcons'
import {
  LabeledNodeOrMark,
  SearchQuery,
  SearchResultFilter,
  SelectedNodeOrMark,
  getEditorProject,
  getMatchHighlights,
  nodeOrMarkToPandocName
} from '../schema/helpers';
import { mapState } from 'pinia';
import { useActions, useBackend } from '../stores';
import {
  ACTION_GET_PROJECT,
  ACTION_LOWERCASE,
  ACTION_REPLACE_AND_SELECT_NEXT,
  ACTION_SELECT_NEXT,
  ACTION_SELECT_PREV,
  ACTION_UPPERCASE,
  ACTION_UPPERCASE_FIRST,
  ActionName,
  setActionCommand
} from '../actions';
import { Mark, Node as ProsemirrorNode } from '@tiptap/pm/model'
import { toRaw } from 'vue';

type DialogPosition = "top" | "bottom" | "standard" | "right" | "left" | undefined
type NodeOrMarkToLabel = (doc: ProsemirrorNode, nom: SelectedNodeOrMark | undefined, key: string) => string | undefined
const SELECTED_LABEL_MAX_LENGTH = 64

const defaultNodeOrMarkToLabel: NodeOrMarkToLabel = (doc, nom, key) => {
  if (!nom) return
  const { node, mark } = nom
  const typeName = node?.type.name || mark?.type.name
  const node_or_mark = node || mark
  const label = node_or_mark && nodeOrMarkToPandocName(node_or_mark) || typeName
  const textContent = node?.textContent
  if (node?.isAtom) {
    if (typeName === NODE_NAME_INDEX_REF && node.attrs.kv[INDEXED_TEXT_ATTR]) {
      return `${typeName}: ${node.attrs.kv[INDEXED_TEXT_ATTR]}`
    }
  } else if (textContent) {
    return textContent.length < SELECTED_LABEL_MAX_LENGTH
      ? textContent
      : textContent.substring(0, SELECTED_LABEL_MAX_LENGTH) + '...'
    // } else if (mark && to > from) {
    //   const text = doc.textBetween(from, to)
    //   if (text) return text
  }
  return label
}

export default {
  components: {
    ActionsOnReplaceDropdown,
    IndicesButtons,
    MarksPaletteDropdown,
    SaveConfigurationElementPopup,
  },
  props: ['visible', 'editor', 'nodeOrMarkToLabel'],
  emits: ['hideSearchAndReplaceDialog'],
  setup() {
    setupQuasarIcons()
  },
  data() {
    return {
      cssMode: false,
      query: undefined as SearchQuery | undefined,
      showIndicesButtons: false,
      searchStarted: false,
      dialogPosition: "top" as DialogPosition,
      showFields: true,
      // the search text in both modes (text and CSS)
      searchInput: '',
      // in CSS selection mode, the CSS selector
      cssSelector: '',
      // in CSS selection mode, merge adjacent text nodes with the same marks
      optionMergeAdjacentMarks: true,
      // in text mode, the text or the regex to be searched
      textToSearch: '',
      // the the replacing text (text and CSS)
      textToReplace: '',
      // just search, don't replace
      optionSearchOnly: false,
      // in text mode, search is case insensitive
      optionCaseInsensitive: false,
      // search as regular expression (only in text search)
      optionRegex: false,
      // start again from the top after last found, or go to the bottom going back from first found
      optionCycle: false,
      // search a whole word
      optionWholeWord: false,
      // a switch to activate filters on searched text (only in text search)
      searchFilterSwitch: false,
      filterMarkPresence: [] as AddableMark[],
      filterMarkAbsence: [] as AddableMark[],
      // actions to be performed on replaced text or selected with CSS
      actionsOnReplace: [] as ActionNameWithProps[],
    };
  },
  computed: {
    ...mapState(useActions, ['lastAction']),
    ...mapState(useBackend, ['backend']),
    foundIndex(): number {
      const state = this.editor?.state
      if (state) {
        if (this.cssMode) {
          return getCssSelectionIndex(state)
        } else {
          const ranges = getMatchHighlights(state).find();
          const { from: selFrom, to: selTo } = state.selection;
          return ranges.findIndex(({ from, to }) => from === selFrom && to === selTo)
        }
      }
      return -1
    },
    indices() {
      return getAllIndices(this.editor?.state)
    },
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    project() {
      return getEditorProject(this.editor)
    },
    searchLabel(): string {
      return this.cssMode
        ? 'CSS selector(s)'
        : this.optionRegex
          ? 'search regular expression'
          : 'search text'
    },
    searchAndReplaces() {
      return getSearchAndReplaces(this.configuration)
    },
    cssSelections(): ElementsSelection[] {
      const config = this.configuration
      const sels = config && getElementsSelections(config) || []
      return sels
    },
    knownSettings(): Automation[] {
      if (this.cssMode)
        return this.cssSelections
      else
        return this.searchAndReplaces
    },
    cssSelected(): LabeledNodeOrMark[] {
      const state = this.editor?.state
      if (state) {
        const doc = state.doc
        const nom2label: NodeOrMarkToLabel = this.nodeOrMarkToLabel || defaultNodeOrMarkToLabel;
        const els = getCssSelected(state) || []
        return els.map((el, i) => ({
          ...el,
          label: nom2label(doc, el, `sel-${i}`),
          key: `el-${i + 1}`,
          class: ''
        } as LabeledNodeOrMark))
      } else
        return []
    },
    ranges(): FoundTextRange[] {
      return this.editor.state && getMatchHighlights(this.editor.state).find()
    },
    foundCount(): number {
      return this.cssMode ? this.cssSelected.length : this.ranges.length
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
    currentFoundItemShortText() {
      if (this.searchStarted) {
        const which = this.foundIndex >= 0 ? `${this.foundIndex + 1}/` : ''
        const total = this.foundCount || 0
        return total > 0 && `${which}${total}` || '0'
      }
      return ''
    },
    expandIcon() {
      return this.showFields ? 'mdi-arrow-collapse-vertical' : 'mdi-arrow-expand-vertical'
    },
    expandTooltip() {
      return `show ${this.showFields ? 'less' : 'more'}`
    },
    // a function to filter search results
    filterResult(): SearchResultFilter | undefined {
      if (!this.searchFilterSwitch)
        return undefined
      const positive = this.filterMarkPresence
      const negative = this.filterMarkAbsence
      return (state, result) => {
        const { doc, schema } = state
        const { from, to } = result
        let i, mark
        for (i = 0; i < positive.length; i++) {
          mark = addableMarkToMark(schema, positive[i])
          if (!mark || !doc.rangeHasMark(from, to, mark)) return false
        }
        for (i = 0; i < negative.length; i++) {
          const mark = addableMarkToMark(schema, negative[i])
          if (mark && doc.rangeHasMark(from, to, mark)) return false
        }
        return true
      }
    }
  },
  watch: {
    cssMode(css_mode: boolean, prev_mode: boolean) {
      if (css_mode !== prev_mode) {
        if (css_mode) {
          this.textToSearch = this.searchInput
        } else {
          this.cssSelector = this.searchInput
        }
        this.updateSearchInput(css_mode ? this.cssSelector : this.textToSearch)
        this.startSearch()
      }
    },
    mergeAdjacentMarks() {
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
    setCssSelector(sel: ElementsSelection) {
      this.updateSearchInput(sel.cssSelector)
      if (sel.replace) {
        this.optionSearchOnly = false
        this.updateTextToReplace(sel.replace)
      } else {
        this.optionSearchOnly = true
      }
      this.startSearch()
      // this.editorAttributesTab = sel.tab
    },
    scrollAtSelectedCss() {
      if (this.foundCount <= 0 || this.foundIndex < 0) return
      const e: LabeledNodeOrMark = this.cssSelected[this.foundIndex]
      // console.log(`scroll to ${e.label} at pos ${e.pos}`)
      const editor = this.editor
      const { node, mark, pos, from, to } = e
      const nom = node || mark
      const is_text = !!node && (nom as ProsemirrorNode).isText
      if (is_text) {
        // console.log(`scroll to a text`)
        editor.chain()
          // .setTextSelection(pos)
          .scrollPosToCenterIfNotVisible(pos)
          // .scrollIntoView()
          .focus()
          .run()
      } else if (!!node) {
        // console.log(`scroll to a node`)
        editor.chain()
          // .setNodeSelection(pos)
          .scrollPosToCenterIfNotVisible(pos)
          // .scrollIntoView()
          .focus()
          .run()
      } else if (!!mark) { // it's a Mark
        // console.log(`scroll to a mark`)
        editor.chain()
          // .setTextSelection({ from, to })
          .scrollPosToCenterIfNotVisible(from)
          // .scrollIntoView()
          .focus()
          .run()
      }
    },
    startSearchText() {
      const editor = this.editor
      if (editor) {
        this.textToSearch = this.searchInput
        const query = new SearchQuery({
          search: this.textToSearch,
          caseSensitive: !this.optionCaseInsensitive,
          literal: true,
          regexp: !!this.optionRegex,
          replace: this.textToReplace,
          wholeWord: !!this.optionWholeWord,
          filterResult: this.filterResult,
        })
        editor.chain().startSearch(query).focus().selectNextFoundText().run();
        this.query = query
        return true
      }
      return false
    },
    startSearchCss(): boolean {
      const editor = this.editor
      if (editor) {
        try {
          editor.commands.cssSelect(this.searchInput, {
            mergeAdjacentMarks: this.optionMergeAdjacentMarks,
            sort: true
          })
          return true
        } catch (err: any) {
          console.log(err.message)
        }
      }
      return false
    },
    startSearch() {
      const started = this.cssMode ? this.startSearchCss() : this.startSearchText()
      this.searchStarted = started
      if (started)
        this.editor?.commands.focus()
      return started
    },
    hideDialog() {
      if (this.editor) {
        this.editor.commands.hideFoundTexts();
      }
      this.showFields = true;
      this.$emit('hideSearchAndReplaceDialog');
    },
    updateSearchInput(v: string | number | null) {
      const newValue = v ? v.toString() : ''
      this.searchInput = newValue
      this.searchStarted = false
      if (this.cssMode)
        this.cssSelector = this.searchInput
      else
        this.textToSearch = this.searchInput
    },
    updateTextToReplace(v: string | number | null) {
      const newValue = v ? v.toString() : ''
      this.textToReplace = newValue;
    },
    canPrevFound() {
      return this.cssMode
        ? this.editor.can().selectPrevCss(this.optionCycle)
        : this.editor.can().selectPrevFoundText(this.optionCycle)
    },
    canNextFound() {
      return this.cssMode
        ? this.editor.can().selectNextCss(this.optionCycle)
        : this.editor.can().selectNextFoundText(this.optionCycle)
    },
    prevFound() {
      if (this.cssMode) {
        this.editor.commands.selectPrevCss(this.optionCycle)
        this.scrollAtSelectedCss()
      } else {
        this.editor.commands.selectPrevFoundText(this.optionCycle)
      }
      this.editor.commands.focus()
    },
    nextFound(scroll?: boolean): boolean {
      if (this.cssMode) {
        if (!this.editor.can().selectNextCss(this.optionCycle))
          return false
        this.editor.commands.selectNextCss(this.optionCycle)
        if (scroll) this.scrollAtSelectedCss()
      } else {
        if (!this.editor.can().selectNextFoundText(this.optionCycle))
          return false
        this.editor.commands.selectNextFoundText(this.optionCycle)
        if (scroll) this.editor.commands.scrollIntoView()
      }
      if (scroll) this.editor.commands.focus()
      return true
    },
    replaceSelected() {
      if (this.optionSearchOnly) {
        this.editor.commands.applyActions(this.actionsOnReplace)
      } else {
        if (this.cssMode)
          this.editor.chain()
            .replaceWithText(this.textToReplace)
            .applyActions(this.actionsOnReplace)
            .run()
        else
          this.editor.chain()
            .replaceSelectedText()
            .applyActions(this.actionsOnReplace)
            .run()
      }
      this.editor.commands.focus()
    },
    replaceNextText() {
      this.replaceSelected()
      this.nextFound(true)
    },
    replaceAll() {
      // if it's just a text replacement without actions, call replaceAll(), because it's faster
      if (!this.cssMode && this.actionsOnReplace.length === 0) {
        this.editor.chain().replaceAll().focus().run()
      } else {
        // check the position in case optionCycle==true, not to cycle infinitely
        const startPos = this.editor.state.selection.$anchor.pos
        let pos = startPos
        let cycledAround = false
        this.replaceSelected()
        while (this.nextFound()) {
          pos = this.editor.state.selection.$anchor.pos
          if (!cycledAround) cycledAround = pos <= startPos
          if (cycledAround && pos >= startPos)
            break
          this.replaceSelected()
        }
        this.editor.commands.focus()
      }
    },
    baseMarksAndCustomStyles(selected?: string[]): AddableMark[] {
      const editor = this.editor
      if (editor) {
        const customStyles: CustomStyleInstance[] = this.configuration?.customStylesInstances || []
        const am: AddableMark[] = baseAddableMarks(selected)
        customStylesToAddableMarks(customStyles, selected, am)
        return am
      }
      return []
    },
    setMarksFilters(positive: AddableMark[], negative: AddableMark[]) {
      this.filterMarkPresence = positive || []
      this.filterMarkAbsence = negative || []
    },
    resetSettings() {
      this.searchInput = ''
      this.textToReplace = ''
      this.optionSearchOnly = false
      this.optionCaseInsensitive = false
      this.optionRegex = false
      this.optionCycle = false
      this.optionWholeWord = false
      this.searchFilterSwitch = false
      this.actionsOnReplace = []
      this.foundIndex = -1
    },
    loadSearchAndReplace(sar: SearchAndReplace) {
      this.textToSearch = sar.search;
      this.updateSearchInput(this.textToSearch)
      this.filterMarkPresence = sar.filterOnMarks?.present
        ? searchMarkSpecToAddableMarks(sar.filterOnMarks.present, this.editor.state.schema, this.configuration)
        : []
      this.filterMarkAbsence = sar.filterOnMarks?.absent
        ? searchMarkSpecToAddableMarks(sar.filterOnMarks.absent, this.editor.state.schema, this.configuration)
        : []
      this.searchFilterSwitch = this.filterMarkPresence.length + this.filterMarkAbsence.length > 0
      this.textToReplace = sar.replace || '';
      this.updateTextToReplace(this.textToReplace)
      this.optionSearchOnly = !!sar.optionSearchOnly || (!sar.replace && sar.replace !== '')
      this.optionCaseInsensitive = !!sar.optionCaseInsensitive
      this.optionRegex = !!sar.optionRegex;
      this.optionCycle = !!sar.optionCycle;
      // this.optionCapitalize = sar.capitalize || 'none';
      this.optionWholeWord = !!sar.optionWholeWord;
      // capitalization
      let actionsOnReplace: ActionNameWithProps[] = []
      if (sar.capitalize === 'upper')
        actionsOnReplace.push(ACTION_UPPERCASE)
      else if (sar.capitalize === 'lower')
        actionsOnReplace.push(ACTION_LOWERCASE)
      else if (sar.capitalize === 'first')
        actionsOnReplace.push(ACTION_UPPERCASE_FIRST)
      // marks
      sar.addMarks?.forEach(m => {
        actionsOnReplace.push({
          name: 'add-mark' as ActionName,
          props: {
            markType: m
          } as AddOrRemoveMarkActionProps
        } as ActionNameWithProps)
      })
      // styles
      sar.addStyles?.forEach(s => {
        actionsOnReplace.push({
          name: 'add-custom-style' as ActionName,
          props: {
            styleName: s
          } as AddOrRemoveCustomStyleActionProps
        } as ActionNameWithProps)
      })
      // spans
      const firstAlternative = sar.addSpans && sar.addSpans[0]
      if (firstAlternative)
        actionsOnReplace.push({
          name: 'set-span' as ActionName,
          props: {
            classes: firstAlternative?.classes || [],
            attrs: firstAlternative?.kv || {},
            alternatives: sar.addSpans,
            alternativeIndex: firstAlternative ? 0 : -1,
          } as SetSpanActionProps
        } as ActionNameWithProps)
      if (sar.actions)
        actionsOnReplace = [...actionsOnReplace, ...sar.actions]
      this.actionsOnReplace = [...actionsOnReplace]
      // const am: AddableMark[] = baseAddableMarks(sar.addMarks || [])
      // customStylesToAddableMarks(this.customStyles, sar.addStyles, am)
      // if (sar.addSpans && sar.addSpans.length > 0) {
      //   customSpanToAddableMarks(sar.addSpans, [sar.addSpans[0].name], am)
      // }
      if (this.editor) {
        this.editor.chain().hideFoundTexts().run()
        this.searchStarted = false
      }
    },
    updateActions(actions: ActionNameWithProps[]) {
      // console.log(toRaw(actions))
      this.actionsOnReplace = actions
    },
    deleteSettings(name: string, description: string, isProject: boolean, configName?: string) {
      this.saveSettings(name, description, isProject, configName, true)
    },
    async saveSettings(name: string, description: string, isProject: boolean, configName?: string, isDeletion?: boolean) {
      let obj
      if (this.cssMode) {
        obj = {
          type: 'elements-selection',
          name,
          description,
          cssSelector: toRaw(this.searchInput),
          replace: toRaw(this.textToReplace),
          // tab,
        } as ElementsSelection
      } else {
        const present = this.filterMarkPresence.map(am => am.markspec)
        const absent = this.filterMarkAbsence.map(am => am.markspec)
        const filterOnMarks = present.length + absent.length === 0
          ? undefined
          : {
            present: present.length === 0 ? undefined : present,
            absent: absent.length === 0 ? undefined : absent,
          }
        obj = {
          type: 'search-replace',
          name,
          description,
          search: toRaw(this.searchInput),
          filterOnMarks,
          replace: this.optionSearchOnly ? undefined : toRaw(this.textToReplace),
          actions: toRaw(this.actionsOnReplace),
          optionCaseInsensitive: toRaw(this.optionCaseInsensitive),
          optionCycle: toRaw(this.optionCycle),
          optionSearchOnly: toRaw(this.optionSearchOnly),
          optionRegex: toRaw(this.optionRegex),
          optionWholeWord: toRaw(this.optionWholeWord),
          // capitalize, -- DEPRECATED
          // addMarks, -- DEPRECATED
          // addSpans, -- DEPRECATED
          // addStyles, -- DEPRECATED
        } as SearchAndReplace
      }
      // console.log(serializeConfiguration(this.configuration!))
      if (isProject && this.project)
        await this.backend?.storeInConfiguration(
          'automations',
          obj,
          !!isDeletion,
          isProject,
          this.project.path
        )
      setActionCommand(this.editor.state, ACTION_GET_PROJECT, {
        path: this.project?.path,
        computeConfig: true,
      } as GetProjectOptions)
    }
  },
};
</script>

<style lang="scss">
.search-and-replace-textfield {
  min-width: 300px;
}

.small {
  min-width: 0.3rem;
  max-width: 0.5rem;
}

.big {
  min-width: 1rem;
}
</style>