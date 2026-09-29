<template>
  <div class="output-converters-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">{{ $t('configEditor.outputConverters.title') }}</div>
      <q-space />
      <q-btn dense icon="add" :label="$t('configEditor.outputConverters.newConverter')" @click="newConverter" />
    </div>

    <q-list v-if="converters.length > 0" bordered separator>
      <q-item v-for="converter in converters" :key="converter.name" dense>
        <q-item-section>
          <q-item-label>
            {{ converter.name }}
            <q-badge v-if="converter.default" class="q-ml-sm" color="primary">
              {{ $t('configEditor.outputConverters.default') }}
            </q-badge>
          </q-item-label>
          <q-item-label caption>{{ converter.type }} · {{ converter.format }}</q-item-label>
          <q-item-label v-if="converter.description" caption>{{ converter.description }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn dense flat round icon="edit" :title="$t('configEditor.outputConverters.editConverter')"
            @click="editConverter(converter.name)" />
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">{{ $t('configEditor.outputConverters.none') }}</div>

    <q-card v-if="draft" flat bordered class="q-mt-md">
      <q-card-section class="q-pb-sm">
        <div class="text-subtitle2">
          {{ $t(editingIndex === null
            ? 'configEditor.outputConverters.newTitle'
            : 'configEditor.outputConverters.editTitle') }}
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none q-gutter-md">
        <q-select v-model="draft.type" :options="converterTypeOptions"
          :label="$t('configEditor.outputConverters.type')" outlined dense emit-value map-options />
        <q-input v-model="draft.name" :label="$t('configEditor.outputConverters.name')" outlined dense
          :error="!!nameError" :error-message="$t(nameError)">
          <template #error>
            <q-icon name="alert_circle" size="xs" class="q-mr-xs" />
            {{ $t(nameError) }}
          </template>
        </q-input>
        <q-input v-model="draft.description" :label="$t('configEditor.outputConverters.description')" outlined dense
          type="textarea" autogrow />
        <q-checkbox v-model="draft.default" :label="$t('configEditor.outputConverters.default')" />
        <q-select v-model="draft.format" :options="outputFormats" :label="$t('configEditor.outputConverters.format')"
          outlined dense :loading="loadingFormats" @update:model-value="onFormatChanged" />
        <q-btn-dropdown v-if="draft.type === 'pandoc'" outline no-caps
          :label="$t('configEditor.outputConverters.formatExtensions')" :disable="!draft.format"
          :loading="loadingExtensions">
          <q-list dense class="output-converters-editor__extensions">
            <q-item v-if="formatExtensions.length === 0">
              <q-item-section class="text-grey">
                {{ $t('configEditor.outputConverters.noFormatExtensions') }}
              </q-item-section>
            </q-item>
            <q-item v-for="extension in formatExtensions" :key="extension.name" clickable
              @click="toggleFormatExtension(extension)">
              <q-item-section avatar class="output-converters-editor__extension-sign"
                :class="formatExtensionClass(extension)">
                {{ formatExtensionSign(extension) }}
              </q-item-section>
              <q-item-section :class="formatExtensionClass(extension)">
                {{ extension.name }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat :label="$t('configEditor.buttons.cancel')" @click="cancelEdit" />
        <q-btn color="primary" :label="$t('configEditor.buttons.apply')" :disable="!canApply" @click="applyEdit" />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type {
  BaseOutputConverter,
  OutputConverter,
  OutputConverterType,
  PandocFormatExtension,
} from '../../common'
import { useBackend } from '../../stores'

type OutputConverterDraft = Omit<
  BaseOutputConverter,
  'type' | 'description' | 'default'
> & {
  type: OutputConverterType
  description: string
  default: boolean
  filters?: string[]
  referenceFile?: string
  standalone?: boolean
  pandocTemplate?: string
  pandocOptions?: string[]
  formatExtensions?: string[]
  command?: string
  commandArgs?: string[]
}

const props = defineProps<{
  modelValue: OutputConverter[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: OutputConverter[]]
}>()

const backend = useBackend()
const converters = ref<OutputConverter[]>([])
const draft = ref<OutputConverterDraft>()
const editingIndex = ref<number>()
const nameError = ref('')
const outputFormats = ref<string[]>([])
const loadingFormats = ref(false)
const formatExtensions = ref<PandocFormatExtension[]>([])
const loadingExtensions = ref(false)
const converterTypeOptions: { label: string, value: OutputConverterType }[] = [
  { label: 'Pandoc', value: 'pandoc' },
  { label: 'Lua', value: 'lua' },
  { label: 'Custom', value: 'custom' },
  { label: 'Script', value: 'script' },
]

const canApply = computed(() =>
  !!draft.value?.name.trim() && !!draft.value?.format,
)

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) converters.value = value.map(copyConverter)
  },
  { immediate: true },
)

