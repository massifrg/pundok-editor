<template>
  <ToolbarButton icon="add_document" @click="showDialog" />
</template>

<script lang="ts">
import { Editor } from '@tiptap/vue-3';
import { mapState } from 'pinia';
import ToolbarButton from './ToolbarButton.vue';
import { useBackend } from '../stores';
import {
  DEFAULT_FORMAT,
  EditorKeyType,
  PandocFilterTransform,
  PundokEditorProject,
  TransformDocumentActionProps
} from '../common';
import { editorKeyFromState, getEditorConfiguration, getEditorProject } from '../schema';
import { ACTION_DOCUMENT_TRANSFORM } from '../actions';
import { setupQuasarIcons } from './helpers/quasarIcons';
import { showImportDocumentDialog } from './helpers/chooseDocumentDialogs';
import { setActionCommand } from '../actions/actionCommands';

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
      showImportDocumentDialog({
        editor: this.editor,
        prompt: 'Append document:',
        // startFolder: this.project?.path.split('/'),
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
