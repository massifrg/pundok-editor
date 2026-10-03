<template>
  <q-card
    flat
    bordered
    class="pandoc-format-editor cursor-pointer"
    :class="{ 'pandoc-format-editor--selected': selected }"
    @click="onCardClick"
  >
    <q-card-section>
      <div class="text-subtitle2">
        {{ $t('configEditor.outputConverters.format') }}
      </div>
      <div class="text-body2 q-mt-sm">
        {{ modelValue || $t('configEditor.outputConverters.chooseFormat') }}
      </div>
      <div class="text-caption text-grey">
        {{
          formatExtensions.length > 0
            ? formatExtensions.join(', ')
            : $t('configEditor.outputConverters.noFormatExtensionsSelected')
        }}
      </div>
    </q-card-section>
  </q-card>

  <q-dialog v-model="dialogOpen">
    <q-card class="pandoc-format-editor__dialog">
      <q-card-section>
        <div class="text-h6">
          {{ $t('configEditor.outputConverters.chooseFormat') }}
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none q-gutter-md">
        <q-select
          v-model="selectedFormat"
          :options="outputFormats"
          :label="$t('configEditor.outputConverters.format')"
          outlined
          dense
          :loading="loadingFormats"
          @update:model-value="onFormatChanged"
        />
        <q-list
          v-if="selectedFormat"
          bordered
          separator
          class="pandoc-format-editor__extensions"
        >
          <q-item v-if="availableExtensions.length === 0">
            <q-item-section class="text-grey">
              {{ $t('configEditor.outputConverters.noFormatExtensions') }}
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
              class="pandoc-format-editor__extension-sign"
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
        </q-list>
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
          :disable="!selectedFormat"
          @click="apply"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { PandocFormatExtension } from '../../common';
import { PANDOC_EXTENSION_DESCRIPTIONS } from '../../common';
import { useBackend } from '../../stores';

const props = defineProps<{
  modelValue: string;
  formatExtensions: string[];
  selected: boolean;
  direction?: 'input' | 'output';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:formatExtensions': [value: string[]];
  select: [];
}>();

const backend = useBackend();
const dialogOpen = ref(false);
const outputFormats = ref<string[]>([]);
const loadingFormats = ref(false);
const selectedFormat = ref('');
const selectedExtensions = ref<string[]>([]);
const availableExtensions = ref<PandocFormatExtension[]>([]);
const loadingExtensions = ref(false);

watch(dialogOpen, (open) => {
  if (!open) return;
  selectedFormat.value = props.modelValue;
  selectedExtensions.value = [...props.formatExtensions];
  loadExtensions(selectedFormat.value);
});

function onCardClick(): void {
  if (props.selected || !props.modelValue) {
    dialogOpen.value = true;
  } else {
    emit('select');
  }
}

onMounted(async () => {
  loadingFormats.value = true;
  try {
    outputFormats.value =
      (await backend.backend?.pandocFeature(
        props.direction === 'input' ? 'input-formats' : 'output-formats',
      )) || [];
  } finally {
    loadingFormats.value = false;
  }
});

async function onFormatChanged(format: string): Promise<void> {
  selectedExtensions.value = [];
  await loadExtensions(format);
}

async function loadExtensions(format: string): Promise<void> {
  if (!format || !backend.backend) {
    availableExtensions.value = [];
    return;
  }
  loadingExtensions.value = true;
  try {
    const extensions = (await backend.backend.pandocFeature('extensions', {
      format,
    })) as PandocFormatExtension[];
    if (selectedFormat.value === format) availableExtensions.value = extensions;
  } finally {
    loadingExtensions.value = false;
  }
}

function extensionState(extension: PandocFormatExtension) {
  const override = selectedExtensions.value.find(
    (value) => value.slice(1) === extension.name,
  );
  if (!override) return 'default';
  return override.startsWith('+') ? 'enabled' : 'disabled';
}

function extensionSign(extension: PandocFormatExtension) {
  const state = extensionState(extension);
  if (state === 'default') return extension.default ? '+' : '-';
  return state === 'enabled' ? '+' : '-';
}

function extensionClass(extension: PandocFormatExtension) {
  switch (extensionState(extension)) {
    case 'enabled':
      return 'text-positive';
    case 'disabled':
      return 'text-negative';
    default:
      return 'text-grey';
  }
}

function extensionDescription(extension: string) {
  return PANDOC_EXTENSION_DESCRIPTIONS[extension];
}

function toggleExtension(extension: PandocFormatExtension): void {
  const index = selectedExtensions.value.findIndex(
    (value) => value.slice(1) === extension.name,
  );
  if (index >= 0) {
    selectedExtensions.value = selectedExtensions.value.filter(
      (_, valueIndex) => valueIndex !== index,
    );
  } else {
    const sign = extension.default ? '-' : '+';
    selectedExtensions.value = [
      ...selectedExtensions.value,
      `${sign}${extension.name}`,
    ];
  }
}

function apply(): void {
  emit('update:modelValue', selectedFormat.value);
  emit('update:formatExtensions', selectedExtensions.value);
  dialogOpen.value = false;
}
</script>

<style scoped>
.pandoc-format-editor {
  flex: 1 1 18rem;
  min-width: 18rem;
}

.pandoc-format-editor--selected {
  border: 2px solid var(--q-primary);
  background-color: color-mix(in srgb, var(--q-primary) 10%, transparent);
}

.pandoc-format-editor__dialog {
  width: min(42rem, 95vw);
}

.pandoc-format-editor__extensions {
  max-height: 28rem;
  overflow-y: auto;
}

.pandoc-format-editor__extension-sign {
  min-width: 1.5rem;
}
</style>
