<template>
  <div class="automations-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.automations.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.automations.newAutomation')"
      >
        <q-menu>
          <q-list dense>
            <q-item
              v-for="type in automationTypes"
              :key="type.value"
              v-close-popup
              clickable
              @click="newAutomation(type.value)"
            >
              <q-item-section avatar>
                <q-icon :name="type.icon" :color="type.color" />
              </q-item-section>
              <q-item-section>{{ $t(type.label) }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>

    <q-list v-if="automations.length" bordered separator>
      <q-item
        v-for="{ automation, index } in sortedAutomations"
        :key="`${automation.type}-${automation.name}`"
        clickable
        @click="editAutomation(index)"
      >
        <q-item-section avatar>
          <q-icon
            :name="automationPresentation(automation.type).icon"
            :color="automationPresentation(automation.type).color"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ automation.name }}</q-item-label>
          <q-item-label caption>{{ automation.description }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="edit" />
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.automations.none') }}
    </div>

    <q-dialog :model-value="!!draft" @hide="cancelEdit">
      <q-card v-if="draft" class="automations-editor__dialog">
        <q-card-section class="q-gutter-md">
          <div class="row items-center">
            <q-icon
              class="q-mr-sm"
              size="sm"
              :name="automationPresentation(draft.type).icon"
              :color="automationPresentation(draft.type).color"
            />
            <div class="text-subtitle2">
              {{ $t(automationPresentation(draft.type).label) }}
            </div>
          </div>
          <q-input
            v-model="draft.name"
            outlined
            dense
            :label="$t('configEditor.automations.name')"
          />
          <q-input
            v-model="draft.description"
            outlined
            dense
            type="textarea"
            autogrow
            :label="$t('configEditor.automations.descriptionLabel')"
          />

          <template v-if="draft.type === 'search-replace'">
            <div class="row q-col-gutter-md items-center">
              <q-input
                v-model="draft.search"
                outlined
                dense
                class="col"
                :label="$t('search.label.searchText')"
              />
              <q-toggle
                v-model="draft.optionSearchOnly"
                class="col-auto"
                :label="$t('search.searchNotReplace')"
              />
              <ActionsOnReplaceDropdown
                v-if="draft.optionSearchOnly"
                class="col-auto"
                :editor="editor"
                :actions="draft.actions || []"
                search-only
                @update-actions="draft.actions = $event"
              />
            </div>
            <div class="row q-col-gutter-md items-center">
              <q-input
                v-if="!draft.optionSearchOnly"
                v-model="draft.replace"
                outlined
                dense
                class="col"
                :label="$t('search.label.replaceWith')"
              />
              <ActionsOnReplaceDropdown
                v-if="!draft.optionSearchOnly"
                class="col-auto"
                :editor="editor"
                :actions="draft.actions || []"
                :search-only="false"
                @update-actions="draft.actions = $event"
              />
            </div>
            <div class="row q-col-gutter-md">
              <q-toggle
                v-model="draft.optionCaseInsensitive"
                class="col-auto"
                :label="$t('search.caseInsensitive')"
              />
              <q-toggle
                v-model="draft.optionRegex"
                class="col-auto"
                :label="$t('search.regex')"
              />
              <q-toggle
                v-model="draft.optionWholeWord"
                class="col-auto"
                :label="$t('search.wholeWords')"
              />
              <q-toggle
                v-model="draft.optionCycle"
                class="col-auto"
                :label="$t('search.cycleFoundItems')"
              />
            </div>
          </template>

          <template v-else-if="draft.type === 'elements-selection'">
            <div class="row q-col-gutter-md items-center">
              <q-input
                v-model="draft.cssSelector"
                outlined
                dense
                class="col"
                :label="$t('search.label.cssSelector')"
              />
              <q-toggle
                v-model="draft.optionSearchOnly"
                class="col-auto"
                :label="$t('search.searchNotReplace')"
              />
              <ActionsOnReplaceDropdown
                v-if="draft.optionSearchOnly"
                class="col-auto"
                :editor="editor"
                :actions="draft.actions || []"
                search-only
                @update-actions="draft.actions = $event"
              />
            </div>
            <div class="row q-col-gutter-md items-center">
              <q-input
                v-if="!draft.optionSearchOnly"
                v-model="draft.replace"
                outlined
                dense
                class="col"
                :label="$t('search.label.replaceWith')"
              />
              <ActionsOnReplaceDropdown
                v-if="!draft.optionSearchOnly"
                class="col-auto"
                :editor="editor"
                :actions="draft.actions || []"
                :search-only="false"
                @update-actions="draft.actions = $event"
              />
            </div>
            <q-toggle
              v-model="draft.optionMergeSameAdjacentMarks"
              :label="$t('search.mergeAdjacentMarks')"
            />
          </template>

          <template v-else>
            <PandocFiltersEditor
              v-model="draft.filters"
              :resource-options="resourceOptions"
            />
            <q-select
              v-model="draft.withResult"
              outlined
              dense
              emit-value
              map-options
              option-label="label"
              :label="$t('configEditor.automations.withResult')"
              :options="withResultOptions"
            >
              <template #selected-item="scope">{{
                $t(scope.opt.label)
              }}</template>
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>{{ $t(scope.opt.label) }}</q-item-section>
                </q-item>
              </template>
            </q-select>
          </template>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            :label="$t('configEditor.buttons.cancel')"
            @click="cancelEdit"
          />
          <q-btn
            color="negative"
            flat
            icon="delete"
            :label="$t('configEditor.buttons.delete')"
            @click="deleteAutomation"
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
import type {
  Automation,
  AutomationType,
  ElementsSelection,
  FindResourceOptions,
  PandocFilter,
  PandocFilterTransform,
  SearchAndReplace,
  WhatToDoWithResult,
} from '../../common';
import PandocFiltersEditor from './PandocFiltersEditor.vue';
import ActionsOnReplaceDropdown from '../ActionsOnReplaceDropdown.vue';

