<template>
  <q-header>
    <q-toolbar class="text-white q-pa-none">
      <q-toolbar-title>
        <Menubar
          v-bind="$attrs"
          :editor="editor"
          :current-nodes-with-pos="currentNodesWithPos"
          :gui-props="guiProps"
          :saved-changes="savedChanges"
          :saved-changes-as-copy="savedChangesAsCopy"
          :document-loading="documentLoading"
          :document-menu-refresh-key="documentMenuRefreshKey"
          :rendering-targets="renderingTargets"
          :transformation-log="transformationLog"
          :transformation-failed="transformationFailed"
        />
      </q-toolbar-title>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import type { NodeWithPos } from '@tiptap/vue-3';
import type { EditorGUIPropsClass } from '../../schema';
import Menubar from '../Menubar.vue';

defineOptions({ inheritAttrs: false });

defineProps<{
  editor?: any;
  currentNodesWithPos: NodeWithPos[];
  guiProps: InstanceType<typeof EditorGUIPropsClass>;
  savedChanges: boolean;
  savedChangesAsCopy: boolean;
  documentLoading: boolean;
  documentMenuRefreshKey: number;
  renderingTargets: {
    converterName: string;
    path?: string;
    feedback: string[];
  }[];
  transformationLog: string[];
  transformationFailed: boolean;
}>();
</script>
