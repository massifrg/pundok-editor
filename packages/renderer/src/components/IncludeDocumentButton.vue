<template>
  <ToolbarButton icon="add_document" @click="showDialog" />
</template>

<script lang="ts">
import { Editor } from '@tiptap/vue-3';
import { mapState } from 'pinia';
import ToolbarButton from './ToolbarButton.vue';
import { ACTION_DOCUMENT_TRANSFORM, setActionCommand } from '../actions';
import {
  DEFAULT_FORMAT,
  EditorKeyType,
  PandocFilterTransform,
  PundokEditorProject,
  TransformDocumentActionProps
} from '../common';
import { editorKeyFromState, getEditorConfiguration, getEditorDocState, getEditorProject } from '../schema';
import { useBackend } from '../stores';
import { setupQuasarIcons, showImportDocumentDialog } from './helpers';

export default {
  props: ['editor'],
  components: { ToolbarButton },
  computed: {
    ...mapState(useBackend, ['backend']),
    editorKey(): EditorKeyType | undefined {
      const editor = this.editor as Editor
      return editor && editorKeyFromState(editor.state) || undefined
    },
    project(): PundokEditorProject | undefined {
      const editor = this.editor as Editor
      return getEditorProject(editor)
    },
    configurationName(): string | undefined {
      const editor = this.editor as Editor
      if (editor && !this.project) {
        const config = getEditorConfiguration(editor)
        return config?.name
      }
    }
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    showDialog() {
      const editorKey = this.editorKey
      if (!editorKey) return
      const docState = getEditorDocState(this.editor)
      showImportDocumentDialog({
        editor: this.editor,
        prompt: 'Append document:',
        startFolder: docState?.includeFolder || docState?.inputFolder,
        callback: (context) => {
          const { documentFormat, path } = context
          console.log(context)
          if (path) {
            const appendTransform: PandocFilterTransform = {
              type: 'pandoc-filter',
              filters: [],
              name: 'include-document',
              withResult: 'append',
              fromFormat: documentFormat?.name || DEFAULT_FORMAT,
              toFormat: 'json',
              sources: [path],
            }
            console.log(appendTransform)
            setActionCommand(editorKey, ACTION_DOCUMENT_TRANSFORM,
              { transform: appendTransform } as TransformDocumentActionProps)
          }
        }
      })
    }
  }
}
</script>
