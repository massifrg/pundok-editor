<template>
  <q-card class="main-formats-editor bordered q-px-sm">
    <div class="text-subtitle1">{{ t('configEditor.fileFormats.mainFormats') }}</div>
    <div class="row q-col-gutter-sm q-mb-sm">
      <q-select class="col" :model-value="undefined" :options="availableOptions"
        :label="t('configEditor.fileFormats.addFormat')" emit-value map-options outlined dense
        @update:model-value="addFormat">
        <template #option="scope">
          <q-item v-bind="scope.itemProps" :style="{ backgroundColor: scope.opt.color }">
            <q-item-section>
              <q-item-label>{{ scope.opt.label }}</q-item-label>
              <q-item-label caption>{{ scope.opt.source }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-select>
    </div>
    <q-list v-if="entries.length" bordered separator>
      <q-item v-for="entry in entries" :key="entry.value">
        <q-item-section>
          <q-item-label>{{ entry.label }}</q-item-label>
          <q-item-label caption>{{ entry.source }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <PandocFormatExtensionsEditor :format="entry.pandocFormat" :model-value="entry.extensions"
            @update:model-value="updateExtensions(entry.value, $event)" />
          <q-btn flat round dense icon="remove" @click="removeFormat(entry.value)" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PandocFormatExtensionsEditor from './PandocFormatExtensionsEditor.vue';

type FormatOption = {
  label: string;
  value: string;
  pandocFormat: string;
  source: string;
  color: string;
};

const props = defineProps<{
  modelValue: string[];
  options: FormatOption[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const { t } = useI18n();

const entries = computed(() =>
  props.modelValue.map((value) => {
    const [format, ...extensionParts] = value.split(/(?=[+-])/);
    const option = props.options.find((item) => item.value === format);
    return {
      value,
      format,
      label: option?.label || format,
      pandocFormat: option?.pandocFormat || format,
      source: option?.source || '',
      color: option?.color || '',
      extensions: extensionParts.filter(Boolean),
    };
  }),
);
const availableOptions = computed(() =>
  props.options.filter(
    (option) => !entries.value.some((entry) => entry.format === option.value),
  ),
);

function addFormat(format: string): void {
  if (!format) return;
  emit('update:modelValue', [...props.modelValue, format]);
}

function updateExtensions(value: string, extensions: string[]): void {
  const entry = entries.value.find((item) => item.value === value);
  if (!entry) return;
  emit(
    'update:modelValue',
    props.modelValue.map((item) =>
      item === value ? `${entry.format}${extensions.join('')}` : item,
    ),
  );
}

function removeFormat(value: string): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((item) => item !== value),
  );
}
</script>
