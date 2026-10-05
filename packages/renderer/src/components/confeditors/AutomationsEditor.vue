<template>
  <div class="automations-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.automations.title') }}
      </div>
      <q-space />
      <q-btn dense icon="add" :label="$t('configEditor.automations.newAutomation')">
        <q-menu>
          <q-list dense>
            <q-item v-for="type in automationTypes" :key="type.value" v-close-popup clickable
              @click="newAutomation(type.value)">
              <q-item-section avatar>
                <q-icon :name="type.icon" :color="type.color" />
              </q-item-section>
              <q-item-section>{{ $t(type.label) }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>

    <q-list v-if="inherited.length || automations.length" bordered separator>
      <q-item v-for="{ automation, index } in sortedAutomations" :key="`${automation.type}-${automation.name}`"
        clickable @click="editAutomation(index)">
        <q-item-section avatar>
          <q-icon :name="automationPresentation(automation.type).icon"
            :color="automationPresentation(automation.type).color" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ automation.name }}</q-item-label>
          <q-item-label caption>{{ automation.description }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="edit" />
        </q-item-section>
      </q-item>
      <q-item v-for="automation in inherited" :key="`inherited-${automation.name}`" clickable
        @click="editInheritedAutomation(automation)">
        <q-item-section avatar>
          <q-icon :name="automationPresentation(automation.type).icon"
            :color="automationPresentation(automation.type).color" />
        </q-item-section>
        <q-item-section>
          <q-item-label :class="{ 'text-strike': removed.includes(automation.name) }">
            {{ automation.name }}
          </q-item-label>
          <q-item-label caption>{{ automation.description }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center no-wrap q-gutter-xs">
            <q-btn flat round dense icon="edit" :title="$t('configEditor.automations.editInherited')"
              @click.stop="editInheritedAutomation(automation)" />
            <q-toggle :model-value="removed.includes(automation.name)" color="primary" :icon="mdiEyeOff"
              :title="$t('configEditor.automations.removeInherited', { name: automation.name })"
              @click.stop @update:model-value="setRemoved(automation.name, $event)" />
          </div>
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
            <q-icon class="q-mr-sm" size="sm" :name="automationPresentation(draft.type).icon"
              :color="automationPresentation(draft.type).color" />
            <div class="text-subtitle2">
              {{ $t(automationPresentation(draft.type).label) }}
            </div>
          </div>
          <q-input v-model="draft.name" outlined dense :label="$t('configEditor.automations.name')" />
          <q-input v-model="draft.description" outlined dense type="textarea" autogrow
            :label="$t('configEditor.automations.descriptionLabel')" />
          <q-space />
          <template v-if="draft.type === 'search-replace'">
            <q-card bordered class="automations-editor__search-replace q-pa-sm">
              <q-card-section horizontal>
                <q-input v-model="draft.search" outlined dense class="col" :label="$t('search.label.searchText')" />
                <q-space class="items-spacer" />
                <q-btn round class="q-pa-sm" size="sm" icon="search_only" color="primary"
                  :outline="!draft.optionSearchOnly" :title="$t('search.searchNotReplace')"
                  @click="draft.optionSearchOnly = !draft.optionSearchOnly" />
              </q-card-section>
              <q-card-section horizontal class="q-mt-xs">
                <ActionsOnReplaceDropdown v-if="draft.optionSearchOnly" class="col-auto" :editor="editor"
                  :actions="draft.actions || []" :search-only="true" @update-actions="draft.actions = $event"
                  :title="$t('search.actions.onFoundItems', 2)" />
              </q-card-section>
              <q-card-section horizontal class="q-mt-xs">
                <q-input v-if="!draft.optionSearchOnly" v-model="draft.replace" outlined dense class="col"
                  :label="$t('search.label.replaceWith')" />
                <q-space class="items-spacer" />
                <ActionsOnReplaceDropdown v-if="!draft.optionSearchOnly" class="col-auto" :editor="editor"
                  :actions="draft.actions || []" :search-only="false" @update-actions="draft.actions = $event"
                  :title="$t('search.actions.onReplacedItems', 2)" />
              </q-card-section>
              <q-card-section horizontal class="q-mt-sm">
                <q-btn round class="q-pa-sm" size="sm" icon="search_case_insensitive" color="primary"
                  :outline="!draft.optionCaseInsensitive" :title="$t('search.caseInsensitive')" @click="
                    draft.optionCaseInsensitive = !draft.optionCaseInsensitive
                    " />
                <q-space class="items-spacer" />
                <q-btn round class="q-pa-sm" size="sm" icon="regex" color="primary" :outline="!draft.optionRegex"
                  :title="$t('search.regex')" @click="draft.optionRegex = !draft.optionRegex" />
                <q-space class="items-spacer" />
                <q-btn round class="q-pa-sm" size="sm" icon="whole_word" color="primary"
                  :outline="!draft.optionWholeWord" :title="$t('search.wholeWords')"
                  @click="draft.optionWholeWord = !draft.optionWholeWord" />
                <q-space class="items-spacer" />
                <q-btn round class="q-pa-sm" size="sm" icon="search_cycle" color="primary" :outline="!draft.optionCycle"
                  :title="$t('search.cycleFoundItems')" @click="draft.optionCycle = !draft.optionCycle" />
                <q-space class="items-spacer" />
                <MarksPaletteDropdown :editor="editor" icon="search_filter" :addable-marks="availableMarks"
                  :positive-marks="filterMarkPresence" :negative-marks="filterMarkAbsence"
                  @selected-marks="setMarksFilters" />
              </q-card-section>
            </q-card>
          </template>

          <template v-else-if="draft.type === 'elements-selection'">
            <q-card bordered class="automations-editor__elements-selection q-pa-sm">
              <q-card-section horizontal>
                <q-input v-model="draft.cssSelector" outlined dense class="col"
                  :label="$t('search.label.cssSelector')" />
                <q-space class="items-spacer" />
                <q-btn class="q-ma-xs" size="sm" round color="primary" :outline="!draft.optionMergeSameAdjacentMarks"
                  icon="marks_merge" :title="$t('search.mergeAdjacentMarks')"
                  @click="draft.optionMergeSameAdjacentMarks = !draft.optionMergeSameAdjacentMarks" />
                <q-space class="items-spacer" />
                <q-btn round class="q-ma-xs" size="sm" icon="search_only" color="primary"
                  :outline="!draft.optionSearchOnly" :title="$t('search.searchNotReplace')"
                  @click="draft.optionSearchOnly = !draft.optionSearchOnly" />
                <ActionsOnReplaceDropdown v-if="draft.optionSearchOnly" class="col-auto" :editor="editor"
                  :actions="draft.actions || []" :search-only="true" @update-actions="draft.actions = $event"
                  :title="$t('search.actions.onFoundItems', 2)" />
              </q-card-section>
              <q-card-section horizontal class="q-mt-sm">
                <q-input v-if="!draft.optionSearchOnly" v-model="draft.replace" outlined dense class="col"
                  :label="$t('search.label.replaceWith')" />
                <q-space class="items-spacer" />
                <ActionsOnReplaceDropdown v-if="!draft.optionSearchOnly" class="col-auto" :editor="editor"
                  :actions="draft.actions || []" :search-only="false" @update-actions="draft.actions = $event"
                  :title="$t('search.actions.onReplacedItems', 2)" />
              </q-card-section>
            </q-card>
          </template>

          <template v-else>
            <PandocFiltersEditor v-model="draft.filters" :resource-options="resourceOptions" />
            <q-select v-model="draft.withResult" outlined dense emit-value map-options option-label="label"
              :label="$t('configEditor.automations.withResult')" :options="withResultOptions">
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
          <q-btn flat :label="$t('configEditor.buttons.cancel')" @click="cancelEdit" />
          <q-btn color="negative" flat icon="delete" :label="$t('configEditor.buttons.delete')"
            @click="deleteAutomation" />
          <q-btn color="primary" :disable="!draft.name.trim()" :label="$t('configEditor.buttons.apply')"
            @click="applyEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiEyeOff } from '@mdi/js';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import type { Editor } from '@tiptap/vue-3';
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
import { getEditorConfiguration } from '../../schema';
import {
  type AddableMark,
  baseAddableMarks,
  customStylesToAddableMarks,
  searchMarkSpecToAddableMarks,
} from '../helpers/addableMark';
import MarksPaletteDropdown from '../MarksPaletteDropdown.vue';
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
  inherited?: Automation[];
  removed?: string[];
  editor?: object;
  resourceOptions?: Partial<FindResourceOptions>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Automation[]];
  'update:removed': [value: string[]];
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
const inherited = computed(() => props.inherited || []);
const removed = computed(() => props.removed || []);
const draft = ref<AutomationDraft>();
const editingIndex = ref<number>();
const editingInheritedName = ref<string>();
const { t } = useI18n();
const $q = useQuasar();
const configuration = computed(() =>
  props.editor ? getEditorConfiguration(props.editor as Editor) : undefined,
);
const availableMarks = computed<AddableMark[]>(() => {
  const marks = baseAddableMarks();
  customStylesToAddableMarks(
    configuration.value?.customStylesInstances || [],
    undefined,
    marks,
  );
  return marks;
});
const filterMarkPresence = computed<AddableMark[]>(() =>
  searchFilterMarks('present'),
);
const filterMarkAbsence = computed<AddableMark[]>(() =>
  searchFilterMarks('absent'),
);
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
  editingInheritedName.value = undefined;
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
  editingInheritedName.value = undefined;
  draft.value = automationDraft(automations.value[index]);
}

