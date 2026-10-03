<template>
  <div class="custom-classes-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.customClasses.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.customClasses.newClass')"
        @click="newClass"
      />
    </div>

    <q-list v-if="allClasses.length" bordered separator>
      <q-item
        v-for="customClass in allClasses"
        :key="customClass.name"
        dense
        :class="{
          'bg-grey-2': isInherited(customClass),
          'text-grey-7': isInherited(customClass),
        }"
      >
        <q-item-section>
          <q-item-label class="row items-center no-wrap">
            <span>{{ customClass.name }}</span>
            <q-space />
            <span class="text-caption text-grey-7">{{
              appliesToLabel(customClass.appliesTo)
            }}</span>
          </q-item-label>
          <q-item-label v-if="customClass.description" caption>
            {{ customClass.description }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row no-wrap q-gutter-xs">
            <q-btn
              v-if="isInherited(customClass)"
              dense
              flat
              round
              icon="content_copy"
              :title="$t('configEditor.customClasses.copyClass')"
              @click="copyInheritedClass(customClass)"
            />
            <template v-else>
              <q-btn
                dense
                flat
                round
                icon="edit"
                :title="$t('configEditor.customClasses.editClass')"
                @click="editClass(customClass.name)"
              />
              <q-btn
                dense
                flat
                round
                icon="remove"
                :title="$t('configEditor.customClasses.deleteClass')"
                @click="deleteClass(customClass.name)"
              />
            </template>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.customClasses.none') }}
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
                  ? 'configEditor.customClasses.newTitle'
                  : 'configEditor.customClasses.editTitle',
              )
            }}
          </div>
          <q-input
            v-model="draft.name"
            outlined
            dense
            :label="$t('configEditor.customClasses.name')"
            :error="!!nameError"
            :error-message="$t(nameError)"
          />
          <q-input
            v-model="draft.description"
            outlined
            dense
            type="textarea"
            autogrow
            :label="$t('configEditor.customClasses.descriptionLabel')"
          />
          <q-select
            v-model="draft.appliesTo"
            :options="appliesToOptions"
            multiple
            emit-value
            map-options
            outlined
            dense
            :label="$t('configEditor.customClasses.appliesTo')"
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
          <q-separator />
          <CustomAttributesEditor v-model="draft.attributes" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            :label="$t('configEditor.buttons.cancel')"
            @click="cancelEdit"
          />
          <q-btn
            color="primary"
            :disable="!draft.name.trim()"
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
import type { CustomAttribute, CustomClass } from '../../common';
import { HasPandocAttr } from '../../common';
import CustomAttributesEditor from './CustomAttributesEditor.vue';

type ClassDraft = Omit<
  CustomClass,
  'description' | 'appliesTo' | 'attributes'
> & {
  description: string;
  appliesTo: (keyof typeof HasPandocAttr)[];
  attributes: CustomAttribute[];
};

const props = defineProps<{
  modelValue: CustomClass[];
  inherited?: CustomClass[];
}>();
const emit = defineEmits<{
  'update:modelValue': [value: CustomClass[]];
}>();

const classes = ref<CustomClass[]>([]);
const draft = ref<ClassDraft>();
const editingIndex = ref<number>();
const nameError = ref('');
const appliesToOptions = Object.entries(HasPandocAttr).map(
  ([value, label]) => ({
    value: value as keyof typeof HasPandocAttr,
    label: `${value} (${label})`,
  }),
);

const allClasses = computed(() => [
  ...classes.value,
  ...(props.inherited || []).filter(
    (item) => !classes.value.some((local) => local.name === item.name),
  ),
]);

function isInherited(customClass: CustomClass): boolean {
  return (
    !classes.value.some(({ name }) => name === customClass.name) &&
    (props.inherited || []).some(({ name }) => name === customClass.name)
  );
}

function appliesToLabel(appliesTo: CustomClass['appliesTo']): string {
  return appliesTo?.length ? appliesTo.join(', ') : '*';
}

function copyInheritedClass(customClass: CustomClass): void {
  classes.value = [...classes.value, copyClass(customClass)];
  emitClasses();
}

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) classes.value = value.map(copyClass);
  },
  { immediate: true },
);

function newClass(): void {
  editingIndex.value = undefined;
  nameError.value = '';
  draft.value = { name: '', description: '', appliesTo: [], attributes: [] };
}

function editClass(name: string): void {
  const index = classes.value.findIndex(
    (customClass) => customClass.name === name,
  );
  if (index < 0) return;
  editingIndex.value = index;
  nameError.value = '';
  const customClass = classes.value[index];
  draft.value = {
    ...copyClass(customClass),
    description: customClass.description || '',
    appliesTo: [...(customClass.appliesTo || [])],
    attributes: customClass.attributes
      ? customClass.attributes.map(copyAttribute)
      : [],
  };
}

function deleteClass(name: string): void {
  classes.value = classes.value.filter(
    (customClass) => customClass.name !== name,
  );
  emitClasses();
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
    nameError.value = 'configEditor.customClasses.nameRequired';
    return;
  }
  if (
    classes.value.some(
      (customClass, index) =>
        index !== editingIndex.value && customClass.name === name,
    )
  ) {
    nameError.value = 'configEditor.customClasses.duplicateName';
    return;
  }
  const customClass: CustomClass = {
    name,
    ...(draft.value.description.trim() && {
      description: draft.value.description.trim(),
    }),
    ...(draft.value.appliesTo.length && {
      appliesTo: [...draft.value.appliesTo],
    }),
    ...(draft.value.attributes.length && {
      attributes: draft.value.attributes.map(copyAttribute),
    }),
  };
  const updated = classes.value.map(copyClass);
  if (editingIndex.value === undefined) updated.push(customClass);
  else updated.splice(editingIndex.value, 1, customClass);
  classes.value = updated;
  emitClasses();
  cancelEdit();
}

function copyClass(customClass: CustomClass): CustomClass {
  return {
    ...customClass,
    ...(customClass.appliesTo && { appliesTo: [...customClass.appliesTo] }),
    ...(customClass.attributes && {
      attributes: customClass.attributes.map(copyAttribute),
    }),
  };
}

function copyAttribute(attribute: CustomAttribute): CustomAttribute {
  return {
    ...attribute,
    ...(attribute.appliesTo && { appliesTo: [...attribute.appliesTo] }),
    ...(attribute.suggestions && { suggestions: [...attribute.suggestions] }),
    ...(attribute.values && { values: [...attribute.values] }),
  };
}

function emitClasses(): void {
  emit('update:modelValue', classes.value.map(copyClass));
}
</script>
