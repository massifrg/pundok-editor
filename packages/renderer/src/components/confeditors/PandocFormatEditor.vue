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
        <PandocFormatExtensionsEditor
          v-if="selectedFormat"
          v-model="selectedExtensions"
          :format="selectedFormat"
        />
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
import { useBackend } from '../../stores';
import PandocFormatExtensionsEditor from './PandocFormatExtensionsEditor.vue';

const props = defineProps<{
  modelValue: string;
  formatExtensions: string[];
  selected: boolean;
  direction?: 'input' | 'output';
}>();
defineOptions({ components: { PandocFormatExtensionsEditor } });

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

watch(dialogOpen, (open) => {
  if (!open) return;
  selectedFormat.value = props.modelValue;
  selectedExtensions.value = [...props.formatExtensions];
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
