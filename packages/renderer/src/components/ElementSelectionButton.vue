<template>
  <ToolbarButton icon="invoice_list" title="select elements with CSS selectors" @click="showDialog = !showDialog">
    <q-dialog v-model="showDialog" :position="dialogPosition"
      :full-height="dialogPosition == 'right' || dialogPosition == 'left'" seamless>
      <q-card>
        <q-card-section class="q-ma-xs" horizontal>
          <q-btn v-if="dialogPosition != 'right'" dense class="q-px-md" icon="mdi-arrow-right"
            title="move this dialog to the right" size="xs" @click="() => { dialogPosition = 'right' }"></q-btn>
          <q-btn v-if="dialogPosition != 'left'" dense class="q-px-md" icon="mdi-arrow-left"
            title="move this dialog to the left" size="xs" @click="() => { dialogPosition = 'left' }"></q-btn>
          <!-- <q-btn v-if="dialogPosition != 'top'" dense class="q-px-md" icon="mdi-arrow-up"
            title="move this dialog to the top" size="xs" @click="() => { dialogPosition = 'top' }"></q-btn>
          <q-btn v-if="dialogPosition != 'bottom'" dense class="q-px-md" icon="mdi-arrow-down"
            title="move this dialog to the bottom" size="xs" @click="() => { dialogPosition = 'bottom' }"></q-btn> -->
          <q-space />
          <q-btn dense icon="mdi-close" size:xs @click="showDialog = false" />
        </q-card-section>
        <q-card-section v-if="errorMessage">
          <q-banner inline-actions class="text-white bg-red">
            {{ errorMessage }}
            <template v-slot:action>
              <q-btn flat color="white" label="Ok" @click="errorMessage = undefined" />
            </template>
          </q-banner>
        </q-card-section>
        <q-card-section>
          <q-input outlined v-model="selector" label="CSS selector" @keydown="keydown" />
        </q-card-section>
        <q-card-section horizontal>
          <q-btn v-if="selections.length > 0" class="q-ma-xs" size="sm" rounded color="primary" label=""
            title="load a predefined CSS selector" icon="mdi-playlist-star">
            <q-menu anchor="bottom start" self="bottom end">
              <q-list>
                <q-item v-for="sel in selections" clickable v-close-popup dense :title="sel.description"
                  @click="setSelector(sel)">
                  <q-item-section>{{ sel.name }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          <q-space />
          <q-toggle v-model="mergeSameAdjacentMarks" icon="mdi-set-merge" title="merge same adjacent marks" />
          <q-space />
          <q-btn label="select" size="sm" @click="applyCssSelector()" />
        </q-card-section>
        <q-card-section>
          <!-- <q-scroll-area style="height: 50vw"> -->
          <q-list v-if="elements.length > 0">
            <q-item v-for="(e, i) in elements" :key="`element${i}`"
              :class="clicked === `element${i}` ? 'bg-amber-4' : ''" clickable @click="clicked = `element${i}`">
              <q-tooltip class="bg-amber-2 text-black" :anchor="tooltipAnchor" :self="tooltipSelf"
                v-html="tooltipFor(e)" style="opacity: .8" />
              <q-item-section @click="scrollAtElement(e)" style="max-width: 2rem">
                <span :class="clicked === `element${i}` ? 'bg-amber-4' : ''">{{ i + 1 }}</span>
              </q-item-section>
              <q-item-section @click="scrollAtElement(e)">{{ e.label }}</q-item-section>
              <q-item-section side>
                <q-btn v-if="hasEditableAttributes(e)" icon="mdi-playlist-edit" size="xs" @click="editAttributes(e)" />
              </q-item-section>
            </q-item>
          </q-list>
          <!-- </q-scroll-area> -->
          <div v-if="elements.length === 0"><i>no elements selected</i></div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </ToolbarButton>
</template>
<script lang="ts">
import { Component } from 'vue';
import { Editor } from '@tiptap/core'
import { Node as PmNode } from '@tiptap/pm/model'
import ToolbarButton from './ToolbarButton.vue'
import { editorKeyFromState, getCssSelected, getEditorConfiguration } from '../schema'
import { setupQuasarIcons } from './helpers/quasarIcons'
import {
  editableAttrsForNodeOrMark,
  LabeledNodeOrMark,
  SelectedNodeOrMark,
  tooltipFor
} from '../schema/helpers';
import {
  ElementsSelection,
  getElementsSelections,
  INDEXED_TEXT_ATTR,
  NODE_NAME_INDEX_REF
} from '../common';
import { setActionEditAttributes } from '../actions';
import { nodeOrMarkToPandocName } from '../schema/helpers/PandocVsProsemirror';

const SELECTED_LABEL_MAX_LENGTH = 64

type NodeOrMarkToLabel = (doc: PmNode, nom: SelectedNodeOrMark | undefined, key: string) => string | undefined

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
  props: ['editor', 'nodeOrMarkToLabel'],
  components: {
    ToolbarButton
  },
  setup() {
    setupQuasarIcons();
  },
  data() {
    return {
      // elements: [] as LabeledNodeOrMark[],
      showDialog: false,
      dialogPosition: 'right',
      errorMessage: undefined as string | undefined,
      selector: '',
      mergeSameAdjacentMarks: true,
      editorAttributesTab: undefined as string | undefined,
      clicked: '',
    }
  },
  computed: {
    selections(): ElementsSelection[] {
      const config = getEditorConfiguration(this.editor)
      const sels = config && getElementsSelections(config) || []
      return sels
    },
    tooltipAnchor(): string {
      return this.dialogPosition === 'left' ? "center end" : "center start"
    },
    tooltipSelf(): string {
      return this.dialogPosition === 'left' ? "center start" : "center end"
    },
    elements(): LabeledNodeOrMark[] {
      const state = this.editor?.state
      if (state) {
        const doc = state.doc
        const nom2label: NodeOrMarkToLabel = this.nodeOrMarkToLabel || defaultNodeOrMarkToLabel;
        const els = getCssSelected(state)
        return els.map((el, i) => ({
          ...el,
          label: nom2label(doc, el, `sel-${i}`),
          key: `el-${i + 1}`,
          class: ''
        } as LabeledNodeOrMark))
      }
      return []
    }
  },
  watch: {
    mergeSameAdjacentMarks() {
      this.applyCssSelector()
    }
  },
  methods: {
    scrollAtElement(e: LabeledNodeOrMark) {
      console.log(`scroll to ${e.label} at pos ${e.pos}`)
      const editor = this.editor as Editor
      const { node, mark, pos, from, to } = e
      const nom = node || mark
      const is_text = !!node && (nom as PmNode).isText
      if (is_text) {
        // console.log(`scroll to a text`)
        editor.chain()
          .setTextSelection(pos)
          .scrollIntoView()
          .focus()
          .run()
      } else if (!!node) {
        // console.log(`scroll to a node`)
        editor.chain()
          .setNodeSelection(pos)
          .scrollIntoView()
          .focus()
          .run()
      } else if (!!mark) { // it's a Mark
        // console.log(`scroll to a mark`)
        editor.chain()
          .setTextSelection({ from, to })
          .scrollIntoView()
          .focus()
          .run()
      }
    },
    keydown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Enter':
          this.applyCssSelector();
          e.preventDefault()
          break
        case 'Escape':
          this.showDialog = false
          e.preventDefault()
          break
        default:
          this.editorAttributesTab = undefined
      }
    },
    tooltipFor(e: LabeledNodeOrMark) {
      return tooltipFor(e, this.editor?.state?.doc)
    },
    applyCssSelector() {
      this.errorMessage = undefined
      const editor = this.editor
      if (editor) {
        try {
          editor.commands.cssSelect(this.selector, this.mergeSameAdjacentMarks)
        } catch (err: any) {
          this.errorMessage = err.message
          console.log(err.message)
        }
      }
    },
    setSelector(sel: ElementsSelection) {
      this.selector = sel.cssSelector
      this.editorAttributesTab = sel.tab
    },
    guessBetterTab(e: LabeledNodeOrMark): string | undefined {
      const nom = e.node || e.mark
      switch (nom?.type.name) {
        case 'indexRef':
          return 'idref'
        case 'span':
          return 'customStyle'
      }
      return undefined
    },
    hasEditableAttributes(e: LabeledNodeOrMark) {
      const attrs = editableAttrsForNodeOrMark(e.node || e.mark);
      return attrs.length > 0
    },
    editAttributes(e: LabeledNodeOrMark) {
      this.scrollAtElement(e)
      const editorKey = editorKeyFromState(this.editor.state)
      if (editorKey)
        setActionEditAttributes(editorKey, e, {
          tab: this.editorAttributesTab || this.guessBetterTab(e)
        })
    }
  }
} as Component
</script>