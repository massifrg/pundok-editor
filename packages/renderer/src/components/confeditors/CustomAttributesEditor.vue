<template>
  <div class="custom-attributes-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.customAttributes.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.customAttributes.newAttribute')"
        @click="newAttribute"
      />
    </div>

    <q-list v-if="allAttributes.length" bordered separator>
      <q-item
        v-for="attribute in allAttributes"
        :key="attribute.name"
        dense
        :class="{
          'bg-grey-2': isInherited(attribute),
          'text-grey-7': isInherited(attribute),
        }"
      >
        <q-item-section>
          <q-item-label class="row items-center no-wrap">
            <span>{{ attribute.name }}</span>
            <q-space />
            <span class="text-caption text-grey-7">{{
              appliesToLabel(attribute.appliesTo)
            }}</span>
          </q-item-label>
          <q-item-label v-if="attribute.description" caption>
            {{ attribute.description }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row no-wrap q-gutter-xs">
            <q-btn
              v-if="isInherited(attribute)"
              dense
              flat
              round
              icon="content_copy"
              :title="$t('configEditor.customAttributes.copyAttribute')"
              @click="copyInheritedAttribute(attribute)"
            />
            <template v-else>
              <q-btn
                dense
                flat
                round
                icon="edit"
                :title="$t('configEditor.customAttributes.editAttribute')"
                @click="editAttribute(attribute.name)"
              />
              <q-btn
                dense
                flat
                round
                icon="remove"
                :title="$t('configEditor.customAttributes.deleteAttribute')"
                @click="deleteAttribute(attribute.name)"
              />
            </template>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.customAttributes.none') }}
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
                editingIndex === undefined
                  ? 'configEditor.customAttributes.newTitle'
                  : 'configEditor.customAttributes.editTitle',
              )
            }}
          </div>
          <q-input
            v-model="draft.name"
            outlined
            dense
            :label="$t('configEditor.customAttributes.name')"
            :error="!!nameError"
            :error-message="$t(nameError)"
          />
          <q-input
            v-model="draft.description"
            outlined
            dense
            type="textarea"
            autogrow
            :label="$t('configEditor.customAttributes.descriptionLabel')"
          />
          <q-select
            v-model="draft.appliesTo"
            :options="appliesToOptions"
            multiple
            emit-value
            map-options
            outlined
            dense
            :label="$t('configEditor.customAttributes.appliesTo')"
          >
            <template #selected-item="scope">
              <q-chip
                dense
                removable
                icon-remove="remove_item"
                @remove="scope.removeAtIndex(scope.index)"
              >
                {{ scope.opt.label }}
              </q-chip>
            </template>
          </q-select>
          <q-toggle
            v-model="listKind"
            true-value="values"
            false-value="suggestions"
            :label="$t(`configEditor.customAttributes.${listKind}`)"
          />
          <div class="row q-col-gutter-sm items-start">
            <q-input
              v-model="newListItem"
              class="col"
              outlined
              dense
              :label="$t('configEditor.customAttributes.addListItem')"
              @keyup.enter="addListItem"
            />
            <div class="col-auto">
              <q-btn
                dense
                icon="add"
                :disable="!newListItem.trim()"
                :title="$t('configEditor.customAttributes.addListItem')"
                @click="addListItem"
              />
            </div>
          </div>
          <div class="custom-attributes-editor__list">
            <q-chip
              v-for="item in listItems"
              :key="item"
              removable
              @remove="removeListItem(item)"
            >
              {{ item }}
            </q-chip>
          </div>
          <q-input
            v-model="draft.default"
            outlined
            dense
            :label="$t('configEditor.customAttributes.default')"
            :error="defaultInvalid"
            :error-message="
              $t('configEditor.customAttributes.defaultMustBeValue')
            "
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
            :disable="!canApply"
            :label="$t('configEditor.buttons.apply')"
            @click="applyEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CustomAttribute } from '../../common';
import { HasPandocAttr } from '../../common';

type AttributeDraft = Omit<CustomAttribute, 'description' | 'appliesTo'> & {
  description: string;
  appliesTo: (keyof typeof HasPandocAttr)[];
};

type ListKind = 'suggestions' | 'values';

const props = defineProps<{
  modelValue: CustomAttribute[];
  inherited?: CustomAttribute[];
}>();
const emit = defineEmits<{
  'update:modelValue': [value: CustomAttribute[]];
}>();

const attributes = ref<CustomAttribute[]>([]);
const draft = ref<AttributeDraft>();
const editingIndex = ref<number>();
const nameError = ref('');
const listKind = ref<ListKind>('suggestions');
const listItems = ref<string[]>([]);
const newListItem = ref('');