type AutomationDraft =
  | (SearchAndReplace & { description: string })
  | (ElementsSelection & { description: string })
  | (PandocFilterTransform & { description: string });

type AutomationPresentation = {
  value: AutomationType;
  icon: string;
  color: string;
  label: string;
};

const props = defineProps<{
  modelValue: Automation[];
  editor?: object;
  resourceOptions?: Partial<FindResourceOptions>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Automation[]];
}>();

const automationTypes: AutomationPresentation[] = [
  {
    value: 'search-replace',
    icon: 'search_replace',
    color: 'primary',
    label: 'configEditor.automations.types.searchReplace',
  },
  {
    value: 'elements-selection',
    icon: 'css_selectors',
    color: 'teal',
    label: 'configEditor.automations.types.elementsSelection',
  },
  {
    value: 'pandoc-filter',
    icon: 'document_transform',
    color: 'deep-purple',
    label: 'configEditor.automations.types.pandocFilter',
  },
];

const withResultOptions: { label: string; value: WhatToDoWithResult }[] = [
  {
    label: 'configEditor.automations.withResultOptions.replace',
    value: 'replace',
  },
  {
    label: 'configEditor.automations.withResultOptions.append',
    value: 'append',
  },
  {
    label: 'configEditor.automations.withResultOptions.prepend',
    value: 'prepend',
  },
];

const automations = ref<Automation[]>([]);
const draft = ref<AutomationDraft>();
const editingIndex = ref<number>();
const sortedAutomations = computed(() =>
  automations.value
    .map((automation, index) => ({ automation, index }))
    .sort(
      ({ automation: first }, { automation: second }) =>
        automationTypes.findIndex((type) => type.value === first.type) -
          automationTypes.findIndex((type) => type.value === second.type) ||
        first.name.localeCompare(second.name),
    ),
);

watch(
  () => props.modelValue,
  (value) => {
    if (!draft.value) automations.value = value.map(copyAutomation);
  },
  { immediate: true },
);

function automationPresentation(type: AutomationType): AutomationPresentation {
  return automationTypes.find((item) => item.value === type)!;
}