onMounted(async () => {
  loadingFormats.value = true
  try {
    outputFormats.value = await backend.backend?.pandocFeature('output-formats') || []
  } finally {
    loadingFormats.value = false
  }
})

function copyConverter(converter: OutputConverter): OutputConverter {
  switch (converter.type) {
    case 'pandoc':
      return {
        ...converter,
        filters: converter.filters ? [...converter.filters] : undefined,
        pandocOptions: converter.pandocOptions ? [...converter.pandocOptions] : undefined,
        formatExtensions: converter.formatExtensions ? [...converter.formatExtensions] : undefined,
      }
    case 'script':
      return {
        ...converter,
        commandArgs: [...converter.commandArgs],
      }
    default:
      return { ...converter }
  }
}

function converterDraft(converter: OutputConverter): OutputConverterDraft {
  const base = {
    ...converter,
    description: converter.description || '',
    default: converter.default === true,
  }
  switch (converter.type) {
    case 'pandoc':
      return {
        ...base,
        filters: converter.filters ? [...converter.filters] : undefined,
        pandocOptions: converter.pandocOptions ? [...converter.pandocOptions] : undefined,
        formatExtensions: converter.formatExtensions ? [...converter.formatExtensions] : undefined,
      }
    case 'script':
      return {
        ...base,
        commandArgs: [...converter.commandArgs],
      }
    default:
      return base
  }
}

function newConverter() {
  editingIndex.value = undefined
  nameError.value = ''
  draft.value = {
    type: 'pandoc',
    name: '',
    description: '',
    default: false,
    format: '',
  }
  formatExtensions.value = []
}

function editConverter(name: string) {
  const index = converters.value.findIndex((converter) => converter.name === name)
  if (index < 0) return
  editingIndex.value = index
  nameError.value = ''
  draft.value = converterDraft(converters.value[index])
  loadFormatExtensions(draft.value.format)
}

function cancelEdit() {
  draft.value = undefined
  editingIndex.value = undefined
  nameError.value = ''
}

function applyEdit() {
  if (!draft.value) return
  const name = draft.value.name.trim()
  if (!name) {
    nameError.value = 'configEditor.outputConverters.nameRequired'
    return
  }
  if (converters.value.some((converter, index) =>
    index !== editingIndex.value && converter.name === name,
  )) {
    nameError.value = 'configEditor.outputConverters.duplicateName'
    return
  }

  const converter = normalizeConverter({ ...draft.value, name })
  const updated = converters.value.map(copyConverter)
  if (editingIndex.value === undefined) updated.push(converter)
  else updated.splice(editingIndex.value, 1, converter)
  if (converter.default) {
    updated.forEach((item, index) => {
      if (index !== (editingIndex.value ?? updated.length - 1)) item.default = false
    })
  }
  converters.value = updated
  emit('update:modelValue', updated.map(copyConverter))
  cancelEdit()
}

