<template>
  <div class="pandoc-options-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle2">
        {{ $t('configEditor.pandocOptions.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.pandocOptions.add')"
        @click="newOption"
      />
    </div>

    <q-list v-if="options.length" bordered separator>
      <q-item
        v-for="option in options"
        :key="`${option[0]}-${optionIndex(option)}`"
        dense
      >
        <q-item-section>
          <q-item-label>{{ formatOptionName(option[0]) }}</q-item-label>
          <q-item-label caption>{{ optionValue(option) }}</q-item-label>
        </q-item-section>
        <q-item-section side class="row no-wrap">
          <q-btn dense flat round icon="edit" @click="editOption(option)" />
          <q-btn dense flat round icon="delete" @click="removeOption(option)" />
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption text-grey">
      {{ $t('configEditor.pandocOptions.none') }}
    </div>

    <q-dialog v-model="dialogOpen">
      <q-card style="width: 36rem; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle2">
            {{ $t('configEditor.pandocOptions.editTitle') }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-md">
          <q-select
            v-model="selectedName"
            :options="optionNames"
            :label="$t('configEditor.pandocOptions.option')"
            outlined
            dense
            emit-value
            map-options
            @update:model-value="resetValue"
          >
            <template #option="scope">
              <q-item
                v-bind="scope.itemProps"
                dense
                class="pandoc-options-editor__option"
              >
                <q-item-section>
                  <q-item-label class="text-weight-bold">
                    {{ scope.opt.names }}
                  </q-item-label>
                  <q-item-label v-if="scope.opt.description" caption>
                    {{ scope.opt.description }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-option-group
            v-if="choiceOptions.length > 1"
            v-model="selectedChoice"
            :options="choiceOptions"
            type="radio"
            inline
            dense
          />
          <q-checkbox
            v-if="valueEditor === 'checkbox'"
            v-model="selectedBoolean"
            :label="$t('configEditor.pandocOptions.enabled')"
          />
          <div
            v-if="valueEditor === 'key-value' || valueEditor === 'key-json'"
            class="q-gutter-sm"
          >
            <div
              v-for="(pair, index) in selectedPairs"
              :key="index"
              class="row items-center q-col-gutter-sm"
            >
              <q-input
                v-model="pair.name"
                class="col"
                :label="$t('configEditor.pandocOptions.key')"
                outlined
                dense
              />
              <q-input
                v-model="pair.value"
                class="col"
                :label="$t('configEditor.pandocOptions.value')"
                outlined
                dense
              />
              <q-btn
                v-if="valueEditor === 'key-value'"
                dense
                flat
                round
                icon="remove"
                :title="$t('configEditor.pandocOptions.removePair')"
                @click="removePair(index)"
              />
            </div>
            <q-btn
              dense
              flat
              icon="add"
              :label="$t('configEditor.pandocOptions.addPair')"
              @click="addPair"
            />
          </div>
          <q-input
            v-else
            v-model="selectedText"
            type="text"
            :label="$t('configEditor.pandocOptions.value')"
            outlined
            dense
          >
            <template
              v-if="valueEditor === 'file' || valueEditor === 'directory'"
              #append
            >
              <q-btn
                flat
                round
                dense
                :icon="
                  valueEditor === 'directory' ? 'folder' : 'insert_drive_file'
                "
                :title="$t('configEditor.pandocOptions.choose')"
                @click="choosePath"
              />
            </template>
          </q-input>
          <div v-if="valueError" class="text-negative text-caption">
            {{ $t(valueError) }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            :label="$t('configEditor.buttons.cancel')"
            @click="dialogOpen = false"
          />
          <q-btn
            color="primary"
            :label="$t('configEditor.buttons.apply')"
            @click="applyOption"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import {
  PANDOC_OPTIONS_SPECS,
  type PandocOption,
  type PandocOptionSpec,
  type PandocOptionValueType,
} from '../../common';
import { showOpenDocumentDialog, showSelectFolderDialog } from '../helpers';
import { t } from '../../i18n';

const props = withDefaults(
  defineProps<{
    modelValue: PandocOption[];
    optionType: 'reader' | 'writer';
    editor?: Editor;
  }>(),
  { editor: undefined },
);

const emit = defineEmits<{
  'update:modelValue': [value: PandocOption[]];
}>();

const options = computed(() => props.modelValue || []);
const dialogOpen = ref(false);
const selectedName = ref('');
const selectedText = ref('');
const selectedBoolean = ref(false);
const selectedPairs = ref<{ name: string; value: string }[]>([]);
const selectedChoice = ref('');
const editingIndex = ref<number>();
const valueError = ref('');

const optionSpecs = computed(() =>
  PANDOC_OPTIONS_SPECS.filter((spec) => spec.type === props.optionType),
);
const optionNames = computed(() =>
  optionSpecs.value.map((spec) => ({
    label: spec.name.map(formatOptionName).join(', '),
    value: spec.name[0],
    names: spec.name.map(formatOptionName).join(', '),
    description: spec.description ? descriptionText(spec.description) : '',
  })),
);
const selectedSpec = computed<PandocOptionSpec | undefined>(() =>
  optionSpecs.value.find((spec) => spec.name.includes(selectedName.value)),
);
const valueTypes = computed<readonly PandocOptionValueType[]>(() => {
  const valueType = selectedSpec.value?.valueType;
  return !valueType
    ? []
    : typeof valueType === 'string'
      ? [valueType]
      : valueType;
});
const choiceOptions = computed(() => {
  const valueType = selectedSpec.value?.valueType;
  if (typeof valueType !== 'string' || !valueType.includes('|')) return [];
  return valueType.split('|').map((value) => ({ label: value, value }));
});
const selectedValueType = computed(
  () => selectedChoice.value || valueTypes.value[0],
);
const valueEditor = computed<
  | 'checkbox'
  | 'number'
  | 'file'
  | 'directory'
  | 'key-value'
  | 'key-json'
  | 'text'
>(() => {
  if (
    selectedValueType.value === 'flag' ||
    selectedValueType.value === 'boolean'
  )
    return 'checkbox';
  if (selectedValueType.value === 'number') return 'number';
  if (selectedValueType.value === 'DIRECTORY') return 'directory';
  if (selectedValueType.value === 'FILE') return 'file';
  if (selectedValueType.value === 'KEY_JSON') return 'key-json';
  if (selectedValueType.value === 'KEY_VAL') return 'key-value';
  if (valueTypes.value.includes('KEY_JSON')) return 'key-json';
  if (valueTypes.value.includes('KEY_VAL')) return 'key-value';
  return 'text';
});

function optionIndex(option: PandocOption): number {
  return options.value.indexOf(option);
}

function formatOptionName(name: string): string {
  return `${name.length === 1 ? '-' : '--'}${name}`;
}

function descriptionText(description: string | string[]): string {
  return Array.isArray(description) ? description.join(' ') : description;
}

function optionValue(option: PandocOption): string {
  return option.length < 2
    ? t('configEditor.pandocOptions.enabled')
    : String(option[1]);
}

function resetValue(): void {
  selectedText.value = '';
  selectedBoolean.value = true;
  selectedPairs.value = [{ name: '', value: '' }];
  selectedChoice.value = choiceOptions.value[0]?.value || '';
  valueError.value = '';
}

function newOption(): void {
  editingIndex.value = undefined;
  selectedName.value = optionNames.value[0]?.value || '';
  resetValue();
  dialogOpen.value = true;
}

function editOption(option: PandocOption): void {
  editingIndex.value = optionIndex(option);
  selectedName.value = option[0];
  selectedChoice.value = choiceOptions.value[0]?.value || '';
  if (typeof option[1] === 'boolean') selectedBoolean.value = option[1];
  else if (option[1] === undefined) selectedBoolean.value = true;
  else if (
    valueEditor.value === 'key-value' ||
    valueEditor.value === 'key-json'
  ) {
    const [name, ...value] = String(option[1] ?? '').split('=');
    selectedPairs.value = [{ name, value: value.join('=') }];
  } else selectedText.value = option[1] === undefined ? '' : String(option[1]);
  valueError.value = '';
  dialogOpen.value = true;
}

function addPair(): void {
  selectedPairs.value.push({ name: '', value: '' });
}

function removePair(index: number): void {
  selectedPairs.value.splice(index, 1);
}

function choosePath(): void {
  if (!props.editor) return;
  const callback = ({ path }: { path?: string }) => {
    if (path) selectedText.value = path;
  };
  const options = { prompt: t('configEditor.pandocOptions.choose') };
  if (valueEditor.value === 'directory')
    showSelectFolderDialog({ editor: props.editor, options, callback });
  else showOpenDocumentDialog({ editor: props.editor, options, callback });
}

function applyOption(): void {
  const spec = selectedSpec.value;
  if (!spec || !selectedName.value) return;
  valueError.value = '';
  let option: PandocOption;
  if (valueEditor.value === 'checkbox')
    option = [selectedName.value, selectedBoolean.value];
  else if (valueEditor.value === 'number') {
    const value = Number(selectedText.value);
    if (!Number.isFinite(value)) {
      valueError.value = 'configEditor.pandocOptions.invalidNumber';
      return;
    }
    option = [selectedName.value, value];
  } else if (
    valueEditor.value === 'key-value' ||
    valueEditor.value === 'key-json'
  ) {
    const pair = selectedPairs.value[0];
    option = [selectedName.value, `${pair?.name || ''}=${pair?.value || ''}`];
  } else option = [selectedName.value, selectedText.value];

  const updated = options.value.map(
    ([name, value]) => [name, value] as PandocOption,
  );
  const duplicateIndex = updated.findIndex(
    ([name], index) =>
      name === selectedName.value && index !== editingIndex.value,
  );
  if (duplicateIndex >= 0) updated.splice(duplicateIndex, 1);
  if (editingIndex.value === undefined) updated.push(option);
  else updated.splice(editingIndex.value, 1, option);
  emit('update:modelValue', updated);
  dialogOpen.value = false;
}

function removeOption(option: PandocOption): void {
  emit(
    'update:modelValue',
    options.value.filter((candidate) => candidate !== option),
  );
}
</script>

<style scoped>
.pandoc-options-editor__option {
  min-height: 2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
