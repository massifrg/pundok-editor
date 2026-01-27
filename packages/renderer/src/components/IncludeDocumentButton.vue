<template>
  <ToolbarButton icon="add_document" @click="showDialog = true">
    <OpenDocumentDialog v-if="showDialog" :editor="editor" :mode="mode" @set-format="setFormat"
      @hide="showDialog = false" />
  </ToolbarButton>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import ToolbarButton from './ToolbarButton.vue';
import { useBackend } from '../stores';
import { DocumentFormat, EditorKeyType, PandocFilterTransform, PundokEditorProject } from '../common';
import { editorKeyFromState, getEditorConfiguration, getEditorProject } from '../schema';
import { setActionTransformDocument } from '../actions';
import { Editor } from '@tiptap/vue-3';
import { setupQuasarIcons } from './helpers/quasarIcons';
import OpenDocumentDialog, { DocumentDialogMode } from './OpenDocumentDialog.vue';
import { showDialog } from '@codemirror/view';

export default {
  props: ['editor'],
  components: { OpenDocumentDialog, ToolbarButton },
  data() {
    return {
      mode: 'import' as DocumentDialogMode,
      showDialog: false,
      format: undefined as DocumentFormat | undefined,
    }
  },
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
    setFormat(_mode: DocumentDialogMode, format: DocumentFormat) {
      this.format = format
    },
    async appendDocument() {
      const editorKey = this.editorKey
      if (!editorKey) return
      const doc = await this.backend?.askForDocumentIdOrPath('inclusion', {
        editorKey,
        configurationName: this.configurationName,
        project: this.project,
        openDialogOptions: {
        },
      })
      if (!doc) return;
      const { path, formatName } = doc
      if (!path) return
      const appendTransform: PandocFilterTransform = {
        type: 'pandoc-filter',
        filters: [],
        name: 'include-document',
        withResult: 'append',
        fromFormat: formatName || 'json',
        toFormat: 'json',
        sources: [path],
      }
      setActionTransformDocument(editorKey, appendTransform)
    }
  }
}
</script>
