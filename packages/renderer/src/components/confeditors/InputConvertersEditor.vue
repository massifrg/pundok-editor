<template>
  <div class="input-converters-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.inputConverters.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.inputConverters.newConverter')"
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
              {{ $t('configEditor.inputConverters.default') }}
            </q-badge>
            <q-space />
            <span class="text-caption text-grey-7"
              >{{ converter.type }} · {{ converterSummary(converter) }}</span
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
            :title="$t('configEditor.inputConverters.copyConverter')"
            @click="copyInheritedConverter(converter)"
          />
          <q-btn
            v-else
            dense
            flat
            round
            icon="edit"
            :title="$t('configEditor.inputConverters.editConverter')"
            @click="editConverter(converter.name)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.inputConverters.none') }}
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
                editingIndex === undefined
                  ? 'configEditor.inputConverters.newTitle'
                  : 'configEditor.inputConverters.editTitle',
              )
            }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-md">
          <q-select
            v-model="draft.type"
            :options="converterTypeOptions"
            :label="$t('configEditor.inputConverters.type')"
            outlined
            dense
            emit-value
            map-options
          />
          <q-input
            v-model="draft.name"
            :label="$t('configEditor.inputConverters.name')"
            outlined
            dense
            :error="!!nameError"
            :error-message="nameError ? $t(nameError) : undefined"
          />
          <q-input
            v-model="draft.description"
            :label="$t('configEditor.inputConverters.descriptionField')"
            outlined
            dense
            type="textarea"
            autogrow
          />
          <q-checkbox
            v-model="draft.default"
            :label="$t('configEditor.inputConverters.default')"
          />
          <q-input
            v-model="draft.extensionsText"
            :label="$t('configEditor.inputConverters.extensions')"
            outlined
            dense
          />
          <div v-if="draft.type === 'pandoc'" class="row q-col-gutter-md">
            <div class="col">
              <PandocFormatEditor
                :model-value="selectedPandocFormat"
                :direction="'input'"
                :format-extensions="selectedFormatExtensions"
                :selected="selectedInputChoice === 'format'"
                @update:model-value="selectPandocFormat"
                @update:format-extensions="selectedFormatExtensions = $event"
                @select="selectedInputChoice = 'format'"
              />
            </div>
            <div class="col">
              <q-card
                flat
                bordered
                class="input-converters-editor__reader cursor-pointer"
                :class="{
                  'input-converters-editor__reader--selected':
                    selectedInputChoice === 'reader',
                }"
                @click="selectReaderCard"
              >
                <q-card-section>
                  <div class="text-subtitle2">
                    {{ $t('configEditor.inputConverters.customReader') }}
                  </div>
                  <div class="text-body2 q-mt-sm">
                    {{
                      selectedReader
                        ? selectedReader
                        : $t('configEditor.inputConverters.chooseReader')
                    }}
                  </div>
                  <div class="text-caption text-grey">
                    {{
                      $t('configEditor.inputConverters.customReaderDescription')
                    }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
          <q-input
            v-else
            v-model="draft.format"
            :label="$t('configEditor.inputConverters.format')"
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
            option-type="reader"
            :editor="editor"
            @update:model-value="draft.pandocOptions = $event"
          />
          <PandocLuaResourceDialog
            v-if="draft.type === 'pandoc'"
            v-model="readerDialogOpen"
            resource-type="reader"
            :resource-options="resourceOptions"
            @select="selectReader"
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
  BaseInputConverter,
  FindResourceOptions,
  InputConverter,
  InputConverterType,
  PandocFilter,
  PandocOption,
} from '../../common';
import PandocFiltersEditor from './PandocFiltersEditor.vue';
import PandocFormatEditor from './PandocFormatEditor.vue';
import PandocLuaResourceDialog, {
  type PandocLuaResourceSelection,
} from './PandocLuaResourceDialog.vue';
import PandocOptionsEditor from './PandocOptionsEditor.vue';
import type { Editor } from '@tiptap/vue-3';

