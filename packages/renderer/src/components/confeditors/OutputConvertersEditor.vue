<template>
  <div class="output-converters-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.outputConverters.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.outputConverters.newConverter')"
        @click="newConverter"
      />
    </div>

    <q-list v-if="allConverters.length > 0" bordered separator>
      <q-item
        v-for="converter in allConverters"
        :key="converter.name"
        dense
        :class="{
          'bg-grey-2': isInherited(converter),
          'text-grey-7': isInherited(converter),
        }"
      >
        <q-item-section>
          <q-item-label class="row items-center no-wrap">
            <span>{{ converter.name }}</span>
            <q-badge v-if="converter.default" class="q-ml-sm" color="primary">
              {{ $t('configEditor.outputConverters.default') }}
            </q-badge>
            <q-space />
            <span class="text-caption text-grey-7"
              >{{ converter.type }} · {{ converter.format }}</span
            >
          </q-item-label>
          <q-item-label v-if="converter.description" caption>{{
            converter.description
          }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            v-if="isInherited(converter)"
            dense
            flat
            round
            icon="content_copy"
            :title="$t('configEditor.outputConverters.copyConverter')"
            @click="copyInheritedConverter(converter)"
          />
          <q-btn
            v-else
            dense
            flat
            round
            icon="edit"
            :title="$t('configEditor.outputConverters.editConverter')"
            @click="editConverter(converter.name)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.outputConverters.none') }}
    </div>

    <q-dialog :model-value="!!draft" @hide="cancelEdit">
      <q-card
        v-if="draft"
        flat
        bordered
        class="q-mt-md"
        style="width: 80vw; max-width: 80vw"
      >
        <q-card-section class="q-pb-sm">
          <div class="text-subtitle2">
            {{
              $t(
                editingIndex === null
                  ? 'configEditor.outputConverters.newTitle'
                  : 'configEditor.outputConverters.editTitle',
              )
            }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-md">
          <q-select
            v-model="draft.type"
            :options="converterTypeOptions"
            :label="$t('configEditor.outputConverters.type')"
            outlined
            dense
            emit-value
            map-options
          />
          <q-input
            v-model="draft.name"
            :label="$t('configEditor.outputConverters.name')"
            outlined
            dense
            :error="!!nameError"
            :error-message="nameError ? $t(nameError) : undefined"
          >
            <template v-if="nameError" #error>
              <q-icon name="alert_circle" size="xs" class="q-mr-xs" />
              {{ $t(nameError) }}
            </template>
          </q-input>
          <q-input
            v-model="draft.description"
            :label="$t('configEditor.outputConverters.description')"
            outlined
            dense
            type="textarea"
            autogrow
          />
          <q-checkbox
            v-model="draft.default"
            :label="$t('configEditor.outputConverters.default')"
          />
          <div v-if="draft.type === 'pandoc'" class="row q-col-gutter-md">
            <div class="col">
              <PandocFormatEditor
                :model-value="selectedPandocFormat"
                :format-extensions="selectedFormatExtensions"
                :selected="selectedOutputChoice === 'format'"
                @update:model-value="selectPandocFormat"
                @update:format-extensions="selectedFormatExtensions = $event"
                @select="selectedOutputChoice = 'format'"
              />
            </div>
            <div class="col">
              <q-card
                flat
                bordered
                class="output-converters-editor__writer cursor-pointer"
                :class="{
                  'output-converters-editor__writer--selected':
                    selectedOutputChoice === 'writer',
                }"
                @click="selectWriterCard"
              >
                <q-card-section>
                  <div class="text-subtitle2">
                    {{ $t('configEditor.outputConverters.customWriter') }}
                  </div>
                  <div class="text-body2 q-mt-sm">
                    {{
                      selectedWriter
                        ? selectedWriter
                        : $t('configEditor.outputConverters.chooseCustomWriter')
                    }}
                  </div>
                  <div class="text-caption text-grey">
                    {{
                      $t(
                        'configEditor.outputConverters.customWriterDescription',
                      )
                    }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
          <q-input
            v-else
            v-model="draft.format"
            :label="$t('configEditor.outputConverters.format')"
            outlined
            dense
          />
          <PandocFiltersEditor
            v-if="draft.type === 'pandoc'"
            :model-value="draft.filters || []"
            :resource-options="resourceOptions"
            @update:model-value="draft.filters = $event"
          />
          <PandocOptionsEditor
            v-if="draft.type === 'pandoc'"
            :model-value="draft.pandocOptions || []"
            option-type="writer"
            :editor="editor"
            @update:model-value="draft.pandocOptions = $event"
          />
          <PandocLuaResourceDialog
            v-if="draft.type === 'pandoc'"
            v-model="writerDialogOpen"
            resource-type="writer"
            :resource-options="resourceOptions"
            @select="selectWriter"
          />
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
import type {
  BaseOutputConverter,
  FindResourceOptions,
  OutputConverter,
  OutputConverterType,
  PandocFilter,
  PandocOption,
} from '../../common';
import PandocFormatEditor from './PandocFormatEditor.vue';
import PandocFiltersEditor from './PandocFiltersEditor.vue';
import PandocLuaResourceDialog, {
  type PandocLuaResourceSelection,
} from './PandocLuaResourceDialog.vue';
import PandocOptionsEditor from './PandocOptionsEditor.vue';
import type { Editor } from '@tiptap/vue-3';

type OutputConverterDraft = Omit<
  BaseOutputConverter,
  'type' | 'description' | 'default'
> & {
  type: OutputConverterType;
  description: string;
  default: boolean;
  filters?: (string | PandocFilter)[];
  referenceFile?: string;
  standalone?: boolean;
  pandocTemplate?: string;
  pandocOptions?: PandocOption[];
  formatExtensions?: string[];
  command?: string;
  commandArgs?: string[];
};

const props = defineProps<{
  modelValue: OutputConverter[];
  inherited?: OutputConverter[];
  resourceOptions?: Partial<FindResourceOptions>;
  editor?: Editor;
}>();
const editor = props.editor;

const emit = defineEmits<{
  'update:modelValue': [value: OutputConverter[]];
}>();

const converters = ref<OutputConverter[]>([]);
const draft = ref<OutputConverterDraft>();
const editingIndex = ref<number>();
const nameError = ref('');
const writerDialogOpen = ref(false);
const selectedOutputChoice = ref<'format' | 'writer'>('format');
const selectedPandocFormat = ref('');
const selectedFormatExtensions = ref<string[]>([]);
const selectedWriter = ref('');
const converterTypeOptions: { label: string; value: OutputConverterType }[] = [
  { label: 'Pandoc', value: 'pandoc' },
  { label: 'Lua', value: 'lua' },
  { label: 'Custom', value: 'custom' },
  { label: 'Script', value: 'script' },
];

const allConverters = computed(() => [
  ...converters.value,
  ...(props.inherited || []).filter(
    (item) => !converters.value.some((local) => local.name === item.name),
  ),
]);

const canApply = computed(
  () =>
    !!draft.value?.name.trim() &&
    !!(draft.value?.type === 'pandoc'
      ? selectedOutputChoice.value === 'format'
        ? selectedPandocFormat.value
        : selectedWriter.value
      : draft.value?.format),
);

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) converters.value = value.map(copyConverter);
  },
  { immediate: true },
);

