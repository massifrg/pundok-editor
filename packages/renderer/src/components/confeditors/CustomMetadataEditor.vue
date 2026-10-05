<template>
  <div class="custom-metadata-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.customMetadata.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.customMetadata.newMetadata')"
        @click="newMetadata"
      />
    </div>

    <q-list v-if="allMetadata.length" bordered separator>
      <q-item
        v-for="metadata in allMetadata"
        :key="metadata.name"
        dense
        :class="{
          'text-grey-7': isInherited(metadata),
        }"
        :style="{ backgroundColor: inheritedBackground(metadata.name) }"
      >
        <q-item-section>
          <q-item-label class="text-weight-bold" :class="{ 'text-strike': isRemoved(metadata.name) }">{{ metadata.name }}</q-item-label>
          <q-item-label caption>{{ metadata.type }}</q-item-label>
          <q-item-label v-if="metadata.description" caption>{{
            metadata.description
          }}</q-item-label>
          <q-item-label v-if="isInherited(metadata)" caption>
            {{ $t('configEditor.inheritedFrom', { name: inheritedSource(metadata.name) }) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            v-if="isInherited(metadata)"
            dense
            flat
            round
            icon="content_copy"
            :title="$t('configEditor.customMetadata.copyMetadata')"
            @click="copyInheritedMetadata(metadata)"
          />
          <template v-else>
            <q-btn
              dense
              flat
              round
              icon="edit"
              :title="$t('configEditor.customMetadata.editMetadata')"
              @click="editMetadata(metadata.name)"
            />
            <q-btn
              dense
              flat
              round
              icon="remove"
              :title="$t('configEditor.customMetadata.deleteMetadata')"
              @click="deleteMetadata(metadata.name)"
            />
          </template>
          <q-toggle
            v-if="isInherited(metadata)"
            :model-value="isRemoved(metadata.name)"
            color="primary"
            :icon="mdiEyeOff"
            :title="$t('configEditor.removeInherited', { name: metadata.name })"
            @update:model-value="setRemoved(metadata.name, $event)"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.customMetadata.none') }}
    </div>

    <q-dialog :model-value="!!draft" @hide="cancelEdit">
      <q-card
        v-if="draft"
        flat
        bordered
        class="q-mt-md"
        style="width: 80vw; max-width: 80vw"
      >
        <q-card-section class="q-gutter-md">
          <div class="text-subtitle2">
            {{
              $t(
                editingName === undefined
                  ? 'configEditor.customMetadata.newTitle'
                  : 'configEditor.customMetadata.editTitle',
              )
            }}
          </div>
          <q-input
            v-model="draft.name"
            outlined
            dense
            :label="$t('configEditor.customMetadata.name')"
            :readonly="editingName !== undefined"
            :error="!!nameError"
            :error-message="nameError"
          />
          <q-input
            v-model="draft.description"
            outlined
            dense
            type="textarea"
            autogrow
            :label="$t('configEditor.customMetadata.descriptionLabel')"
          />
          <q-select
            v-model="draft.type"
            outlined
            dense
            emit-value
            map-options
            :options="typeOptions"
            :label="$t('configEditor.customMetadata.type')"
          />
          <q-input
            v-model="draft.defaultValue"
            outlined
            dense
            type="textarea"
            autogrow
            :label="$t('configEditor.customMetadata.default')"
            :error="!!defaultError"
            :error-message="defaultError"
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
            :disable="!draft.name.trim()"
            @click="applyEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiEyeOff } from '@mdi/js';
import type { CustomMetadata, MetaValueName } from '../../common';

type MetadataDraft = {
  name: string;
  description: string;
  type: MetaValueName;
  defaultValue: string;
};

const props = defineProps<{
  modelValue: CustomMetadata[];
  inherited?: CustomMetadata[];
  removed?: string[];
  provenance?: Record<string, string>;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: CustomMetadata[]];
  'update:removed': [value: string[]];
}>();

const metadata = ref<CustomMetadata[]>([]);
const draft = ref<MetadataDraft>();
const editingName = ref<string>();
const nameError = ref('');
const defaultError = ref('');
const typeOptions = [
  'MetaBool',
  'MetaString',
  'MetaInlines',
  'MetaBlocks',
  'MetaList',
  'MetaMap',
].map((value) => ({ label: value, value: value as MetaValueName }));

const allMetadata = computed(() => {
  const inherited = (props.inherited || [])
    .filter((item) => !metadata.value.some((local) => local.name === item.name))
    .sort((first, second) =>
      inheritedSource(first.name).localeCompare(inheritedSource(second.name)),
    );
  return [...metadata.value, ...inherited];
});

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) metadata.value = value.map(copyMetadata);
  },
  { immediate: true },
);