type InputConverterDraft = Omit<
  BaseInputConverter,
  'type' | 'description' | 'default'
> & {
  type: InputConverterType;
  description: string;
  default: boolean;
  format?: string;
  formatExtensions?: string[];
  filters?: (string | PandocFilter)[];
  pandocOptions?: PandocOption[];
  command?: string;
  commandArgs?: string[];
  options?: Record<string, any>;
  extensionsText: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: InputConverter[];
    inherited?: InputConverter[];
    resourceOptions?: Partial<FindResourceOptions>;
    editor?: Editor;
  }>(),
  { inherited: () => [] },
);

const emit = defineEmits<{
  'update:modelValue': [value: InputConverter[]];
}>();

const converters = ref<InputConverter[]>([]);
const draft = ref<InputConverterDraft>();
const editingIndex = ref<number>();
const nameError = ref('');
const readerDialogOpen = ref(false);
const selectedInputChoice = ref<'format' | 'reader'>('format');
const selectedPandocFormat = ref('');
const selectedFormatExtensions = ref<string[]>([]);
const selectedReader = ref('');
const editor = props.editor;
const converterTypeOptions: { label: string; value: InputConverterType }[] = [
  { label: 'Pandoc', value: 'pandoc' },
  { label: 'Script', value: 'script' },
  { label: 'Custom', value: 'custom' },
];

const allConverters = computed(() => [
  ...converters.value,
  ...props.inherited.filter(
    (item) => !converters.value.some((local) => local.name === item.name),
  ),
]);