function normalizeConverter(draft: OutputConverterDraft): OutputConverter {
  const base: Omit<BaseOutputConverter, 'type'> = {
    name: draft.name,
    format: draft.format,
    ...(draft.description ? { description: draft.description } : {}),
    ...(draft.default ? { default: true } : {}),
    ...(draft.longRendering !== undefined ? { longRendering: draft.longRendering } : {}),
    ...(draft.extension ? { extension: draft.extension } : {}),
    ...(draft.dontAskForResultFile !== undefined
      ? { dontAskForResultFile: draft.dontAskForResultFile }
      : {}),
    ...(draft.resultFile ? { resultFile: draft.resultFile } : {}),
    ...(draft.openResult ? { openResult: draft.openResult } : {}),
    ...(draft.feedback ? { feedback: draft.feedback } : {}),
    ...(draft.icon ? { icon: draft.icon } : {}),
  }
  switch (draft.type) {
    case 'pandoc':
      return {
        ...base,
        type: 'pandoc',
        ...(draft.filters ? { filters: [...draft.filters] } : {}),
        ...(draft.referenceFile ? { referenceFile: draft.referenceFile } : {}),
        ...(draft.standalone !== undefined ? { standalone: draft.standalone } : {}),
        ...(draft.pandocTemplate ? { pandocTemplate: draft.pandocTemplate } : {}),
        ...(draft.pandocOptions ? { pandocOptions: [...draft.pandocOptions] } : {}),
        ...(draft.formatExtensions ? { formatExtensions: [...draft.formatExtensions] } : {}),
      }
    case 'script':
      return {
        ...base,
        type: 'script',
        command: draft.command || '',
        commandArgs: draft.commandArgs ? [...draft.commandArgs] : [],
      }
    case 'lua':
      return { ...base, type: 'lua' }
    case 'custom':
      return { ...base, type: 'custom' }
  }
}

function onFormatChanged(format: string) {
  if (!draft.value) return
  draft.value.formatExtensions = []
  loadFormatExtensions(format)
}

async function loadFormatExtensions(format: string) {
  if (!format || !backend.backend) {
    formatExtensions.value = []
    return
  }
  loadingExtensions.value = true
  try {
    const extensions = await backend.backend.pandocFeature(
      'extensions',
      { format },
    ) as PandocFormatExtension[]
    if (draft.value?.format !== format) return
    formatExtensions.value = extensions
  } finally {
    loadingExtensions.value = false
  }
}

function formatExtensionState(extension: PandocFormatExtension) {
  const override = draft.value?.formatExtensions?.find(
    (value) => value.slice(1) === extension.name,
  )
  if (!override) return 'default'
  return override.startsWith('+') ? 'enabled' : 'disabled'
}

function formatExtensionSign(extension: PandocFormatExtension) {
  const state = formatExtensionState(extension)
  if (state === 'default') return extension.default ? '+' : '-'
  return state === 'enabled' ? '+' : '-'
}

function formatExtensionClass(extension: PandocFormatExtension) {
  switch (formatExtensionState(extension)) {
    case 'enabled':
      return 'text-positive'
    case 'disabled':
      return 'text-negative'
    default:
      return 'text-grey'
  }
}

function toggleFormatExtension(extension: PandocFormatExtension) {
  if (!draft.value) return
  const extensions = draft.value.formatExtensions || []
  const index = extensions.findIndex((value) => value.slice(1) === extension.name)
  if (index >= 0) {
    draft.value.formatExtensions = extensions.filter((_, valueIndex) => valueIndex !== index)
  } else {
    const sign = extension.default ? '-' : '+'
    draft.value.formatExtensions = [...extensions, `${sign}${extension.name}`]
  }
}
</script>

<style scoped>
.output-converters-editor__extensions {
  min-width: 16rem;
  max-height: 20rem;
  overflow-y: auto;
}

.output-converters-editor__extension-sign {
  min-width: 1.5rem;
}
</style>