watch(
  () => draft.value?.type,
  (type, previousType) => {
    if (type === 'pandoc' && previousType !== 'pandoc' && draft.value) {
      initializePandocChoice(draft.value);
    }
  },
);

function copyConverter(converter: OutputConverter): OutputConverter {
  switch (converter.type) {
    case 'pandoc':
      return {
        ...converter,
        filters: converter.filters ? [...converter.filters] : undefined,
        pandocOptions: converter.pandocOptions
          ? [...converter.pandocOptions]
          : undefined,
        formatExtensions: converter.formatExtensions
          ? [...converter.formatExtensions]
          : undefined,
      };
    case 'script':
      return {
        ...converter,
        commandArgs: [...converter.commandArgs],
      };
    default:
      return { ...converter };
  }
}

function converterDraft(converter: OutputConverter): OutputConverterDraft {
  const base = {
    ...converter,
    description: converter.description || '',
    default: converter.default === true,
  };
  switch (converter.type) {
    case 'pandoc':
      return {
        ...base,
        filters: converter.filters ? [...converter.filters] : undefined,
        pandocOptions: converter.pandocOptions
          ? [...converter.pandocOptions]
          : undefined,
        formatExtensions: converter.formatExtensions
          ? [...converter.formatExtensions]
          : undefined,
      };
    case 'script':
      return {
        ...base,
        commandArgs: [...converter.commandArgs],
      };
    default:
      return base;
  }
}

function newConverter() {
  editingIndex.value = undefined;
  nameError.value = '';
  draft.value = {
    type: 'pandoc',
    name: '',
    description: '',
    default: false,
    format: '',
  };
  selectedOutputChoice.value = 'format';
  selectedPandocFormat.value = '';
  selectedFormatExtensions.value = [];
  selectedWriter.value = '';
}

function editConverter(name: string) {
  const index = converters.value.findIndex(
    (converter) => converter.name === name,
  );
  if (index < 0) return;
  editingIndex.value = index;
  nameError.value = '';
  draft.value = converterDraft(converters.value[index]);
  initializePandocChoice(draft.value);
}

function isInherited(converter: OutputConverter): boolean {
  return (
    !converters.value.some((item) => item.name === converter.name) &&
    (props.inherited || []).some((item) => item.name === converter.name)
  );
}

function copyInheritedConverter(converter: OutputConverter): void {
  converters.value = [...converters.value, copyConverter(converter)];
  emit('update:modelValue', converters.value.map(copyConverter));
}

