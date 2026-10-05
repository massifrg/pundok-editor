<template>
  <div class="note-styles-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.noteStyles.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.noteStyles.newStyle')"
        @click="newStyle"
      />
    </div>

    <q-list v-if="allStyles.length" bordered separator>
      <q-item
        v-for="style in allStyles"
        :key="style.noteType"
        dense
        class="text-grey-7"
        :style="{ backgroundColor: inheritedBackground(style.noteType) }"
      >
        <q-item-section>
          <q-item-label class="row items-center no-wrap">
            <span class="text-weight-bold" :class="{ 'text-strike': isRemoved(style.noteType) }">
              {{ style.noteType }}
            </span>
            <q-badge v-if="style.default" class="q-ml-sm" color="primary">
              {{ $t('configEditor.noteStyles.default') }}
            </q-badge>
            <q-space />
            <span class="text-caption text-grey-7">
              {{ markerSummary(style) }}
            </span>
          </q-item-label>
          <q-item-label v-if="isInherited(style)" caption>
            {{ $t('configEditor.inheritedFrom', { name: inheritedSource(style.noteType) }) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div v-if="isInherited(style)" class="row no-wrap items-center q-gutter-xs">
            <q-btn
              dense
              flat
              round
              icon="content_copy"
              :title="$t('configEditor.noteStyles.copyStyle')"
              @click="copyInheritedStyle(style)"
            />
            <q-toggle
              :model-value="isRemoved(style.noteType)"
              color="primary"
              :icon="mdiEyeOff"
              :title="$t('configEditor.removeInherited', { name: style.noteType })"
              @update:model-value="setRemoved(style.noteType, $event)"
            />
          </div>
          <div v-else class="row no-wrap">
            <q-btn
              dense
              flat
              round
              icon="edit"
              :title="$t('configEditor.noteStyles.editStyle')"
              @click="editStyle(style.noteType)"
            />
            <q-btn
              dense
              flat
              round
              icon="remove"
              :title="$t('configEditor.noteStyles.deleteStyle')"
              @click="deleteStyle(style.noteType)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.noteStyles.none') }}
    </div>

    <q-dialog :model-value="!!draft" @hide="cancelEdit">
      <q-card
        v-if="draft"
        flat
        bordered
        class="q-pa-md"
        style="width: 80vw; max-width: 80vw"
      >
        <q-card-section>
          <div class="text-subtitle2">
            {{
              $t(
                editingIndex === null
                  ? 'configEditor.noteStyles.newTitle'
                  : 'configEditor.noteStyles.editTitle',
              )
            }}
          </div>
        </q-card-section>
        <q-card-section horizontal class="row items-center q-gutter-md">
          <q-input
            v-model="draft.noteType"
            class="col"
            :label="$t('configEditor.noteStyles.noteType')"
            outlined
            dense
            :error="!!nameError"
            :error-message="nameError"
          />
          <q-checkbox
            v-model="draft.default"
            class="col-auto"
            :label="$t('configEditor.noteStyles.default')"
          />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-option-group
            v-model="markerMode"
            :options="markerModeOptions"
            type="radio"
            inline
            dense
          />
          <q-select
            v-if="markerMode === 'conversion'"
            v-model="draft.markerConversion"
            :options="markerConversionOptions"
            :label="$t('configEditor.noteStyles.markerConversion')"
            outlined
            dense
            emit-value
            map-options
          />
          <q-input
            v-else
            v-model="draft.markersText"
            :label="$t('configEditor.noteStyles.markers')"
            outlined
            dense
          />
        </q-card-section>
        <q-card-section horizontal class="row q-gutter-md">
          <q-input
            v-model="draft.markerBefore"
            class="col"
            :label="$t('configEditor.noteStyles.markerBefore')"
            outlined
            dense
          />
          <q-input
            v-model="draft.markerAfter"
            class="col"
            :label="$t('configEditor.noteStyles.markerAfter')"
            outlined
            dense
          />
        </q-card-section>
        <q-card-section horizontal class="row q-gutter-md q-mt-sm">
          <q-input
            v-model="draft.backgroundColor"
            class="col"
            :label="$t('configEditor.noteStyles.backgroundColor')"
            outlined
            dense
          >
            <template #append>
              <q-btn
                round
                flat
                dense
                icon="custom_style"
                :style="{ backgroundColor: draft.backgroundColor }"
              >
                <q-popup-proxy cover>
                  <q-color v-model="draft.backgroundColor" />
                </q-popup-proxy>
              </q-btn>
            </template>
          </q-input>
          <q-input
            v-model="draft.textColor"
            class="col"
            :label="$t('configEditor.noteStyles.textColor')"
            outlined
            dense
          >
            <template #append>
              <q-btn
                round
                flat
                dense
                icon="custom_style"
                :style="{ backgroundColor: draft.textColor }"
              >
                <q-popup-proxy cover>
                  <q-color v-model="draft.textColor" />
                </q-popup-proxy>
              </q-btn>
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            :label="$t('configEditor.buttons.cancel')"
            @click="cancelEdit"
          />
          <q-btn
            color="primary"
            :label="$t('configEditor.buttons.apply')"
            :disable="!canApply"
            @click="applyEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiEyeOff } from '@mdi/js';
import { useI18n } from 'vue-i18n';
import type { MarkerConversion, NoteStyle } from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';

setupQuasarIcons();

type NoteStyleDraft = NoteStyle & {
  default: boolean;
  markerConversion: MarkerConversion;
  markersText: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: NoteStyle[];
    inherited?: NoteStyle[];
    removed?: string[];
    provenance?: Record<string, string>;
  }>(),
  { inherited: () => [] },
);
const emit = defineEmits<{
  'update:modelValue': [value: NoteStyle[]];
  'update:removed': [value: string[]];
}>();

const styles = ref<NoteStyle[]>([]);
const draft = ref<NoteStyleDraft>();
const editingIndex = ref<number | null>(null);
const nameError = ref('');
const { t } = useI18n();
const markerMode = ref<'conversion' | 'markers'>('conversion');
const markerModeOptions = [
  {
    label: t('configEditor.noteStyles.predefinedConversion'),
    value: 'conversion',
  },
  { label: t('configEditor.noteStyles.customMarkers'), value: 'markers' },
];
const markerConversionOptions = [
  'noConversion',
  'lower-alpha',
  'upper-alpha',
  'lower-roman',
  'upper-roman',
  'lower-greek',
  'upper-greek',
].map((value) => ({ label: value, value }));

const allStyles = computed(() => {
  const inherited = props.inherited
    .filter(
      (style) => !styles.value.some((local) => local.noteType === style.noteType),
    )
    .sort((first, second) =>
      inheritedSource(first.noteType).localeCompare(inheritedSource(second.noteType)),
    );
  return [...styles.value, ...inherited];
});
const canApply = computed(() => !!draft.value?.noteType.trim());

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) styles.value = value.map(copyStyle);
  },
  { immediate: true },
);

