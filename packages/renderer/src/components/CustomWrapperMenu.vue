<template>
  <q-btn v-if="wrapperCustomStyles.length === 0" :disabled="isDisabled" @click="wrap()" :title="title"
    :icon="wrapIcon || 'mdi-location-enter'" :label="wrapperTypeName" color="grey-5" split dense size="sm"></q-btn>
  <q-btn-dropdown v-if="wrapperCustomStyles.length > 0" :title="title" :icon="wrapIcon || 'mdi-location-enter'"
    :label="wrapperTypeName" color="grey-5" split dense size="sm" dropdown-icon="mdi-menu-down"
    :disable-dropdown="isDisabled" :disable-main-btn="isDisabled" @click="wrap()">
    <CustomClassList :editor="editor" :type="wrapperTypeName" :custom-class-description="customStyleInstanceDescription"
      no-avatar="true" @chosen-class="wrapWithClass" />
  </q-btn-dropdown>
  <ToolbarButton :icon="unwrapIcon || 'mdi-location-exit'" :disabled="!canUnwrap()"
    :title="`unwrap selection from ${pandocType}`" :shortcut="shortcut" @click="unwrap" />
</template>

<script lang="ts">
import {
  CustomStyleDef,
  CustomStyleInstance,
  customStylesForType,
  shortcutSuffix
} from '../common';
import CustomClassList from './CustomClassList.vue';
import ToolbarButton from './ToolbarButton.vue';
import { Node } from '@tiptap/pm/model'
import { isInTable } from '@massifrg/prosemirror-tables-sections';
import { getEditorConfiguration } from '../schema';

export default {
  components: { CustomClassList, ToolbarButton },
  props: ['editor', 'wrapperTypeName', 'pandocType', 'wrapIcon', 'unwrapIcon', 'shortcut'],
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
    title() {
      return `wrap selection in a ${this.pandocType}` + shortcutSuffix(this.shortcut)
    }
  },
  methods: {
    customStyleDefinitionDescription(csd: CustomStyleDef) {
      const descSuffix = csd.description ? ` (${csd.description})` : ''
      return `wrap in a ${this.pandocType} with class "${csd.name}"${descSuffix}`
    },
    customStyleInstanceDescription() {
      return (cs: CustomStyleInstance) => {
        return this.customStyleDefinitionDescription(cs.styleDef)
      }
    },
    wrap() {
      this.editor.commands.runRepeatableCommand(
        'wrapIn',
        `wrap in a ${this.pandocType}`,
        this.wrapperType
      )
    },
    wrapWithClass(c: string) {
      this.editor.commands.runRepeatableCommand(
        'wrapIn',
        `wrap in a ${this.pandocType} with class ${c}`,
        this.wrapperType,
        { classes: [c] }
      )
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
      const wrapperType = this.wrapperType
      if (isInTable(state) && !editor.can().lift(wrapperType)) {
        const { $anchor } = state.selection
        const depth = $anchor.depth
        let closestBlock: Node | null = null
        let closestBlockPos = -1
        for (let d = depth; d > 0; d--) {
          const node = $anchor.node(d)
          if (node.type === this.wrapperType) {
            if (closestBlock) {
              // editor.chain().setNodeSelection(closestBlockPos).lift().run()
              editor.commands.runRepeatableCommandsChain([
                ['setNodeSelection', closestBlockPos],
                ['lift'],
              ],
                `unwrap (inner) ${this.pandocType}`
              )
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
        editor.commands.runRepeatableCommand(
          'lift',
          `unwrap ${this.pandocType}`,
          wrapperType
        )
      }
    }
  }
};
</script>
