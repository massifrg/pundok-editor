<template>
  <q-btn-dropdown
    outline
    dense
    no-caps
    :label="extensionLabel"
    :loading="loading"
    class="pandoc-format-extensions-editor"
  >
    <q-list bordered separator class="pandoc-format-extensions-editor__menu">
      <q-item v-if="loading">
        <q-item-section class="text-grey">
          {{ t('configEditor.fileFormats.loadingExtensions') }}
        </q-item-section>
      </q-item>
      <q-item
        v-for="extension in availableExtensions"
        :key="extension.name"
        clickable
        @click="toggleExtension(extension)"
      >
        <q-item-section
          avatar
          class="pandoc-format-extensions-editor__sign"
          :class="extensionClass(extension)"
        >
          {{ extensionSign(extension) }}
        </q-item-section>
        <q-item-section :class="extensionClass(extension)">
          <q-item-label>{{ extension.name }}</q-item-label>
          <q-item-label v-if="extensionDescription(extension.name)" caption>
            {{ extensionDescription(extension.name) }}
          </q-item-label>
        </q-item-section>
      </q-item>
      <q-item v-if="!loading && availableExtensions.length === 0">
        <q-item-section class="text-grey">
          {{ t('configEditor.fileFormats.noExtensions') }}
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PandocFormatExtension } from '../../common';
import { PANDOC_EXTENSION_DESCRIPTIONS } from '../../common';
import { useBackend } from '../../stores';

const props = defineProps<{
  format: string;
  modelValue: string[];
}>();
const { t } = useI18n();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const backend = useBackend();
const availableExtensions = ref<PandocFormatExtension[]>([]);
const loading = ref(false);
const extensionLabel = computed(() =>
  props.modelValue.length > 0
    ? props.modelValue.join('')
    : t('configEditor.fileFormats.extensions'),
);

watch(() => props.format, loadExtensions);
onMounted(() => void loadExtensions(props.format));

async function loadExtensions(format: string): Promise<void> {
  if (!format || !backend.backend) {
    availableExtensions.value = [];
    return;
  }
  loading.value = true;
  try {
    availableExtensions.value = (await backend.backend.pandocFeature(
      'extensions',
      { format },
    )) as PandocFormatExtension[];
  } finally {
    loading.value = false;
  }
}

function extensionState(extension: PandocFormatExtension): string {
  const override = props.modelValue.find(
    (value) => value.slice(1) === extension.name,
  );
  if (!override) return 'default';
  return override.startsWith('+') ? 'enabled' : 'disabled';
}

function extensionSign(extension: PandocFormatExtension): string {
  const state = extensionState(extension);
  if (state === 'default') return extension.default ? '+' : '-';
  return state === 'enabled' ? '+' : '-';
}

function extensionClass(extension: PandocFormatExtension): string {
  switch (extensionState(extension)) {
    case 'enabled':
      return 'text-positive';
    case 'disabled':
      return 'text-negative';
    default:
      return 'text-grey';
  }
}

function extensionDescription(extension: string): string | undefined {
  return PANDOC_EXTENSION_DESCRIPTIONS[extension];
}

function toggleExtension(extension: PandocFormatExtension): void {
  const index = props.modelValue.findIndex(
    (value) => value.slice(1) === extension.name,
  );
  const extensions =
    index >= 0
      ? props.modelValue.filter((_, valueIndex) => valueIndex !== index)
      : [
          ...props.modelValue,
          `${extension.default ? '-' : '+'}${extension.name}`,
        ];
  emit('update:modelValue', extensions);
}
</script>

<style scoped>
.pandoc-format-extensions-editor {
  min-width: 12rem;
}

.pandoc-format-extensions-editor__menu {
  max-height: 28rem;
  overflow-y: auto;
}

.pandoc-format-extensions-editor__sign {
  min-width: 1.5rem;
}
</style>
