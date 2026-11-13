<template>
  <q-drawer
    v-if="isMainEditor"
    show-if-above
    behavior="desktop"
    bordered
    :v-model="leftDrawerState === 'normal'"
    side="left"
    :mini="leftDrawerState === 'mini'"
    @click.capture="$emit('maximize')"
    :mini-width="24"
    :width="leftDrawerWidth"
    :breakpoint="500"
  >
    <PdfViewer
      :backend="backend"
      :saved-document-path="lastSavedDocumentPath"
      :saved-document-project-path="lastSavedDocumentProjectPath"
      :saved-document-version="lastSavedDocumentVersion"
      class="pdf-viewer"
      @rendering-started="forwardRenderingStarted"
      @rendering-finished="forwardRenderingFinished"
    />
    <div class="q-mini-drawer-only absolute" style="top: 150px; right: 3px">
      <q-btn
        dense
        round
        unelevated
        color="secondary"
        icon="chevron_right"
        @click="$emit('maximize')"
      />
    </div>
    <div class="q-mini-drawer-hide absolute" style="top: 150px; right: -17px">
      <q-btn
        dense
        round
        unelevated
        color="secondary"
        icon="chevron_left"
        @click="$emit('minimize')"
      />
    </div>
    <div class="q-mini-drawer-hide absolute" style="top: 210px; right: -17px">
      <q-btn
        dense
        round
        unelevated
        color="secondary"
        icon="arrow_left_right"
        @mousedown="$emit('resize-start', $event)"
      />
    </div>
  </q-drawer>
  <div
    v-if="leftDrawerPreviewWidth !== undefined"
    class="drawer-width-preview"
    :style="{ left: `${leftDrawerPreviewWidth}px` }"
  />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { Backend } from '../../backend/backend';

const PdfViewer = defineAsyncComponent(() => import('../PdfViewer.vue'));

defineProps<{
  isMainEditor: boolean;
  backend?: Backend | null;
  leftDrawerState: 'normal' | 'mini';
  leftDrawerWidth: number;
  leftDrawerPreviewWidth?: number;
  lastSavedDocumentPath?: string;
  lastSavedDocumentProjectPath?: string;
  lastSavedDocumentVersion: number;
}>();

const emit = defineEmits<{
  maximize: [];
  minimize: [];
  'resize-start': [event: MouseEvent];
  'rendering-started': [converterName: string, path: string];
  'rendering-finished': [converterName: string, path: string];
}>();

function forwardRenderingStarted(converterName: string, path: string) {
  emit('rendering-started', converterName, path);
}

function forwardRenderingFinished(converterName: string, path: string) {
  emit('rendering-finished', converterName, path);
}
</script>
