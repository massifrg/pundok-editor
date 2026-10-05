<template>
  <div class="custom-css-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">{{ $t('configEditor.customCss.title') }}</div>
      <q-space />
      <q-btn
        dense
        outline
        icon="add"
        :label="$t('configEditor.customCss.add')"
        :disable="!editor"
        @click="addCss"
      />
    </div>

    <div class="custom-css-editor__content">
      <q-list bordered separator dense>
        <q-item
          v-for="(filename, index) in displayedLocalCss"
          :key="`local-${filename}-${index}`"
          draggable="true"
          class="custom-css-editor__item"
          @click="selectCss(filename)"
          @dragstart="startDragging(index, $event)"
          @dragover.prevent
          @drop="dropCss(index)"
        >
          <q-item-section avatar class="custom-css-editor__drag-handle">
            <q-icon name="drag_handle" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="ellipsis" :title="filename">
              {{ filename }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              round
              dense
              size="sm"
              icon="remove"
              :title="$t('configEditor.customCss.remove')"
              @click.stop="removeCss(index)"
            />
          </q-item-section>
        </q-item>
        <q-item
          v-for="(filename, index) in displayedInheritedCss"
          :key="`inherited-${filename}-${index}`"
          class="custom-css-editor__item custom-css-editor__item--inherited"
          :style="{ backgroundColor: inheritedBackground(filename) }"
          @click="selectCss(filename)"
        >
          <q-item-section avatar class="custom-css-editor__drag-handle">
            <q-icon name="lock" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="ellipsis" :title="filename">
              <span class="text-weight-bold" :class="{ 'text-strike': isRemoved(filename) }">
                {{ filename }}
              </span>
            </q-item-label>
            <q-item-label caption>
              {{ $t('configEditor.inheritedFrom', { name: inheritedSource(filename) }) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle
              :model-value="isRemoved(filename)"
              color="primary"
              :icon="mdiEyeOff"
              :title="$t('configEditor.removeInherited', { name: filename })"
              @click.stop
              @update:model-value="setRemoved(filename, $event)"
            />
          </q-item-section>
        </q-item>
        <q-item
          v-if="
            displayedLocalCss.length === 0 && displayedInheritedCss.length === 0
          "
        >
          <q-item-section class="text-grey">
            {{ $t('configEditor.customCss.none') }}
          </q-item-section>
        </q-item>
      </q-list>
      <div v-if="selectedCss" class="custom-css-editor__preview">
        <div class="text-subtitle2 q-mb-sm">
          {{ $t('configEditor.customCss.preview') }}: {{ selectedCss }}
        </div>
        <Codemirror
          :model-value="preview"
          :extensions="previewExtensions"
          class="custom-css-editor__preview-editor"
        />
        <q-inner-loading :showing="loadingPreview" />
        <div v-if="previewError" class="text-negative q-mt-sm">
          {{ previewError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { css } from '@codemirror/lang-css';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { Editor } from '@tiptap/vue-3';
import { computed, ref } from 'vue';
import { mdiEyeOff } from '@mdi/js';
import { Codemirror } from 'vue-codemirror';
import type { PundokEditorProject } from '../../common';
import { useBackend } from '../../stores';
import { showOpenDocumentDialog } from '../helpers';

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    inherited?: string[];
    editor?: Editor;
    project?: PundokEditorProject;
    configurationName?: string;
    removed?: string[];
    provenance?: Record<string, string>;
  }>(),
  { inherited: () => [] },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'update:removed': [value: string[]];
}>();

const backend = useBackend();
const cssFiles = computed(() => props.modelValue || []);
const displayedLocalCss = computed(() => [...cssFiles.value].reverse());
const displayedInheritedCss = computed(() =>
  [...props.inherited]
    .sort((first, second) =>
      inheritedSource(first).localeCompare(inheritedSource(second)),
    )
    .reverse(),
);
const selectedCss = ref('');
const preview = ref('');
const loadingPreview = ref(false);
const previewError = ref('');
let previewRequest = 0;
const previewExtensions = [
  css(),
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
  EditorView.lineWrapping,
];
let draggedCssIndex: number | undefined;

function addCss(): void {
  if (!props.editor) return;
  showOpenDocumentDialog({
    editor: props.editor,
    options: {
      prompt: 'Select a CSS file',
      startFormat: {
        ftype: 'format',
        name: 'css',
        description: 'CSS stylesheet',
        icon: 'code',
        input: true,
        output: false,
        extensions: ['css'],
      },
    },
    callback: (document) => {
      if ('path' in document && document.path) {
        if (!cssFiles.value.includes(document.path)) {
          emit('update:modelValue', [...cssFiles.value, document.path]);
        }
      }
    },
  });
}

function removeCss(index: number): void {
  const sourceIndex = cssFiles.value.length - 1 - index;
  emit(
    'update:modelValue',
    cssFiles.value.filter((_, cssIndex) => cssIndex !== sourceIndex),
  );
}

function isRemoved(filename: string): boolean {
  return (props.removed || []).includes(filename);
}

function setRemoved(filename: string, value: boolean | null): void {
  const names = new Set(props.removed || []);
  if (value) names.add(filename);
  else names.delete(filename);
  emit('update:removed', [...names]);
}

function inheritedSource(filename: string): string {
  return props.provenance?.[filename] || '';
}

function inheritedBackground(filename: string): string | undefined {
  const source = inheritedSource(filename);
  if (!source) return undefined;
  const sources = [...new Set(Object.values(props.provenance || {}))];
  const colors = ['#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec', '#f1f8e9'];
  return colors[Math.max(0, sources.indexOf(source) % colors.length)];
}

async function selectCss(filename: string): Promise<void> {
  selectedCss.value = filename;
  preview.value = '';
  previewError.value = '';
  if (!backend.backend) return;
  const request = ++previewRequest;
  loadingPreview.value = true;
  try {
    const contents = await backend.backend.getFileContents(filename, {
      kind: 'css',
      configurationName: props.configurationName,
      project: props.project ? JSON.stringify(props.project) : undefined,
    });
    if (request === previewRequest) preview.value = contents;
  } catch (error) {
    if (request === previewRequest) {
      previewError.value =
        error instanceof Error ? error.message : String(error);
    }
  } finally {
    if (request === previewRequest) loadingPreview.value = false;
  }
}

function startDragging(index: number, event: DragEvent): void {
  draggedCssIndex = index;
  event.dataTransfer?.setData('text/plain', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function dropCss(targetIndex: number): void {
  const sourceIndex = draggedCssIndex;
  draggedCssIndex = undefined;
  if (sourceIndex === undefined || sourceIndex === targetIndex) return;
  const reordered = [...displayedLocalCss.value];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  emit('update:modelValue', reordered.reverse());
}
</script>

<style scoped>
.custom-css-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.custom-css-editor__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.custom-css-editor__content > .q-list {
  flex: 0 0 40%;
  height: 40%;
  min-height: 0;
  overflow-y: auto;
}

.custom-css-editor__item {
  cursor: grab;
}

.custom-css-editor__item:active {
  cursor: grabbing;
}

.custom-css-editor__item--inherited {
  color: var(--q-grey-7);
  background: var(--q-grey-2);
  cursor: default;
}

.custom-css-editor__drag-handle {
  min-width: 2rem;
  padding-right: 0;
}

.custom-css-editor__preview {
  position: relative;
  display: flex;
  flex: 0 0 60%;
  flex-direction: column;
  height: 60%;
  min-height: 0;
}

.custom-css-editor__preview-editor {
  flex: 1;
  min-height: 0;
}

:deep(.custom-css-editor__preview-editor .cm-editor) {
  height: 100%;
  max-height: 100%;
  border: 1px solid var(--q-separator-color);
  border-radius: 4px;
}
</style>