function newMetadata(): void {
  editingName.value = undefined;
  nameError.value = '';
  defaultError.value = '';
  draft.value = {
    name: '',
    description: '',
    type: 'MetaString',
    defaultValue: '',
  };
}

function editMetadata(name: string): void {
  const item = metadata.value.find((value) => value.name === name);
  if (!item) return;
  editingName.value = name;
  nameError.value = '';
  defaultError.value = '';
  draft.value = {
    name: item.name,
    description: item.description || '',
    type: item.type,
    defaultValue:
      item.default === undefined ? '' : JSON.stringify(item.default, null, 2),
  };
}

function copyInheritedMetadata(item: CustomMetadata): void {
  metadata.value = [...metadata.value, copyMetadata(item)];
  emitMetadata();
}

function isInherited(item: CustomMetadata): boolean {
  return (
    !metadata.value.some((value) => value.name === item.name) &&
    (props.inherited || []).some((value) => value.name === item.name)
  );
}

function isRemoved(name: string): boolean {
  return (props.removed || []).includes(name);
}

function inheritedSource(name: string): string {
  return props.provenance?.[name] || '';
}

function inheritedBackground(name: string): string | undefined {
  const source = inheritedSource(name);
  if (!source) return undefined;
  const sources = [...new Set(Object.values(props.provenance || {}))];
  const colors = ['#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec', '#f1f8e9'];
  return colors[Math.max(0, sources.indexOf(source) % colors.length)];
}

function setRemoved(name: string, value: boolean | null): void {
  const names = new Set(props.removed || []);
  if (value) names.add(name);
  else names.delete(name);
  emit('update:removed', [...names]);
}

function deleteMetadata(name: string): void {
  metadata.value = metadata.value.filter((item) => item.name !== name);
  emitMetadata();
  if (editingName.value === name) cancelEdit();
}

function cancelEdit(): void {
  draft.value = undefined;
  editingName.value = undefined;
  nameError.value = '';
  defaultError.value = '';
}

function applyEdit(): void {
  if (!draft.value) return;
  const name = draft.value.name.trim();
  if (!name) {
    nameError.value = 'Name is required';
    return;
  }
  if (
    metadata.value.some(
      (item) => item.name === name && item.name !== editingName.value,
    )
  ) {
    nameError.value = 'Name is already used';
    return;
  }
  let defaultValue: unknown;
  if (draft.value.defaultValue.trim()) {
    try {
      defaultValue = JSON.parse(draft.value.defaultValue);
    } catch {
      defaultError.value = 'Enter valid JSON.';
      return;
    }
  }
  const item: CustomMetadata = {
    name,
    type: draft.value.type,
    ...(draft.value.description.trim() && {
      description: draft.value.description.trim(),
    }),
    ...(draft.value.defaultValue.trim() && { default: defaultValue }),
  };
  const updated = metadata.value.filter(
    (value) => value.name !== editingName.value,
  );
  metadata.value = [...updated, item];
  emitMetadata();
  cancelEdit();
}

function copyMetadata(item: CustomMetadata): CustomMetadata {
  return {
    ...item,
    ...(item.default !== undefined && {
      default: JSON.parse(JSON.stringify(item.default)),
    }),
  };
}

function emitMetadata(): void {
  emit('update:modelValue', metadata.value.map(copyMetadata));
}
</script>
