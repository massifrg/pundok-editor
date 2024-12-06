<template>
  <q-menu :model-value="!!clickedNodeOrMark" touch-position context-menu @before-show="prepareContextMenuItems">
    <q-list dense>
      <q-item v-for="lnom in labeledWithActions" :key="lnom.key" clickable :class="classFor(lnom)">
        <q-item-section :class="classFor(lnom)" side>{{ lnom.node ? 'N' : 'M' }}</q-item-section>
        <q-item-section>{{ lnom.label }}</q-item-section>
        <q-item-section :class="classFor(lnom)" side>
          <q-icon name="mdi-arrow-right" />
        </q-item-section>
        <q-menu v-if="actionsFor(lnom).length > 0" anchor="top end" self="top start">
          <NodeOrMarkContextMenu :editor="editor" :node-or-mark="lnom" />
        </q-menu>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script lang="ts">
import { CustomStyleInstance, CustomStyleDef } from '../common'
import { NodeOrMarkContextMenu } from '.'
import { actionsForNodeOrMark, canExecuteEditorAction } from '../actions'
import { colorFor, LabeledNodeOrMark, labeledNodesAndMarksAtPos, SelectedNodeOrMark } from '../schema/helpers'
import { getEditorConfiguration } from '../schema'

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
    }
  },
  components: {
    NodeOrMarkContextMenu
  },
  methods: {
    classFor(lnom: LabeledNodeOrMark) {
      return `bg-${colorFor(lnom)} text-white`
    },
    actionsFor(labeled: LabeledNodeOrMark) {
      const editor = this.editor
      if (!editor) return []
      return actionsForNodeOrMark(editor.state, labeled)
        .filter(a => canExecuteEditorAction(editor, a))
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
    }
  }
}
</script>