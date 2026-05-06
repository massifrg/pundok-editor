<template>
  <ToolbarButton icon="raw_inline" v-if="formats.length > 0" title="insert or convert RawInline">
    <RawInlineMenu :editor="editor" :sortable="sortable" @raw-inline-selected="insertRawInline" />
  </ToolbarButton>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import ToolbarButton from './ToolbarButton.vue';
import { intersection, union } from 'lodash-es';
import { getRawInlineFormats } from '../common';
import { getEditorConfiguration } from '../schema';
import { marksStarting } from '../schema/helpers';
import RawInlineMenu from './RawInlineMenu.vue'

export default {
  components: {
    ToolbarButton,
    RawInlineMenu,
  },
  props: ['editor', 'sortable'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    formats() {
      return this.configuration ? getRawInlineFormats(this.configuration) : [];
    },
  },
  methods: {
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
      }
    }
  }
}
</script>
