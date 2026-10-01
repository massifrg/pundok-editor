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
        :loading="loading"
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

    <q-dialog v-model="addDialogOpen">
      <q-card class="pandoc-filters-editor__dialog">
        <q-card-section>
          <div class="text-h6">
            {{ $t('configEditor.outputConverters.filters.addDialogTitle') }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="pandoc-filters-editor__dialog-body">
            <q-list bordered separator class="pandoc-filters-editor__available">
              <q-item v-if="availableFilters.length === 0">
                <q-item-section class="text-grey">
                  {{
                    $t('configEditor.outputConverters.filters.noneAvailable')
                  }}
                </q-item-section>
              </q-item>
              <q-item
                v-for="filter in availableFilters"
                :key="filter.path"
                clickable
                :active="selectedFilter === filter.path"
                active-class="bg-primary text-white"
                :style="{
                  backgroundColor: filterBackground(filter),
                }"
                @click="selectFilter(filter)"
              >
                <q-item-section>
                  <q-item-label>{{ filterName(filter.path) }}</q-item-label>
                  <q-item-label caption>
                    {{ provenanceLabel(filter) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <q-input
              :model-value="preview"
              type="textarea"
              outlined
              readonly
              :loading="loadingPreview"
              :label="$t('configEditor.outputConverters.filters.preview')"
              input-class="pandoc-filters-editor__preview"
            />
          </div>
          <q-banner
            v-if="previewError"
            dense
            class="bg-negative text-white q-mt-md"
          >
            {{ previewError }}
          </q-banner>
          <div
            v-for="(parameter, index) in parameters"
            :key="index"
            class="pandoc-filters-editor__parameter row items-center q-col-gutter-sm q-mt-sm"
          >
            <div class="col-auto">
              <q-toggle
                v-model="parameter.type"
                true-value="variable"
                false-value="metadata"
                :label="
                  $t(`configEditor.outputConverters.filters.${parameter.type}`)
                "
              />
            </div>
            <div class="col">
              <q-input
                v-model="parameter.name"
                dense
                outlined
                :label="
                  $t('configEditor.outputConverters.filters.parameterName')
                "
              />
            </div>
            <div class="col">
              <q-input
                v-model="parameter.value"
                dense
                outlined
                :label="
                  $t('configEditor.outputConverters.filters.parameterValue')
                "
              />
            </div>
            <div class="col-auto">
              <q-btn
                dense
                flat
                round
                icon="remove"
                :title="
                  $t('configEditor.outputConverters.filters.removeParameter')
                "
                @click="removeParameter(index)"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            icon="add"
            :label="$t('configEditor.outputConverters.filters.addParameter')"
            @click="addParameter"
          />
          <q-space />
          <q-btn
            flat
            :label="$t('configEditor.buttons.cancel')"
            @click="addDialogOpen = false"
          />
          <q-btn
            color="primary"
            :label="$t('configEditor.outputConverters.filters.add')"
            :disable="!canAdd"
            @click="addSelectedFilter"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  pandocFilterName,
  type FindResourceOptions,
  type PandocFilter,
  type ResourceFile,
} from '../../common';
import { useBackend } from '../../stores';

type FilterParameter = {
  type: 'variable' | 'metadata';
  name: string;
  value: string;
};

const props = defineProps<{
  modelValue: (string | PandocFilter)[];
  resourceOptions?: Partial<FindResourceOptions>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: (string | PandocFilter)[]];
}>();

const backend = useBackend();
const { t } = useI18n();
const availableFilters = ref<ResourceFile[]>([]);
const draggedFilterIndex = ref<number>();
const loading = ref(false);
const addDialogOpen = ref(false);
const selectedFilter = ref<string>();
const preview = ref('');
const loadingPreview = ref(false);
const previewError = ref('');
const parameters = ref<FilterParameter[]>([]);

const canAdd = computed(
  () =>
    !!selectedFilter.value &&
    parameters.value.every((parameter) => parameter.name.trim()),
);

onMounted(async () => {
  if (!backend.backend) return;
  loading.value = true;
  try {
    availableFilters.value = await backend.backend.findResourceFiles(
      /[.]lua$/,
      { kind: 'filter', ...props.resourceOptions },
    );
  } finally {
    loading.value = false;
  }
});

function filterName(filter: string): string {
  return filter.replace(/^.*[\\/]/, '').replace(/[.]lua$/, '');
}

function filterKey(filter: string | PandocFilter, index: number): string {
  return `${pandocFilterName(filter)}-${index}`;
}

function openAddDialog(): void {
  selectedFilter.value = undefined;
  preview.value = '';
  previewError.value = '';
  parameters.value = [];
  addDialogOpen.value = true;
}

function filterBackground(filter: ResourceFile): string {
  switch (filter.provenance) {
    case 'project':
      return '#e3f2fd';
    case 'configuration':
      return ['#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec', '#f1f8e9'][
        configurationColorIndex(filter.configurationName)
      ];
    case 'common':
      return '#eeeeee';
  }
}

function configurationColorIndex(configurationName?: string): number {
  return [
    ...new Set(
      availableFilters.value
        .filter((filter) => filter.provenance === 'configuration')
        .map((filter) => filter.configurationName),
    ),
  ].indexOf(configurationName);
}

function provenanceLabel(filter: ResourceFile): string {
  const label = String(
    t(`configEditor.outputConverters.filters.provenance.${filter.provenance}`),
  );
  return filter.configurationName
    ? `${label}: ${filter.configurationName}`
    : label;
}

async function selectFilter(filter: ResourceFile): Promise<void> {
  selectedFilter.value = filter.path;
  preview.value = '';
  previewError.value = '';
  if (!backend.backend) return;
  loadingPreview.value = true;
  try {
    preview.value = await backend.backend.getFileContents(filter.path, {
      kind: 'filter',
    });
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loadingPreview.value = false;
  }
}

function addParameter(): void {
  parameters.value.push({ type: 'variable', name: '', value: '' });
}

function removeParameter(index: number): void {
  parameters.value.splice(index, 1);
}

function addSelectedFilter(): void {
  if (!selectedFilter.value) return;
  const metadata: Record<string, string> = {};
  const variables: Record<string, string> = {};
  for (const parameter of parameters.value) {
    const target = parameter.type === 'metadata' ? metadata : variables;
    target[parameter.name.trim()] = parameter.value;
  }
  const filter: string | PandocFilter =
    parameters.value.length === 0
      ? selectedFilter.value
      : {
          name: selectedFilter.value,
          ...(Object.keys(metadata).length > 0 && { metadata }),
          ...(Object.keys(variables).length > 0 && { variables }),
        };
  emit('update:modelValue', [...props.modelValue, filter]);
  addDialogOpen.value = false;
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

.pandoc-filters-editor__dialog {
  width: min(80rem, 95vw);
  max-width: 95vw;
}

.pandoc-filters-editor__dialog-body {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(32rem, 3fr);
  gap: 1rem;
}

.pandoc-filters-editor__available {
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.pandoc-filters-editor__preview) {
  height: 70vh;
  max-height: 70vh;
  overflow-y: auto;
  font-family: monospace;
}
</style>
