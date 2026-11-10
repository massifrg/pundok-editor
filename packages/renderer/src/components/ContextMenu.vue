<template>
  <q-menu :model-value="!!clickedNodeOrMark" touch-position context-menu @before-show="prepareContextMenuItems">
    <q-list dense>
      <q-item v-for="hl in highlightedActions" :key="hl.name" clickable :title="tooltipForContextAction(hl)" v-close-popup
        @click="setAction(hl)">
        <q-item-section side>
          <q-icon :name="hl.icon" />
        </q-item-section>
        <q-item-section>{{ labelForContextAction(hl) }}</q-item-section>
      </q-item>
      <q-item v-for="lnom in labeledWithActions" :key="lnom.key" clickable :class="classFor(lnom)">
        <q-item-section :class="classFor(lnom)" side>{{ lnom.node ? 'N' : 'M' }}</q-item-section>
        <q-item-section>{{ lnom.label }}</q-item-section>
        <q-item-section :class="classFor(lnom)" side>
          <q-icon name="arrow_right" />
        </q-item-section>
        <q-menu v-if="hasSubmenuActions(lnom)" anchor="top end" self="top start">
          <NodeOrMarkContextMenu :editor="editor" :node-or-mark="lnom"
            :exclude-action-names="['synchronize-pdf']" />
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
  canExecuteEditorAction,
  executeEditorAction,
  isHighlightedAction,
  labelForAction,
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
      const highlighted = flatten(this.labeledWithActions.map(lwa => this.actionsFor(lwa)))
        .filter(a => isHighlightedAction(a, this.editor))
      const synchronize = this.labeledWithActions
        .flatMap(lnom => this.actionsFor(lnom))
        .find(a => a.name === 'synchronize-pdf')
      return [
        ...highlighted.filter(a => a.name !== 'synchronize-pdf'),
        ...(synchronize ? [synchronize] : []),
      ]
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
    hasSubmenuActions(labeled: LabeledNodeOrMark) {
      return this.actionsFor(labeled).some(a => a.name !== 'synchronize-pdf')
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
    labelForContextAction(a: ActionCore) {
      // pass the Vue i18n `$t` translator if available
      // @ts-ignore
      const t = (this as any).$t ? (this as any).$t.bind(this) : undefined
      return labelForAction(a, this.editor, t)
    },
    tooltipForContextAction(a: ActionCore) {
      // @ts-ignore
      const t = (this as any).$t ? (this as any).$t.bind(this) : undefined
      return tooltipForAction(a, this.editor, t)
    },
    setAction(a: ActionForNodeOrMark) {
      const editor = this.editor
      if (canExecuteEditorAction(editor, a))
        executeEditorAction(a, editor)
    }
  }
}
</script>