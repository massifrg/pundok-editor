<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="pandoc-lua-resource-dialog">
      <q-card-section>
        <div class="text-h6">
          {{
            parametersOnly
              ? `${$t(
                  'configEditor.outputConverters.filters.edit',
                )}: ${resourceName(initialSelection?.path || '')}`
              : $t(
                  'configEditor.outputConverters.pandocResources.addDialogTitle',
                  { resource: resourceLabel },
                )
          }}
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div v-if="!parametersOnly" class="pandoc-lua-resource-dialog__body">
          <q-list
            bordered
            separator
            class="pandoc-lua-resource-dialog__available"
          >
            <q-item>
              <q-item-section>
                <q-toggle
                  v-model="searchMode"
                  true-value="strict"
                  false-value="loose"
                  :label="
                    $t(
                      'configEditor.outputConverters.pandocResources.strictSearch',
                    )
                  "
                />
              </q-item-section>
            </q-item>
            <q-item v-if="availableResources.length === 0">
              <q-item-section class="text-grey">
                {{
                  $t(
                    'configEditor.outputConverters.pandocResources.noneAvailable',
                    {
                      resource: resourceLabel,
                    },
                  )
                }}
              </q-item-section>
            </q-item>
            <q-item
              v-for="resource in availableResources"
              :key="resource.path"
              clickable
              :active="selectedResource === resource.path"
              active-class="bg-primary text-white"
              :style="{ backgroundColor: resourceBackground(resource) }"
              @click="selectResource(resource)"
            >
              <q-item-section>
                <q-item-label>{{ resourceName(resource.path) }}</q-item-label>
                <q-item-label caption>
                  {{ provenanceLabel(resource) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <div class="pandoc-lua-resource-dialog__preview-container">
            <div class="text-caption q-mb-xs">
              {{
                $t('configEditor.outputConverters.pandocResources.preview', {
                  resource: resourceLabel,
                })
              }}
            </div>
            <Codemirror
              :model-value="preview"
              :extensions="previewExtensions"
              class="pandoc-lua-resource-dialog__preview"
            />
            <q-inner-loading :showing="loadingPreview" />
          </div>
        </div>
        <q-banner
          v-if="previewError"
          dense
          class="bg-negative text-white q-mt-md"
        >
          {{ previewError }}
        </q-banner>
        <q-input
          v-if="parametersOnly"
          :model-value="initialSelection?.path || ''"
          dense
          outlined
          readonly
          class="q-mb-md"
          :label="$t('configEditor.outputConverters.filters.filterLabel')"
        />
        <div
          v-if="parametersOnly"
          class="pandoc-lua-resource-dialog__preview-container"
        >
          <div class="text-caption q-mb-xs">
            {{ $t('configEditor.outputConverters.filters.preview') }}
          </div>
          <Codemirror
            :model-value="preview"
            :extensions="previewExtensions"
            class="pandoc-lua-resource-dialog__parameters-preview"
          />
          <q-inner-loading :showing="loadingPreview" />
        </div>
        <div v-if="allowParameters">
          <div
            v-for="(parameter, index) in parameters"
            :key="index"
            class="pandoc-lua-resource-dialog__parameter row items-center q-col-gutter-sm q-mt-sm"
          >
            <div class="col-auto">
              <q-toggle
                v-model="parameter.type"
                true-value="variable"
                false-value="metadata"
                :label="
                  $t(
                    `configEditor.outputConverters.pandocResources.${parameter.type}`,
                  )
                "
              />
            </div>
            <div class="col">
              <q-input
                v-model="parameter.name"
                dense
                outlined
                :label="
                  $t(
                    'configEditor.outputConverters.pandocResources.parameterName',
                  )
                "
              />
            </div>
            <div class="col">
              <q-input
                v-model="parameter.value"
                dense
                outlined
                :label="
                  $t(
                    'configEditor.outputConverters.pandocResources.parameterValue',
                  )
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
                  $t(
                    'configEditor.outputConverters.pandocResources.removeParameter',
                  )
                "
                @click="removeParameter(index)"
              />
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          v-if="allowParameters"
          flat
          icon="add"
          :label="
            $t('configEditor.outputConverters.pandocResources.addParameter')
          "
          @click="addParameter"
        />
        <q-space />
        <q-btn
          flat
          :label="$t('configEditor.buttons.cancel')"
          @click="emit('update:modelValue', false)"
        />
        <q-btn
          color="primary"
          :label="
            $t(
              parametersOnly
                ? 'configEditor.buttons.apply'
                : 'configEditor.outputConverters.pandocResources.select',
            )
          "
          :disable="!canSelect"
          @click="select"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { StreamLanguage } from '@codemirror/language';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { computed, onMounted, ref, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { useI18n } from 'vue-i18n';
import type {
  FindResourceOptions,
  ResourceFile,
  ResourceSearchMode,
  ResourceType,
} from '../../common';
import { useBackend } from '../../stores';

type LuaResourceType = Extract<ResourceType, 'filter' | 'writer'>;

export type PandocLuaResourceSelection = {
  path: string;
  metadata: Record<string, string>;
  variables: Record<string, string>;
};

type Parameter = {
  type: 'variable' | 'metadata';
  name: string;
  value: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    resourceType: LuaResourceType;
    resourceOptions?: Partial<FindResourceOptions>;
    allowParameters?: boolean;
    initialSelection?: PandocLuaResourceSelection;
    parametersOnly?: boolean;
  }>(),
  { allowParameters: false, parametersOnly: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [value: PandocLuaResourceSelection];
}>();

const backend = useBackend();
const { t } = useI18n();
const availableResources = ref<ResourceFile[]>([]);
const selectedResource = ref<string>();
const searchMode = ref<ResourceSearchMode>('strict');
const preview = ref('');
const loadingPreview = ref(false);
const previewError = ref('');
const parameters = ref<Parameter[]>([]);
const previewExtensions = [
  StreamLanguage.define(lua),
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
  EditorView.lineWrapping,
];

const resourceLabel = computed(() =>
  String(
    t(`configEditor.outputConverters.pandocResources.${props.resourceType}`),
  ),
);
const canSelect = computed(
  () =>
    !!selectedResource.value &&
    parameters.value.every((parameter) => parameter.name.trim()),
);

onMounted(loadResources);

watch(searchMode, async () => {
  selectedResource.value = undefined;
  preview.value = '';
  previewError.value = '';
  parameters.value = [];
  await loadResources();
});

async function loadResources(): Promise<void> {
  if (!backend.backend) return;
  availableResources.value = await backend.backend.findResourceFiles(
    /[.]lua$/,
    {
      ...props.resourceOptions,
      kind: props.resourceType,
      searchMode: searchMode.value,
      filterSearchTerms: [
        'filter',
        String(
          t('configEditor.outputConverters.pandocResources.filterSearchTerm'),
        ),
      ],
    },
  );
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    selectedResource.value = props.initialSelection?.path;
    preview.value = '';
    previewError.value = '';
    parameters.value = [
      ...Object.entries(props.initialSelection?.metadata || {}).map(
        ([name, value]) => ({
          type: 'metadata' as const,
          name,
          value,
        }),
      ),
      ...Object.entries(props.initialSelection?.variables || {}).map(
        ([name, value]) => ({
          type: 'variable' as const,
          name,
          value,
        }),
      ),
    ];
    if (props.parametersOnly && selectedResource.value) {
      await loadPreview(selectedResource.value);
    }
  },
);

function resourceName(path: string): string {
  const filename = path.replace(/^.*[\\/]/, '');
  return props.resourceType === 'filter'
    ? filename.replace(/[.]lua$/, '')
    : filename;
}

function resourceBackground(resource: ResourceFile): string {
  switch (resource.provenance) {
    case 'project':
      return '#e3f2fd';
    case 'configuration':
      return ['#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec', '#f1f8e9'][
        configurationColorIndex(resource.configurationName)
      ];
    case 'common':
      return '#eeeeee';
  }
}

function configurationColorIndex(configurationName?: string): number {
  return [
    ...new Set(
      availableResources.value
        .filter((resource) => resource.provenance === 'configuration')
        .map((resource) => resource.configurationName),
    ),
  ].indexOf(configurationName);
}

function provenanceLabel(resource: ResourceFile): string {
  const label = String(
    t(
      `configEditor.outputConverters.pandocResources.provenance.${resource.provenance}`,
    ),
  );
  return resource.configurationName
    ? `${label}: ${resource.configurationName}`
    : label;
}

async function selectResource(resource: ResourceFile): Promise<void> {
  selectedResource.value = resource.path;
  await loadPreview(resource.path);
}

async function loadPreview(path: string): Promise<void> {
  preview.value = '';
  previewError.value = '';
  if (!backend.backend) return;
  loadingPreview.value = true;
  try {
    preview.value = await backend.backend.getFileContents(path, {
      ...props.resourceOptions,
      kind: props.resourceType,
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

function select(): void {
  if (!selectedResource.value) return;
  const metadata: Record<string, string> = {};
  const variables: Record<string, string> = {};
  for (const parameter of parameters.value) {
    const target = parameter.type === 'metadata' ? metadata : variables;
    target[parameter.name.trim()] = parameter.value;
  }
  emit('select', { path: selectedResource.value, metadata, variables });
  emit('update:modelValue', false);
}
</script>

<style scoped>
.pandoc-lua-resource-dialog {
  width: min(80rem, 95vw);
  max-width: 95vw;
}

.pandoc-lua-resource-dialog__body {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) minmax(32rem, 3fr);
  gap: 1rem;
}

.pandoc-lua-resource-dialog__available {
  max-height: 70vh;
  overflow-y: auto;
}

.pandoc-lua-resource-dialog__preview-container {
  position: relative;
}

:deep(.pandoc-lua-resource-dialog__preview .cm-editor) {
  height: 70vh;
  max-height: 70vh;
  border: 1px solid var(--q-separator-color);
  border-radius: 4px;
}

:deep(.pandoc-lua-resource-dialog__parameters-preview .cm-editor) {
  height: calc(60vh - 3rem);
  max-height: calc(60vh - 3rem);
  border: 1px solid var(--q-separator-color);
  border-radius: 4px;
}
</style>
