<template>
  <q-menu :model-value="!!clickedNodeOrMark" touch-position context-menu @before-show="prepareContextMenuItems">
    <q-list dense>
      <q-item v-for="hl in highlightedActions" :key="hl.name" clickable :title="tooltipForAction(hl)" v-close-popup
        @click="setAction(hl)">
        <q-item-section side>
          <q-icon :name="hl.icon" />
        </q-item-section>
        <q-item-section>{{ labelForAction(hl) }}</q-item-section>
      </q-item>
      <q-item v-for="lnom in labeledWithActions" :key="lnom.key" clickable :class="classFor(lnom)">
        <q-item-section :class="classFor(lnom)" side>{{ lnom.node ? 'N' : 'M' }}</q-item-section>
        <q-item-section>{{ lnom.label }}</q-item-section>
        <q-item-section :class="classFor(lnom)" side>
          <q-icon name="arrow_right" />
        </q-item-section>
        <q-menu v-if="actionsFor(lnom).length > 0" anchor="top end" self="top start">
          <NodeOrMarkContextMenu :editor="editor" :node-or-mark="lnom" />
        </q-menu>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { CustomStyleInstance, CustomStyleDef } from '../common'
import {
  ActionCore,
  ActionForNodeOrMark,
  actionsForNodeOrMark,
  BaseEditorAction,
  canExecuteEditorAction,
  executeEditorAction,
  isHighlightedAction,
  labelForAction,
  setActionCommand,
  tooltipForAction
} from '../actions'
import {
  colorFor,
  LabeledNodeOrMark,
  labeledNodesAndMarksAtPos,
  SelectedNodeOrMark
} from '../schema/helpers'
import { getEditorConfiguration } from '../schema'
import NodeOrMarkContextMenu from './NodeOrMarkContextMenu.vue'
import { flatten } from 'lodash-es'

export default {
  props: ['editor'],
  data() {
    return {
      clickedNodeOrMark: undefined as SelectedNodeOrMark | undefined,
      labeled: [] as LabeledNodeOrMark[]
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    nameToCustomStyle(): Record<string, CustomStyleDef> {
      return Object.fromEntries(this.customStyles.map(cs => ([cs.styleDef.name, cs.styleDef])))
    },
    labeledWithActions() {
      return this.labeled.filter(l => this.actionsFor(l).length > 0)
    },
    highlightedActions() {
      return flatten(this.labeledWithActions.map(lwa => this.actionsFor(lwa)))
        .filter(a => isHighlightedAction(a, this.editor))
    },
  },
  components: {
    NodeOrMarkContextMenu
  },
  methods: {
    classFor(lnom: LabeledNodeOrMark) {
      return `bg-${colorFor(lnom)} text-white`
    },
    actionsFor(labeled: LabeledNodeOrMark, onlyHighlighted?: boolean) {
      const editor = this.editor
      if (!editor) return []
      return actionsForNodeOrMark(editor.state, labeled)
        .filter(a => canExecuteEditorAction(editor, a))
        .filter(a => onlyHighlighted ? isHighlightedAction(a, editor) : true)
    },
    prepareContextMenuItems(ev: Event) {
      // console.log(ev)
      const { clientX: left, clientY: top } = ev as any
      const view = this.editor?.view
      if (view) {
        const { pos, inside } = view.posAtCoords({ top, left }) || {}
        if (pos && inside) {
          // const node = view.state.doc.nodeAt(pos)
          // if (node) console.log(node.type.name)
          this.labeled = labeledNodesAndMarksAtPos(this.editor.state.doc, pos, this.nameToCustomStyle).reverse()
          // console.log(this.labeled.map(l => l.name).join('.'))
        }
      }
      // this.$forceUpdate()
    },
    labelForAction(a: ActionCore) {
      return labelForAction(a, this.editor)
    },
    tooltipForAction(a: ActionCore) {
      return tooltipForAction(a, this.editor)
    },
    setAction(a: ActionForNodeOrMark) {
      const editor = this.editor
      if (canExecuteEditorAction(editor, a))
        executeEditorAction(a, editor)
    }
  }
}
</script>