function newAutomation(type: AutomationType): void {
  editingIndex.value = undefined;
  switch (type) {
    case 'search-replace':
      draft.value = {
        type,
        name: '',
        description: '',
        search: '',
        optionSearchOnly: false,
        optionCaseInsensitive: false,
        optionRegex: false,
        optionCycle: false,
        optionWholeWord: false,
      };
      break;
    case 'elements-selection':
      draft.value = {
        type,
        name: '',
        description: '',
        cssSelector: '',
        optionSearchOnly: false,
        optionMergeSameAdjacentMarks: true,
      };
      break;
    case 'pandoc-filter':
      draft.value = {
        type,
        name: '',
        description: '',
        filters: [],
        withResult: 'replace',
      };
  }
}

function editAutomation(index: number): void {
  editingIndex.value = index;
  draft.value = automationDraft(automations.value[index]);
}

function cancelEdit(): void {
  draft.value = undefined;
  editingIndex.value = undefined;
}

function deleteAutomation(): void {
  if (editingIndex.value === undefined) {
    cancelEdit();
    return;
  }
  const updated = automations.value.filter(
    (_, index) => index !== editingIndex.value,
  );
  automations.value = updated;
  emit('update:modelValue', updated.map(copyAutomation));
  cancelEdit();
}

function applyEdit(): void {
  if (!draft.value) return;
  const automation = normalizeAutomation(draft.value);
  const updated = automations.value.map(copyAutomation);
  if (editingIndex.value === undefined) updated.push(automation);
  else updated.splice(editingIndex.value, 1, automation);
  automations.value = updated;
  emit('update:modelValue', updated.map(copyAutomation));
  cancelEdit();
}

function automationDraft(automation: Automation): AutomationDraft {
  return {
    ...copyAutomation(automation),
    description: automation.description || '',
  } as AutomationDraft;
}

function copyAutomation(automation: Automation): Automation {
  if (automation.type === 'pandoc-filter') {
    const transform = automation as PandocFilterTransform;
    return {
      ...transform,
      filters: transform.filters.map(copyFilter),
    };
  }
  return { ...automation };
}

function copyFilter(filter: string | PandocFilter): string | PandocFilter {
  return typeof filter === 'string'
    ? filter
    : {
        ...filter,
        ...(filter.metadata && { metadata: { ...filter.metadata } }),
        ...(filter.variables && { variables: { ...filter.variables } }),
      };
}

function normalizeAutomation(draft: AutomationDraft): Automation {
  const base = {
    type: draft.type,
    name: draft.name.trim(),
    ...(draft.description.trim() && { description: draft.description.trim() }),
  };
  switch (draft.type) {
    case 'search-replace':
      return {
        ...base,
        type: draft.type,
        search: draft.search,
        ...(draft.optionSearchOnly ? { optionSearchOnly: true } : {}),
        ...(!draft.optionSearchOnly && draft.replace !== undefined
          ? { replace: draft.replace }
          : {}),
        ...(draft.optionCaseInsensitive ? { optionCaseInsensitive: true } : {}),
        ...(draft.optionRegex ? { optionRegex: true } : {}),
        ...(draft.optionCycle ? { optionCycle: true } : {}),
        ...(draft.optionWholeWord ? { optionWholeWord: true } : {}),
        ...(draft.actions?.length ? { actions: [...draft.actions] } : {}),
      } as SearchAndReplace;
    case 'elements-selection':
      return {
        ...base,
        type: draft.type,
        cssSelector: draft.cssSelector,
        ...(draft.optionSearchOnly ? { optionSearchOnly: true } : {}),
        ...(!draft.optionSearchOnly && draft.replace !== undefined
          ? { replace: draft.replace }
          : {}),
        ...(draft.optionMergeSameAdjacentMarks
          ? { optionMergeSameAdjacentMarks: true }
          : {}),
        ...(draft.actions?.length ? { actions: [...draft.actions] } : {}),
      } as ElementsSelection;
    case 'pandoc-filter':
      return {
        ...base,
        type: draft.type,
        filters: draft.filters.map(copyFilter),
        ...(draft.withResult ? { withResult: draft.withResult } : {}),
      } as PandocFilterTransform;
  }
}
</script>

<style scoped>
.automations-editor__dialog {
  width: min(48rem, 95vw);
  max-width: 95vw;
}
</style>