function copyStyle(style: NoteStyle): NoteStyle {
  return {
    ...style,
    markerConversion: Array.isArray(style.markerConversion)
      ? [...style.markerConversion]
      : style.markerConversion,
  };
}

function toDraft(style: NoteStyle): NoteStyleDraft {
  const conversion = Array.isArray(style.markerConversion)
    ? 'noConversion'
    : style.markerConversion || 'noConversion';
  return {
    ...copyStyle(style),
    default: style.default === true,
    markerConversion: conversion,
    markersText: Array.isArray(style.markerConversion)
      ? style.markerConversion.join(' ')
      : '',
    markerBefore: style.markerBefore || '',
    markerAfter: style.markerAfter || '',
    backgroundColor: style.backgroundColor || '',
    textColor: style.textColor || '',
  };
}

function newStyle(): void {
  editingIndex.value = null;
  nameError.value = '';
  draft.value = {
    noteType: '',
    default: false,
    markerConversion: 'noConversion',
    markersText: '',
  };
  markerMode.value = 'conversion';
}

function editStyle(noteType: string): void {
  const index = styles.value.findIndex((style) => style.noteType === noteType);
  if (index < 0) return;
  editingIndex.value = index;
  nameError.value = '';
  draft.value = toDraft(styles.value[index]);
  markerMode.value = Array.isArray(styles.value[index].markerConversion)
    ? 'markers'
    : 'conversion';
}