const allAttributes = computed(() => [
  ...attributes.value,
  ...(props.inherited || []).filter(
    (item) => !attributes.value.some((local) => local.name === item.name),
  ),
]);

function isInherited(attribute: CustomAttribute): boolean {
  return (
    !attributes.value.some(({ name }) => name === attribute.name) &&
    (props.inherited || []).some(({ name }) => name === attribute.name)
  );
}

function appliesToLabel(appliesTo: CustomAttribute['appliesTo']): string {
  return appliesTo?.length ? appliesTo.join(', ') : '*';
}

function copyInheritedAttribute(attribute: CustomAttribute): void {
  attributes.value = [...attributes.value, copyAttribute(attribute)];
  emitAttributes();
}

const appliesToOptions = Object.entries(HasPandocAttr).map(
  ([value, label]) => ({
    value: value as keyof typeof HasPandocAttr,
    label: `${value} (${label})`,
  }),
);
const defaultInvalid = computed(
  () =>
    listKind.value === 'values' &&
    !!draft.value?.default &&
    !listItems.value.includes(draft.value.default),
);
const canApply = computed(
  () => !!draft.value?.name.trim() && !defaultInvalid.value,
);

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) attributes.value = value.map(copyAttribute);
  },
  { immediate: true },
);

watch(listKind, (kind, previousKind) => {
  if (
    kind === 'values' &&
    previousKind === 'suggestions' &&
    draft.value?.default &&
    !listItems.value.includes(draft.value.default)
  ) {
    draft.value.default = undefined;
  }
});

function newAttribute(): void {
  editingIndex.value = undefined;
  nameError.value = '';
  listKind.value = 'suggestions';
  listItems.value = [];
  newListItem.value = '';
  draft.value = { name: '', description: '', appliesTo: [] };
}

function editAttribute(name: string): void {
  const index = attributes.value.findIndex(
    (attribute) => attribute.name === name,
  );
  if (index < 0) return;
  editingIndex.value = index;
  nameError.value = '';
  const attribute = attributes.value[index];
  draft.value = {
    ...copyAttribute(attribute),
    description: attribute.description || '',
    appliesTo: [...(attribute.appliesTo || [])],
  };
  listKind.value = attribute.values ? 'values' : 'suggestions';
  listItems.value = [...(attribute.values || attribute.suggestions || [])];
  newListItem.value = '';
}

function addListItem(): void {
  const item = newListItem.value.trim();
  if (!item || listItems.value.includes(item)) return;
  listItems.value = [...listItems.value, item];
  newListItem.value = '';
}

function removeListItem(item: string): void {
  listItems.value = listItems.value.filter((value) => value !== item);
}

function deleteAttribute(name: string): void {
  attributes.value = attributes.value.filter(
    (attribute) => attribute.name !== name,
  );
  emitAttributes();
  if (draft.value?.name === name) cancelEdit();
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
    nameError.value = 'configEditor.customAttributes.nameRequired';
    return;
  }
  if (
    attributes.value.some(
      (attribute, index) =>
        index !== editingIndex.value && attribute.name === name,
    )
  ) {
    nameError.value = 'configEditor.customAttributes.duplicateName';
    return;
  }
  const attribute: CustomAttribute = {
    name,
    ...(draft.value.description.trim() && {
      description: draft.value.description.trim(),
    }),
    ...(draft.value.appliesTo.length && {
      appliesTo: [...draft.value.appliesTo],
    }),
    ...(draft.value.default && { default: draft.value.default }),
    ...(listItems.value.length && { [listKind.value]: [...listItems.value] }),
  };
  const updated = attributes.value.map(copyAttribute);
  if (editingIndex.value === undefined) updated.push(attribute);
  else updated.splice(editingIndex.value, 1, attribute);
  attributes.value = updated;
  emitAttributes();
  cancelEdit();
}

function copyAttribute(attribute: CustomAttribute): CustomAttribute {
  return {
    ...attribute,
    ...(attribute.appliesTo && { appliesTo: [...attribute.appliesTo] }),
    ...(attribute.suggestions && { suggestions: [...attribute.suggestions] }),
    ...(attribute.values && { values: [...attribute.values] }),
  };
}

function emitAttributes(): void {
  emit('update:modelValue', attributes.value.map(copyAttribute));
}
</script>

<style scoped>
.custom-attributes-editor__list {
  min-height: 2.5rem;
  padding: 0.25rem;
  border: 1px solid var(--q-separator-color);
  border-radius: 4px;
}
</style>