const canApply = computed(
  () =>
    !!draft.value?.name.trim() &&
    !!(draft.value?.type === 'pandoc'
      ? selectedInputChoice.value === 'format'
        ? selectedPandocFormat.value
        : selectedReader.value
      : draft.value?.type === 'script'
        ? draft.value.command?.trim()
        : true),
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

function copyConverter(converter: InputConverter): InputConverter {
  switch (converter.type) {
    case 'pandoc':
      return {
        ...converter,
        filters: converter.filters ? [...converter.filters] : undefined,
        pandocOptions: converter.pandocOptions
          ? converter.pandocOptions.map(
              ([name, value]) => [name, value] as PandocOption,
            )
          : undefined,
        formatExtensions: converter.formatExtensions
          ? [...converter.formatExtensions]
          : undefined,
      };
    case 'script':
      return { ...converter, commandArgs: [...converter.commandArgs] };
    default:
      return { ...converter };
  }
}

function converterDraft(converter: InputConverter): InputConverterDraft {
  const base = {
    ...converter,
    description: converter.description || '',
    default: converter.default === true,
    extensionsText: converter.extensions.join(', '),
  };
  switch (converter.type) {
    case 'pandoc':
      return {
        ...base,
        filters: converter.filters ? [...converter.filters] : undefined,
        formatExtensions: converter.formatExtensions
          ? [...converter.formatExtensions]
          : undefined,
      };
    case 'script':
      return { ...base, commandArgs: [...converter.commandArgs] };
    default:
      return base;
  }
}

function newConverter(): void {
  editingIndex.value = undefined;
  nameError.value = '';
  draft.value = {
    type: 'pandoc',
    name: '',
    description: '',
    default: false,
    extensions: [],
    extensionsText: '',
    format: '',
    pandocOptions: [],
  };
  selectedInputChoice.value = 'format';
  selectedPandocFormat.value = '';
  selectedFormatExtensions.value = [];
  selectedReader.value = '';
}

function editConverter(name: string): void {
  const index = converters.value.findIndex(
    (converter) => converter.name === name,
  );
  if (index < 0) return;
  editingIndex.value = index;
  nameError.value = '';
  draft.value = converterDraft(converters.value[index]);
  initializePandocChoice(draft.value);
}

function isInherited(converter: InputConverter): boolean {
  return (
    !converters.value.some((item) => item.name === converter.name) &&
    props.inherited.some((item) => item.name === converter.name)
  );
}

function copyInheritedConverter(converter: InputConverter): void {
  converters.value = [...converters.value, copyConverter(converter)];
  emit('update:modelValue', converters.value.map(copyConverter));
}

function cancelEdit(): void {
  draft.value = undefined;
  editingIndex.value = undefined;
  nameError.value = '';
}

function applyEdit(): void {
  if (!draft.value) return;
  const name = draft.value.name.trim();
  if (!name) {
    nameError.value = 'configEditor.inputConverters.nameRequired';
    return;
  }
  if (
    converters.value.some(
      (converter, index) =>
        index !== editingIndex.value && converter.name === name,
    )
  ) {
    nameError.value = 'configEditor.inputConverters.duplicateName';
    return;
  }
  const converter = normalizeConverter({
    ...draft.value,
    name,
    ...(draft.value.type === 'pandoc' && {
      format:
        selectedInputChoice.value === 'format'
          ? selectedPandocFormat.value
          : selectedReader.value,
      formatExtensions:
        selectedInputChoice.value === 'format'
          ? selectedFormatExtensions.value
          : undefined,
    }),
    extensions: draft.value.extensionsText
      .split(',')
      .map((extension) => extension.trim())
      .filter(Boolean),
  });
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

function normalizeConverter(draft: InputConverterDraft): InputConverter {
  const base = {
    name: draft.name,
    description: draft.description,
    extensions: draft.extensions,
    ...(draft.default ? { default: true } : {}),
    ...(draft.feedback ? { feedback: draft.feedback } : {}),
    ...(draft.icon ? { icon: draft.icon } : {}),
  };
  switch (draft.type) {
    case 'pandoc':
      return {
        ...base,
        type: 'pandoc',
        format: draft.format || '',
        ...(draft.filters ? { filters: [...draft.filters] } : {}),
        ...(draft.pandocOptions
          ? {
              pandocOptions: draft.pandocOptions.map(
                ([name, value]) => [name, value] as PandocOption,
              ),
            }
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
    case 'custom':
      return { ...base, type: 'custom', options: draft.options || {} };
  }
}

function initializePandocChoice(converter: InputConverterDraft): void {
  if (converter.type !== 'pandoc') return;
  if (isCustomReader(converter.format || '')) {
    selectedInputChoice.value = 'reader';
    selectedReader.value = converter.format || '';
    selectedPandocFormat.value = '';
    selectedFormatExtensions.value = [];
  } else {
    selectedInputChoice.value = 'format';
    selectedPandocFormat.value = converter.format || '';
    selectedFormatExtensions.value = [...(converter.formatExtensions || [])];
    selectedReader.value = '';
  }
}

function isCustomReader(format: string): boolean {
  return format.toLowerCase().endsWith('.lua');
}

function selectPandocFormat(format: string): void {
  selectedPandocFormat.value = format;
  selectedInputChoice.value = 'format';
}

function selectReader(selection: PandocLuaResourceSelection): void {
  if (!draft.value) return;
  selectedReader.value = selection.path.replace(/^.*[\\/]/, '');
  selectedInputChoice.value = 'reader';
}

function selectReaderCard(): void {
  if (selectedInputChoice.value === 'reader' || !selectedReader.value) {
    readerDialogOpen.value = true;
  } else {
    selectedInputChoice.value = 'reader';
  }
}

function converterSummary(converter: InputConverter): string {
  switch (converter.type) {
    case 'pandoc':
      return converter.format;
    case 'script':
      return converter.command;
    case 'custom':
      return 'custom';
  }
}
</script>

<style scoped>
.input-converters-editor__reader {
  min-width: 18rem;
  height: 100%;
}

.input-converters-editor__reader--selected {
  border: 2px solid var(--q-primary);
  background-color: color-mix(in srgb, var(--q-primary) 10%, transparent);
}
</style>