function copyInheritedStyle(style: NoteStyle): void {
  const copy = copyStyle(style);
  styles.value = [...styles.value, copy];
  emit('update:modelValue', styles.value.map(copyStyle));
}

function isInherited(style: NoteStyle): boolean {
  return (
    !styles.value.some((item) => item.noteType === style.noteType) &&
    props.inherited.some((item) => item.noteType === style.noteType)
  );
}

function isRemoved(noteType: string): boolean {
  return (props.removed || []).includes(noteType);
}

function setRemoved(noteType: string, value: boolean | null): void {
  const names = new Set(props.removed || []);
  if (value) names.add(noteType);
  else names.delete(noteType);
  emit('update:removed', [...names]);
}

function inheritedSource(noteType: string): string {
  return props.provenance?.[noteType] || '';
}

function inheritedBackground(noteType: string): string | undefined {
  const source = inheritedSource(noteType);
  if (!source) return undefined;
  const sources = [...new Set(Object.values(props.provenance || {}))];
  const colors = ['#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec', '#f1f8e9'];
  return colors[Math.max(0, sources.indexOf(source) % colors.length)];
}

function markerSummary(style: NoteStyle): string {
  return Array.isArray(style.markerConversion)
    ? style.markerConversion.join(' ')
    : style.markerConversion || 'noConversion';
}

function deleteStyle(noteType: string): void {
  styles.value = styles.value.filter((style) => style.noteType !== noteType);
  emit('update:modelValue', styles.value.map(copyStyle));
}

function cancelEdit(): void {
  draft.value = undefined;
  editingIndex.value = null;
  nameError.value = '';
}

function applyEdit(): void {
  if (!draft.value) return;
  const noteType = draft.value.noteType.trim();
  if (!noteType) {
    nameError.value = 'A note type is required.';
    return;
  }
  if (
    styles.value.some(
      (style, index) =>
        index !== editingIndex.value && style.noteType === noteType,
    )
  ) {
    nameError.value = 'A note style with this note type already exists.';
    return;
  }
  const markers = draft.value.markersText
    .split(/\s+/)
    .map((marker) => marker.trim())
    .filter(Boolean);
  const style: NoteStyle = {
    noteType,
    ...(draft.value.default ? { default: true } : {}),
    markerConversion:
      markerMode.value === 'markers' ? markers : draft.value.markerConversion,
    ...(draft.value.markerBefore
      ? { markerBefore: draft.value.markerBefore }
      : {}),
    ...(draft.value.markerAfter
      ? { markerAfter: draft.value.markerAfter }
      : {}),
    ...(draft.value.backgroundColor
      ? { backgroundColor: draft.value.backgroundColor }
      : {}),
    ...(draft.value.textColor ? { textColor: draft.value.textColor } : {}),
  };
  const updated = styles.value.map(copyStyle);
  if (editingIndex.value === null) updated.push(style);
  else updated.splice(editingIndex.value, 1, style);
  if (style.default) {
    updated.forEach((item, index) => {
      if (index !== (editingIndex.value ?? updated.length - 1))
        item.default = false;
    });
  }
  styles.value = updated;
  emit('update:modelValue', updated.map(copyStyle));
  cancelEdit();
}
</script>
