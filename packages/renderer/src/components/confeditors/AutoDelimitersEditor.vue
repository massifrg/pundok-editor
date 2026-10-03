<template>
  <div class="auto-delimiters-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.autoDelimiters.title') }}
      </div>
      <q-space />
      <q-btn-dropdown
        dense
        outline
        :label="$t('configEditor.autoDelimiters.presets')"
      >
        <q-list>
          <q-item
            v-for="preset in presets"
            :key="preset.language"
            v-close-popup
            clickable
            @click="applyPreset(preset)"
          >
            <q-item-section>
              {{ $t(`configEditor.autoDelimiters.languages.${preset.language}`) }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>

    <q-list bordered separator>
      <q-item v-for="name in delimiterNames" :key="name">
        <q-item-section>
          <q-item-label>
            {{ $t(`configEditor.autoDelimiters.names.${name}`) }}
          </q-item-label>
        </q-item-section>
        <q-item-section>
          <q-input
            :model-value="draft[name][0]"
            outlined
            dense
            input-class="text-h5 text-center"
            :label="$t('configEditor.autoDelimiters.opening')"
            @update:model-value="updateDelimiter(name, 0, $event)"
          />
        </q-item-section>
        <q-item-section>
          <q-input
            :model-value="draft[name][1]"
            outlined
            dense
            input-class="text-h5 text-center"
            :label="$t('configEditor.autoDelimiters.closing')"
            @update:model-value="updateDelimiter(name, 1, $event)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AutoDelimitersDef } from '../../../common';

type Preset = {
  language:
    | 'english'
    | 'italian'
    | 'german'
    | 'french'
    | 'spanish'
    | 'portuguese';
  values: AutoDelimitersDef;
};

const english: AutoDelimitersDef = {
  DoubleQuote: ['“', '”'],
  SingleQuote: ['‘', '’'],
};

const presets: Preset[] = [
  { language: 'english', values: english },
  {
    language: 'italian',
    values: { DoubleQuote: ['«', '»'], SingleQuote: ['‘', '’'] },
  },
  {
    language: 'german',
    values: { DoubleQuote: ['„', '“'], SingleQuote: ['‚', '‘'] },
  },
  {
    language: 'french',
    values: { DoubleQuote: ['«', '»'], SingleQuote: ['‹', '›'] },
  },
  {
    language: 'spanish',
    values: { DoubleQuote: ['«', '»'], SingleQuote: ['“', '”'] },
  },
  {
    language: 'portuguese',
    values: { DoubleQuote: ['“', '”'], SingleQuote: ['‘', '’'] },
  },
];

const props = defineProps<{ modelValue?: AutoDelimitersDef }>();
const emit = defineEmits<{
  'update:modelValue': [value: AutoDelimitersDef];
}>();

const draft = ref<AutoDelimitersDef>(copyValues(props.modelValue || english));
const delimiterNames = computed(() => {
  const names = Object.keys(draft.value);
  return [
    'DoubleQuote',
    'SingleQuote',
    ...names.filter(
      (name) => name !== 'DoubleQuote' && name !== 'SingleQuote',
    ),
  ] as string[];
});

watch(
  () => props.modelValue,
  (value) => {
    draft.value = copyValues(value || english);
  },
  { immediate: true },
);

function copyValues(values: AutoDelimitersDef): AutoDelimitersDef {
  return Object.fromEntries(
    Object.entries(values).map(([name, delimiters]) => [
      name,
      [...delimiters] as [string, string],
    ]),
  ) as AutoDelimitersDef;
}

function updateDelimiter(
  name: string,
  side: 0 | 1,
  value: string | number | null,
): void {
  const delimiters = [...draft.value[name]] as [string, string];
  delimiters[side] = String(value ?? '');
  draft.value = { ...draft.value, [name]: delimiters };
  emit('update:modelValue', copyValues(draft.value));
}

function applyPreset(preset: Preset): void {
  draft.value = copyValues(preset.values);
  emit('update:modelValue', copyValues(draft.value));
}
</script>
