<template>
  <ToolbarButton icon="add_document" @click="appendDocument()" />
</template>

<script lang="ts">
import { mapState } from 'pinia';
import ToolbarButton from './ToolbarButton.vue';
import { useBackend } from '../stores';
import { EditorKeyType, PandocFilterTransform, PundokEditorProject } from '../common';
import { editorKeyFromState, getEditorConfiguration, getEditorProject } from '../schema';
import { setActionTransformDocument } from '../actions';
import { Editor } from '@tiptap/vue-3';
import { setupQuasarIcons } from './helpers/quasarIcons';

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
      const { path, format, formats, id, src } = doc
      if (!path) return
      const appendTransform: PandocFilterTransform = {
        type: 'pandoc-filter',
        filters: [],
        name: 'include-document',
        withResult: 'append',
        fromFormat: format || path?.replace(/^.*?[.]([^.]+)$/, '$1') || 'json',
        toFormat: 'json',
        sources: [path],
      }
      setActionTransformDocument(editorKey, appendTransform)
    }
  }
}
</script>