function cancelEdit() {
  draft.value = undefined;
  editingIndex.value = undefined;
  nameError.value = '';
}

function applyEdit() {
  if (!draft.value) return;
  const name = draft.value.name.trim();
  if (!name) {
    nameError.value = 'configEditor.outputConverters.nameRequired';
    return;
  }
  if (
    converters.value.some(
      (converter, index) =>
        index !== editingIndex.value && converter.name === name,
    )
  ) {
    nameError.value = 'configEditor.outputConverters.duplicateName';
    return;
  }

  const converterDraft = {
    ...draft.value,
    name,
    ...(draft.value.type === 'pandoc' && {
      format:
        selectedOutputChoice.value === 'format'
          ? selectedPandocFormat.value
          : selectedWriter.value,
      formatExtensions:
        selectedOutputChoice.value === 'format'
          ? selectedFormatExtensions.value
          : undefined,
    }),
  };
  const converter = normalizeConverter(converterDraft);
  const updated = converters.value.map(copyConverter);
  if (editingIndex.value === undefined) updated.push(converter);
  else updated.splice(editingIndex.value, 1, converter);
  if (converter.default) {
    updated.forEach((item, index) => {
      if (index !== (editingIndex.value ?? updated.length - 1))
        item.default = false;
    });
  }
  converters.value = updated;
  emit('update:modelValue', updated.map(copyConverter));
  cancelEdit();
}

function normalizeConverter(draft: OutputConverterDraft): OutputConverter {
  const base: Omit<BaseOutputConverter, 'type'> = {
    name: draft.name,
    format: draft.format,
    ...(draft.description ? { description: draft.description } : {}),
    ...(draft.default ? { default: true } : {}),
    ...(draft.longRendering !== undefined
      ? { longRendering: draft.longRendering }
      : {}),
    ...(draft.extension ? { extension: draft.extension } : {}),
    ...(draft.dontAskForResultFile !== undefined
      ? { dontAskForResultFile: draft.dontAskForResultFile }
      : {}),
    ...(draft.resultFile ? { resultFile: draft.resultFile } : {}),
    ...(draft.openResult ? { openResult: draft.openResult } : {}),
    ...(draft.feedback ? { feedback: draft.feedback } : {}),
    ...(draft.icon ? { icon: draft.icon } : {}),
  };
  switch (draft.type) {
    case 'pandoc':
      return {
        ...base,
        type: 'pandoc',
        ...(draft.filters ? { filters: [...draft.filters] } : {}),
        ...(draft.referenceFile ? { referenceFile: draft.referenceFile } : {}),
        ...(draft.standalone !== undefined
          ? { standalone: draft.standalone }
          : {}),
        ...(draft.pandocTemplate
          ? { pandocTemplate: draft.pandocTemplate }
          : {}),
        ...(draft.pandocOptions
          ? { pandocOptions: [...draft.pandocOptions] }
          : {}),
        ...(draft.formatExtensions
          ? { formatExtensions: [...draft.formatExtensions] }
          : {}),
      };
    case 'script':
      return {
        ...base,
        type: 'script',
        command: draft.command || '',
        commandArgs: draft.commandArgs ? [...draft.commandArgs] : [],
      };
    case 'lua':
      return { ...base, type: 'lua' };
    case 'custom':
      return { ...base, type: 'custom' };
  }
}

function initializePandocChoice(converter: OutputConverterDraft): void {
  if (converter.type !== 'pandoc') return;
  if (isCustomWriter(converter.format)) {
    selectedOutputChoice.value = 'writer';
    selectedWriter.value = converter.format;
    selectedPandocFormat.value = '';
    selectedFormatExtensions.value = [];
  } else {
    selectedOutputChoice.value = 'format';
    selectedPandocFormat.value = converter.format;
    selectedFormatExtensions.value = [...(converter.formatExtensions || [])];
    selectedWriter.value = '';
  }
}

function isCustomWriter(format: string): boolean {
  return format.toLowerCase().endsWith('.lua');
}

function selectPandocFormat(format: string): void {
  selectedPandocFormat.value = format;
  selectedOutputChoice.value = 'format';
}

function selectWriter(selection: PandocLuaResourceSelection): void {
  if (!draft.value) return;
  selectedWriter.value = selection.path.replace(/^.*[\\/]/, '');
  selectedOutputChoice.value = 'writer';
}

function selectWriterCard(): void {
  if (selectedOutputChoice.value === 'writer' || !selectedWriter.value) {
    writerDialogOpen.value = true;
  } else {
    selectedOutputChoice.value = 'writer';
  }
}
</script>

<style scoped>
.output-converters-editor__writer {
  min-width: 18rem;
  height: 100%;
}

.output-converters-editor__writer--selected {
  border: 2px solid var(--q-primary);
  background-color: color-mix(in srgb, var(--q-primary) 10%, transparent);
}
</style>
