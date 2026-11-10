<template>
  <q-btn-group class="toolbar-button">
    <ToolbarButton class="q-px-xs" size="sm" icon="add_document" @click="showDialog('append')"
      :title="$t('document.append')" />
    <q-btn-dropdown class="q-px-xs" size="xs" color="grey-5" dense elevation="3" dropdown-icon="menu_down"
      :title="$t('document.insertOptions')" auto-close>
      <q-list dense>
        <q-item clickable v-close-popup @click="showDialog('append')" :title="$t('document.append')">
          <q-item-section avatar><q-icon name="add_document" /></q-item-section>
          <q-item-section>{{ $t('document.append') }}</q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="showDialog('prepend')" :title="$t('document.prepend')">
          <q-item-section avatar><q-icon name="add_document" /></q-item-section>
          <q-item-section>{{ $t('document.prepend') }}</q-item-section>
        </q-item>
        <q-item :disable="!canInsert()" clickable v-close-popup @click="showDialog('insert')"
          :title="$t('document.insert')">
          <q-item-section avatar><q-icon name="add_document" /></q-item-section>
          <q-item-section>{{ $t('document.insert') }}</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-btn-group>
</template>

<script lang="ts">
import { Editor } from '@tiptap/vue-3';
import { mapState } from 'pinia';
import ToolbarButton from './ToolbarButton.vue';
import { ACTION_DOCUMENT_INSERT, setActionCommand } from '../actions';
import {
  DocumentInsertActionProps,
  EditorKeyType,
  PundokEditorProject,
  splitFolderAndDoc,
} from '../common';
import {
  DocStateUpdate,
  editorKeyFromState,
  getEditorConfiguration,
  getEditorDocState,
  getEditorProject,
} from '../schema';
import { useBackend } from '../stores';
import { setupQuasarIcons, showIncludeDocumentDialog } from './helpers';

export default {
  props: ['editor'],
  components: { ToolbarButton },
  computed: {
    ...mapState(useBackend, ['backend']),
    editorKey(): EditorKeyType | undefined {
      const editor = this.editor as Editor;
      return (editor && editorKeyFromState(editor.state)) || undefined;
    },
    project(): PundokEditorProject | undefined {
      const editor = this.editor as Editor;
      return getEditorProject(editor);
    },
    configurationName(): string | undefined {
      const editor = this.editor as Editor;
      if (editor && !this.project) {
        const config = getEditorConfiguration(editor);
        return config?.name;
      }
    },
  },
  setup() {
    setupQuasarIcons();
  },
  methods: {
    canInsert() {
      return this.editor?.can().putPlaceholder() === true;
    },
    showDialog(withResult: DocumentInsertActionProps['withResult']) {
      const editorKey = this.editorKey;
      if (!editorKey) return;
      if (withResult === 'insert' && !this.canInsert()) return;
      const t = this.$t;
      const docState = getEditorDocState(this.editor);
      const { includeFolder, includeFormat, workingFolder, workingFormat } =
        docState || {};
      showIncludeDocumentDialog({
        editor: this.editor,
        options: {
          prompt: t(`document.${withResult}`) + ':',
          startFolder: includeFolder || workingFolder,
          startFormat: includeFormat || workingFormat,
        },
        callback: (context) => {
          const { path } = context;
          if (path) {
            const docState = getEditorDocState(this.editor);
            const { includeFolder, includeFormat } = docState || {};
            const { folder } = splitFolderAndDoc(path);
            this.editor?.commands.updateDocState({
              includeFolder: folder || includeFolder,
              includeFormat: context.documentFormat || includeFormat,
            } as Partial<DocStateUpdate>);
            if (withResult === 'insert' && !this.editor.commands.putPlaceholder())
              return;
            setActionCommand(editorKey, ACTION_DOCUMENT_INSERT, {
              context,
              withResult,
            } as DocumentInsertActionProps);
          }
        },
      });
    },
  },
};
</script>
