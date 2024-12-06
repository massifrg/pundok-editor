<template>
  <q-btn v-if="wrapperCustomStyles.length === 0" :disabled="isDisabled" @click="editor.commands.wrapIn(wrapperType)"
    :title="`wrap selection in a ${pandocType}`" :icon="wrapIcon || 'mdi-location-enter'" :label="wrapperTypeName"
    color="grey-5" split dense size="sm"></q-btn>
  <q-btn-dropdown v-if="wrapperCustomStyles.length > 0" :title="`wrap selection in a ${pandocType}`"
    :icon="wrapIcon || 'mdi-location-enter'" :label="wrapperTypeName" color="grey-5" split dense size="sm"
    dropdown-icon="mdi-menu-down" :disable-dropdown="isDisabled" :disable-main-btn="isDisabled"
    @click="editor.commands.wrapIn(wrapperType)">
    <CustomClassList :editor="editor" :type="wrapperTypeName" :custom-class-description="customClassDescription"
      no-avatar="true" @chosen-class="wrapWithClass" />
  </q-btn-dropdown>
  <ToolbarButton :icon="unwrapIcon || 'mdi-location-exit'" :disabled="!canUnwrap()"
    :title="`unwrap selection from ${pandocType}`" @click="unwrap" />
</template>

<script lang="ts">
import { CustomStyleInstance, customStylesForType } from '../common';
import CustomClassList from './CustomClassList.vue';
import ToolbarButton from './ToolbarButton.vue';
import { Node } from '@tiptap/pm/model'
import { isInTable } from '@massifrg/prosemirror-tables-sections';
import { getEditorConfiguration } from '../schema';

export default {
  components: { CustomClassList, ToolbarButton },
  props: ['editor', 'wrapperTypeName', 'pandocType', 'wrapIcon', 'unwrapIcon'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    wrapperCustomStyles() {
      return customStylesForType(this.customStyles, this.wrapperTypeName)
    },
    wrapperType() {
      return this.editor.state.schema.nodes[this.wrapperTypeName]
    },
    isDisabled() {
      return !this.editor.can().wrapIn(this.wrapperType)
    },
    customClassDescription() {
      return (cs: CustomStyleInstance) => {
        const d = cs.styleDef
        const descSuffix = d.description ? ` (${d.description})` : ''
        return `wrap in a ${this.pandocType} with class "${d.name}"${descSuffix}`
      }
    }
  },
  methods: {
    wrapWithClass(c: string) {
      this.editor.commands.wrapIn(this.wrapperType, { classes: [c] })
    },
    canUnwrap() {
      const editor = this.editor
      if (editor.can().lift(this.wrapperType)) {
        return true
      } else if (isInTable(editor.state)) {
        return true
      }
      return false
    },
    unwrap() {
      const editor = this.editor
      const state = editor.state
      if (isInTable(state) && !editor.can().lift(this.wrapperType)) {
        const { $anchor } = state.selection
        const depth = $anchor.depth
        let closestBlock: Node | null = null
        let closestBlockPos = -1
        for (let d = depth; d > 0; d--) {
          const node = $anchor.node(d)
          if (node.type === this.wrapperType) {
            if (closestBlock) {
              editor.chain().setNodeSelection(closestBlockPos).lift().run()
              break
            }
          }
          if (node.isBlock) {
            closestBlock = node
            closestBlockPos = $anchor.start(d) - 1
          }
        }
        return false
      } else {
        editor.commands.lift(this.wrapperType)
      }
    }
  }
};
</script>