function cancelEdit(): void {
  draft.value = undefined;
  editingIndex.value = undefined;
  editingInheritedName.value = undefined;
}

function deleteAutomation(): void {
  if (editingInheritedName.value) {
    setRemoved(editingInheritedName.value, true);
    cancelEdit();
    return;
  }
  if (editingIndex.value === undefined) {
    cancelEdit();
    return;
  }
  const automationName = automations.value[editingIndex.value].name;
  $q.dialog({
    title: t('configEditor.automations.deleteConfirmation.title'),
    message: t('configEditor.automations.deleteConfirmation.message', {
      name: automationName,
    }),
    ok: t('configEditor.buttons.delete'),
    cancel: t('configEditor.buttons.cancel'),
    persistent: true,
  }).onOk(() => {
    if (editingIndex.value === undefined) return;
    const updated = automations.value.filter(
      (_, index) => index !== editingIndex.value,
    );
    automations.value = updated;
    emit('update:modelValue', updated.map(copyAutomation));
    cancelEdit();
  });
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

function setRemoved(name: string, value: boolean | null): void {
  const names = new Set(removed.value);
  if (value) names.add(name);
  else names.delete(name);
  emit('update:removed', [...names]);
}

function editInheritedAutomation(automation: Automation): void {
  editingIndex.value = undefined;
  editingInheritedName.value = automation.name;
  draft.value = automationDraft(automation);
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

function searchFilterMarks(kind: 'present' | 'absent'): AddableMark[] {
  if (draft.value?.type !== 'search-replace' || !props.editor) return [];
  return searchMarkSpecToAddableMarks(
    draft.value.filterOnMarks?.[kind] || [],
    (props.editor as Editor).state.schema,
    configuration.value,
  );
}

function setMarksFilters(present: AddableMark[], absent: AddableMark[]): void {
  if (draft.value?.type !== 'search-replace') return;
  const positive = present.map((mark) => mark.markspec);
  const negative = absent.map((mark) => mark.markspec);
  draft.value.filterOnMarks =
    positive.length || negative.length
      ? {
        present: positive,
        absent: negative,
      }
      : undefined;
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
        ...(draft.filterOnMarks && { filterOnMarks: draft.filterOnMarks }),
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

.automations-editor__search-replace,
.automations-editor__elements-selection {
  border-color: var(--q-primary);
}

.items-spacer {
  min-width: 1rem;
  max-width: 1.5rem;
}
</style>
