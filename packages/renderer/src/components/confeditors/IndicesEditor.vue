<template>
  <div class="indices-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">{{ $t('configEditor.indices.title') }}</div>
      <q-space />
      <q-btn dense icon="add" :label="$t('configEditor.indices.newIndex')" @click="newIndex" />
    </div>

    <q-list v-if="allIndices.length" bordered separator>
      <q-item v-for="index in allIndices" :key="index.indexName" dense
        :class="{ 'bg-grey-2 text-grey-7': isInherited(index) }">
        <q-item-section>
          <q-item-label class="row items-center no-wrap">
            <span>{{ index.indexName }}</span>
            <q-space />
            <span class="text-caption text-grey-7">{{ index.refClass }}</span>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn v-if="isInherited(index)" dense flat round icon="content_copy"
            :title="$t('configEditor.indices.copyIndex')" @click="copyInheritedIndex(index)" />
          <div v-else class="row no-wrap">
            <q-btn dense flat round icon="edit" :title="$t('configEditor.indices.editIndex')"
              @click="editIndex(index.indexName)" />
            <q-btn dense flat round icon="remove" :title="$t('configEditor.indices.deleteIndex')"
              @click="deleteIndex(index.indexName)" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.indices.none') }}
    </div>

    <q-dialog :model-value="!!draft" @hide="cancelEdit">
      <q-card v-if="draft" flat bordered class="q-pa-md" style="width: 80vw; max-width: 80vw">
        <q-card-section>
          <div class="text-subtitle2">
            {{
              $t(
                editingIndex === null
                  ? 'configEditor.indices.newTitle'
                  : 'configEditor.indices.editTitle',
              )
            }}
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <div class="row q-gutter-md">
            <q-input v-model="draft.indexName" class="col" :label="$t('configEditor.indices.indexName')" outlined dense
              :error="!!nameError" :error-message="nameError" />
            <q-input v-model="draft.refClass" class="col" :label="$t('configEditor.indices.refClass')" outlined dense />
          </div>
          <div class="row items-center q-gutter-md">
            <q-option-group v-model="draft.putIndexRef" :options="putIndexRefOptions" type="radio" inline dense
              :label="$t('configEditor.indices.putIndexRef')" />
            <q-space />
            <q-card class="text-h5 bordered q-pa-sm" style="border-color: var(--q-primary)">
              <span>{{ $t('configEditor.indices.previewIntro') }}</span>
              <template v-if="draft.putIndexRef === 'before'">
                <svg v-if="draft.iconSvg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="draft.iconSvg" :fill="draft.color" />
                </svg>
                <span v-else :style="{ color: draft.color }">{{ draft.iconChar }}</span>
              </template>
              <span>{{ $t('configEditor.indices.previewTerm') }}</span>
              <template v-if="draft.putIndexRef === 'after'">
                <svg v-if="draft.iconSvg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="draft.iconSvg" :fill="draft.color" />
                </svg>
                <span v-else :style="{ color: draft.color }">{{ draft.iconChar }}</span>
              </template>
              <span>{{ $t('configEditor.indices.previewOutro') }}</span>
            </q-card>
            <q-space />
            <q-input v-model="draft.color" :label="$t('configEditor.indices.color')" outlined dense>
              <template #append>
                <q-btn round flat dense icon="custom_style" :style="{ backgroundColor: draft.color }">
                  <q-popup-proxy cover>
                    <q-color v-model="draft.color" />
                  </q-popup-proxy>
                </q-btn>
              </template>
            </q-input>
          </div>
          <div class="row q-gutter-md">
            <q-input v-model="draft.iconSvg" class="col" :label="$t('configEditor.indices.iconSvg')" outlined dense>
              <template #append>
                <q-btn flat round dense icon="image" :title="$t('configEditor.indices.chooseIconFile')"
                  @click="chooseIconFile" />
              </template>
            </q-input>
            <q-input v-model="draft.iconChar" class="col" :label="$t('configEditor.indices.iconChar')" outlined dense />
          </div>
          <div class="row q-gutter-md">
            <q-checkbox v-model="draft.allowRanges" class="col" :label="$t('configEditor.indices.allowRanges')" />
            <q-checkbox v-model="draft.allowEmpty" class="col" :label="$t('configEditor.indices.allowEmpty')" />
            <q-checkbox v-model="draft.onlyEmpty" class="col" :label="$t('configEditor.indices.onlyEmpty')" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('configEditor.buttons.cancel')" @click="cancelEdit" />
          <q-btn color="primary" :label="$t('configEditor.buttons.apply')" :disable="!canApply" @click="applyEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import type { Editor } from '@tiptap/vue-3';
import type { DocumentFormat, Index, IndexRefPlacement } from '../../common';
import { showSelectImageDialog } from '../helpers';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { useBackend } from '../../stores';

setupQuasarIcons();

type IndexDraft = Index & {
  putIndexRef: IndexRefPlacement;
  iconSvg: string;
  iconChar: string;
  color: string;
  allowRanges: boolean;
  allowEmpty: boolean;
  onlyEmpty: boolean;
};

