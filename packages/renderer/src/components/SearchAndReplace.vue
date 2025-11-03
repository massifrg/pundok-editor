<template>
  <q-dialog :model-value="visible" :position="dialogPosition" seamless>
    <q-card style="max-width: 60vw">
      <q-card-section class="q-ma-xs" horizontal>
        <div class="flex flex-center">
          <q-chip :label="currentFoundItemShortText" :color="foundItemsColor" round class="q-pa-md" text-color="white"
            icon="mdi-text-search" :title="foundItemsText" />
        </div>
        <q-space />
        <q-btn round class="q-pa-sm" size="sm" icon="mdi-reload" color="primary" title="reset" outline
          @click="resetDialog()" />
        <q-space class="small" />
        <q-btn round class="q-pa-sm" size="sm" icon="mdi-pencil-lock" color="primary" :outline="!optionSearchOnly"
          title="just search, don't replace" @click="optionSearchOnly = !optionSearchOnly" />
        <q-space v-if="searchAndReplaces.length > 0" class="small" />
        <q-btn v-if="searchAndReplaces.length > 0" round class="q-pa-sm" size="sm" color="primary" label=""
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
        <q-space class="small" />
        <!-- <q-toggle v-model="showIndicesButtons" icon="mdi-cursor-pointer" title="show buttons for indices" /> -->
        <q-btn round class="q-pa-sm" size="sm" color="primary" :outline="!showIndicesButtons" icon="mdi-cursor-pointer"
          title="show buttons for indices" @click="showIndicesButtons = !showIndicesButtons" />
        <q-space />
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
          <q-input autofocus class="search-and-replace-textfield q-mx-xs" :model-value="textToSearch" label="search"
            stack-label @update:model-value="updateTextToSearch" @keypress="keypressed" @keyup="keyup" />
          <div class="q-pt-md q-gutter-none">
            <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionCaseInsensitive"
              icon="mdi-format-letter-case" title="case insensitive search"
              @click="optionCaseInsensitive = !optionCaseInsensitive" />
            <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionRegex" icon="mdi-regex"
              title="search with regular expressions (Unicode aware)" @click="optionRegex = !optionRegex" />
            <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionCycle" icon="mdi-find-replace"
              title="cycle through found texts" @click="optionCycle = !optionCycle" />
            <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!optionWholeWord" icon="whole_word"
              title="whole words" @click="optionWholeWord = !optionWholeWord" />
          </div>
        </q-card-section>
        <q-card-section v-if="!optionSearchOnly" horizontal>
          <q-input class="search-and-replace-textfield q-mx-xs" :model-value="textToReplace" label="replace with"
            stack-label @update:model-value="updateTextToReplace" @keyup="keyup" />
          <ActionsOnReplaceDropdown v-if="!optionSearchOnly" :editor="editor" :actions="actionsOnReplace"
            @update-actions="updateActions" />
        </q-card-section>
      </q-card-section>
      <q-card-actions>
        <q-btn icon="mdi-magnify" title="search" size="md" padding="md" @click="startSearch()" />
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
  Capitalize,
  CustomStyleInstance,
  getSearchAndReplaces,
  SearchAndReplace,
  SetSpanActionProps,
} from '../common';
import {
  FoundTextRange,
  getEditorConfiguration,
} from '../schema';
import {
  AddableMark,
  baseAddableMarks,
  customStylesToAddableMarks,
  customSpanToAddableMarks
} from '.';
import ActionsOnReplaceDropdown from './ActionsOnReplaceDropdown.vue';
import IndicesButtons from './IndicesButtons.vue';
import { setupQuasarIcons } from './helpers/quasarIcons'
import { SearchQuery, SearchResultFilter, getMatchHighlights } from '../schema/helpers';
import { useActions } from '../stores';
import { mapState } from 'pinia';
import {
  ACTION_REPLACE_AND_SELECT_NEXT,
  ACTION_SELECT_NEXT,
  ACTION_SELECT_PREV,
  ActionName
} from '../actions';
import { toRaw } from 'vue';

type DialogPosition = "top" | "bottom" | "standard" | "right" | "left" | undefined

export default {
  components: {
    ActionsOnReplaceDropdown,
    IndicesButtons,
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
      actionsOnReplace: [] as ActionNameWithProps[],
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
  },
  watch: {
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
        const query = new SearchQuery({
          search: this.textToSearch,
          caseSensitive: !this.optionCaseInsensitive,
          literal: true,
          regexp: !!this.optionRegex,
          replace: this.textToReplace,
          wholeWord: !!this.optionWholeWord,
          // filterResult: 
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
        // .applyTextTransforms(this.textTransforms)
        .applyActions(this.actionsOnReplace)
        .focus().run()
      this.updateCountAndIndex()

    },
    replaceNextText() {
      this.editor.chain()
        .replaceSelectedText()
        // .applyTextTransforms(this.textTransforms)
        .applyActions(this.actionsOnReplace)
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
      const actionsOnReplace: ActionNameWithProps[] = []
      sar.addMarks?.forEach(m => {
        actionsOnReplace.push({
          name: 'add-mark' as ActionName,
          props: {
            markType: m
          } as AddOrRemoveMarkActionProps
        } as ActionNameWithProps)
      })
      sar.addStyles?.forEach(s => {
        actionsOnReplace.push({
          name: 'add-custom-style' as ActionName,
          props: {
            styleName: s
          } as AddOrRemoveCustomStyleActionProps
        } as ActionNameWithProps)
      })
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
      this.actionsOnReplace = [...actionsOnReplace]
      const am: AddableMark[] = baseAddableMarks(sar.addMarks || [])
      customStylesToAddableMarks(this.customStyles, sar.addStyles, am)
      if (sar.addSpans && sar.addSpans.length > 0) {
        customSpanToAddableMarks(sar.addSpans, [sar.addSpans[0].name], am)
      }
      if (this.editor) {
        this.editor.chain().hideFoundTexts().run()
        this.searchStarted = false
      }
    },
    updateActions(actions: ActionNameWithProps[]) {
      // console.log(toRaw(actions))
      this.actionsOnReplace = actions
    }
  },
};
</script>

<style lang="scss">
.search-and-replace-textfield {
  min-width: 300px;
}

.small {
  max-width: 0.5rem;
}
</style>