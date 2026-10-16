<template>
  <div>
    <div class="text-subtitle1 q-mb-sm">{{ $t('configEditor.projectConfigurations.title') }}</div>
    <q-list
      bordered
      dense
      class="q-mb-lg inherited-configurations-editor__inherited-list"
      :class="{ 'inherited-configurations-editor__inherited-list--empty': modelValue.length === 0 }"
    >
      <q-item v-if="modelValue.length === 0">
        <q-item-section class="text-grey">{{ $t('configEditor.projectConfigurations.noneSelected') }}</q-item-section>
      </q-item>
      <q-item
        v-for="(configurationName, index) in modelValue"
        :key="configurationName"
        dense
        draggable="true"
        class="inherited-configurations-editor__inherited-item"
        @dragstart="startDragging(index, $event)"
        @dragover.prevent
        @drop="dropConfiguration(index)"
      >
        <q-item-section avatar class="inherited-configurations-editor__drag-handle">
          <q-icon name="drag_handle" />
        </q-item-section>
        <q-item-section>{{ configurationName }}</q-item-section>
        <q-item-section side>
          <q-btn flat round dense size="sm" icon="remove" :title="$t('configEditor.projectConfigurations.remove')"
            @click="removeConfiguration(index)" />
        </q-item-section>
      </q-item>
    </q-list>

    <div class="text-subtitle1 q-mb-sm">{{ $t('configEditor.projectConfigurations.available') }}</div>
    <q-list bordered separator dense class="inherited-configurations-editor__available-list">
      <q-item v-if="availableConfigurations.length === 0">
        <q-item-section class="text-grey">{{ $t('configEditor.projectConfigurations.noneAvailable') }}</q-item-section>
      </q-item>
      <q-item
        v-for="configuration in availableConfigurations"
        :key="configuration.name"
        dense
        :disable="modelValue.includes(configuration.name)"
        @dblclick="addConfiguration(configuration.name)"
      >
        <q-item-section>
          <q-item-label>{{ configuration.name }}</q-item-label>
          <q-item-label v-if="configuration.description" caption>
            {{ configuration.description }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn flat round dense size="sm" icon="add" :title="$t('configEditor.projectConfigurations.add')"
            :disable="modelValue.includes(configuration.name)"
            @click="addConfiguration(configuration.name)" />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ConfigurationSummary } from '../../common'
import { useBackend } from '../../stores'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const availableConfigurations = ref<ConfigurationSummary[]>([])
const draggedConfigurationIndex = ref<number>()
const backend = useBackend()

onMounted(async () => {
  availableConfigurations.value = await backend.backend?.availableConfigurations() || []
})

function addConfiguration(name: string) {
  if (!props.modelValue.includes(name)) {
    emit('update:modelValue', [...props.modelValue, name])
  }
}

function removeConfiguration(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function startDragging(index: number, event: DragEvent) {
  draggedConfigurationIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function dropConfiguration(targetIndex: number) {
  const sourceIndex = draggedConfigurationIndex.value
  draggedConfigurationIndex.value = undefined
  if (sourceIndex === undefined || sourceIndex === targetIndex) return
  const reordered = [...props.modelValue]
  const [moved] = reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, moved)
  emit('update:modelValue', reordered)
}
</script>

<style scoped>
.inherited-configurations-editor__available-list {
  max-height: 14rem;
  overflow-y: auto;
}

.inherited-configurations-editor__inherited-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
}

.inherited-configurations-editor__inherited-list--empty {
  display: block;
}

.inherited-configurations-editor__inherited-item {
  min-width: 10rem;
  cursor: grab;
}

.inherited-configurations-editor__inherited-item:active {
  cursor: grabbing;
}

.inherited-configurations-editor__drag-handle {
  min-width: 1.5rem;
  padding-right: 0;
}
</style>
