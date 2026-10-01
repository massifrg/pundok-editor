<template>
  <div class="pandoc-filters-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle2">
        {{ $t('configEditor.outputConverters.filters.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        outline
        icon="add"
        :label="$t('configEditor.outputConverters.filters.add')"
        @click="openAddDialog"
      />
    </div>

    <div
      class="pandoc-filters-editor__filters"
      :class="{
        'pandoc-filters-editor__filters--empty': modelValue.length === 0,
      }"
    >
      <div
        v-for="(filter, index) in modelValue"
        :key="filterKey(filter, index)"
        draggable="true"
        class="pandoc-filters-editor__filter row items-center no-wrap"
        @dragstart="startDragging(index, $event)"
        @dragover.prevent
        @drop="dropFilter(index)"
      >
        <q-icon class="q-mr-xs" name="drag_handle" />
        <span class="ellipsis">{{ filterName(pandocFilterName(filter)) }}</span>
        <q-btn
          dense
          flat
          round
          size="sm"
          icon="remove"
          :title="$t('configEditor.outputConverters.filters.remove')"
          @click="removeFilter(index)"
        />
      </div>
      <div v-if="modelValue.length === 0" class="text-caption text-grey">
        {{ $t('configEditor.outputConverters.filters.noneSelected') }}
      </div>
    </div>

    <PandocLuaResourceDialog
      v-model="addDialogOpen"
      resource-type="filter"
      :resource-options="resourceOptions"
      allow-parameters
      @select="addSelectedFilter"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  pandocFilterName,
  type FindResourceOptions,
  type PandocFilter,
} from '../../common';
import PandocLuaResourceDialog, {
  type PandocLuaResourceSelection,
} from './PandocLuaResourceDialog.vue';

const props = defineProps<{
  modelValue: (string | PandocFilter)[];
  resourceOptions?: Partial<FindResourceOptions>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: (string | PandocFilter)[]];
}>();

const draggedFilterIndex = ref<number>();
const addDialogOpen = ref(false);

function filterName(filter: string): string {
  return filter.replace(/^.*[\\/]/, '').replace(/[.]lua$/, '');
}

function filterKey(filter: string | PandocFilter, index: number): string {
  return `${pandocFilterName(filter)}-${index}`;
}

function openAddDialog(): void {
  addDialogOpen.value = true;
}

function addSelectedFilter(selection: PandocLuaResourceSelection): void {
  const filter: string | PandocFilter =
    Object.keys(selection.metadata).length === 0 &&
    Object.keys(selection.variables).length === 0
      ? selection.path
      : {
          name: selection.path,
          ...(Object.keys(selection.metadata).length > 0 && {
            metadata: selection.metadata,
          }),
          ...(Object.keys(selection.variables).length > 0 && {
            variables: selection.variables,
          }),
        };
  emit('update:modelValue', [...props.modelValue, filter]);
}

function removeFilter(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, filterIndex) => filterIndex !== index),
  );
}

function startDragging(index: number, event: DragEvent): void {
  draggedFilterIndex.value = index;
  event.dataTransfer?.setData('text/plain', String(index));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function dropFilter(targetIndex: number): void {
  const sourceIndex = draggedFilterIndex.value;
  draggedFilterIndex.value = undefined;
  if (sourceIndex === undefined || sourceIndex === targetIndex) return;
  const reordered = [...props.modelValue];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  emit('update:modelValue', reordered);
}
</script>

<style scoped>
.pandoc-filters-editor__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0.5rem;
  border: 1px solid var(--q-separator-color);
  border-radius: 4px;
}

.pandoc-filters-editor__filters--empty {
  display: block;
}

.pandoc-filters-editor__filter {
  max-width: 16rem;
  padding: 0.25rem 0.25rem 0.25rem 0.5rem;
  border: 1px solid var(--q-primary);
  border-radius: 4px;
  cursor: grab;
}

.pandoc-filters-editor__filter:active {
  cursor: grabbing;
}
</style>