const props = withDefaults(
  defineProps<{ modelValue?: Index[]; inherited?: Index[]; editor?: Editor }>(),
  { modelValue: () => [], inherited: () => [] },
);
const emit = defineEmits<{ 'update:modelValue': [value: Index[]] }>();
const { t } = useI18n();
const $q = useQuasar();
const backend = useBackend();
const indices = ref<Index[]>([]);
const draft = ref<IndexDraft>();
const editingIndex = ref<number | null>(null);
const nameError = ref('');

const putIndexRefOptions = [
  { label: t('configEditor.indices.before'), value: 'before' },
  { label: t('configEditor.indices.after'), value: 'after' },
];
const allIndices = computed(() => [
  ...indices.value,
  ...props.inherited.filter(
    (index) =>
      !indices.value.some((local) => local.indexName === index.indexName),
  ),
]);
const canApply = computed(
  () => !!draft.value?.indexName.trim() && !!draft.value?.refClass.trim(),
);

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) indices.value = value.map(copyIndex);
  },
  { immediate: true },
);

function copyIndex(index: Index): Index {
  return { ...index };
}

function toDraft(index: Index): IndexDraft {
  return {
    ...copyIndex(index),
    putIndexRef: index.putIndexRef || 'before',
    iconSvg: index.iconSvg || '',
    iconChar: index.iconChar || '',
    color: index.color || '',
    allowRanges: index.allowRanges === true,
    allowEmpty: index.allowEmpty === true,
    onlyEmpty: index.onlyEmpty === true,
  };
}

function newIndex(): void {
  editingIndex.value = null;
  nameError.value = '';
  draft.value = {
    indexName: '',
    refClass: '',
    putIndexRef: 'before',
    iconSvg: '',
    iconChar: '',
    color: '',
    allowRanges: false,
    allowEmpty: false,
    onlyEmpty: false,
  };
}

function chooseIconFile(): void {
  if (!props.editor) return;
  const svgFormat: DocumentFormat = {
    ftype: 'image',
    name: 'svg',
    extensions: ['svg'],
    isVectorial: true,
  };
  showSelectImageDialog({
    editor: props.editor,
    options: {
      prompt: t('configEditor.indices.chooseIconFile'),
      startFormat: svgFormat,
    },
    callback: (context) => {
      if (!context.path || !backend.backend) return;
      void loadIconFile(context.path);
    },
  });
}

async function loadIconFile(path: string): Promise<void> {
  try {
    const document = new DOMParser().parseFromString(
      await backend.backend!.getFileContents(path),
      'image/svg+xml',
    );
    const pathData = Array.from(document.querySelectorAll('path[d]'))
      .map((pathElement) => pathElement.getAttribute('d')?.trim())
      .filter((value): value is string => !!value)
      .join(' ');
    if (document.querySelector('parsererror') || !pathData) {
      throw new Error('The SVG does not contain a path with a d attribute.');
    }
    if (draft.value) draft.value.iconSvg = pathData;
  } catch (error) {
    console.error('Could not load SVG icon file.', error);
    $q.notify({
      type: 'negative',
      message: t('configEditor.indices.invalidIconFile'),
    });
  }
}

function editIndex(indexName: string): void {
  const index = indices.value.findIndex((item) => item.indexName === indexName);
  if (index < 0) return;
  editingIndex.value = index;
  nameError.value = '';
  draft.value = toDraft(indices.value[index]);
}

function isInherited(index: Index): boolean {
  return (
    !indices.value.some((item) => item.indexName === index.indexName) &&
    props.inherited.some((item) => item.indexName === index.indexName)
  );
}

function copyInheritedIndex(index: Index): void {
  indices.value = [...indices.value, copyIndex(index)];
  emitIndices();
}

function deleteIndex(indexName: string): void {
  indices.value = indices.value.filter(
    (index) => index.indexName !== indexName,
  );
  emitIndices();
}

function cancelEdit(): void {
  draft.value = undefined;
  editingIndex.value = null;
  nameError.value = '';
}

function applyEdit(): void {
  if (!draft.value) return;
  const indexName = draft.value.indexName.trim();
  const refClass = draft.value.refClass.trim();
  if (!indexName || !refClass) {
    nameError.value = t('configEditor.indices.required');
    return;
  }
  if (
    editingIndex.value === null &&
    indices.value.some((index) => index.indexName === indexName)
  ) {
    nameError.value = t('configEditor.indices.duplicateName');
    return;
  }
  const index: Index = {
    indexName,
    refClass,
    putIndexRef: draft.value.putIndexRef,
    ...(draft.value.iconSvg ? { iconSvg: draft.value.iconSvg } : {}),
    ...(draft.value.iconChar ? { iconChar: draft.value.iconChar } : {}),
    ...(draft.value.color ? { color: draft.value.color } : {}),
    ...(draft.value.allowRanges ? { allowRanges: true } : {}),
    ...(draft.value.allowEmpty ? { allowEmpty: true } : {}),
    ...(draft.value.onlyEmpty ? { onlyEmpty: true } : {}),
  };
  const updated = indices.value.map(copyIndex);
  if (editingIndex.value === null) updated.push(index);
  else updated.splice(editingIndex.value, 1, index);
  indices.value = updated;
  emitIndices();
  cancelEdit();
}

function emitIndices(): void {
  emit('update:modelValue', indices.value.map(copyIndex));
}
</script>
