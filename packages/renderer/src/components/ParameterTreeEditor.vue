<template>
  <div class="parameter-tree-editor">
    <div v-if="!nested" class="parameter-tree-editor__header row items-center">
      <div v-if="label" class="text-caption text-weight-medium text-grey-8">
        {{ label }}
      </div>
      <q-space />
      <q-btn-toggle
        v-model="editMode"
        dense
        unelevated
        toggle-color="primary"
        class="parameter-tree-editor__mode"
        :options="editModeOptions"
      />
      <template v-if="editMode === 'tree'">
        <q-input
          v-model="search"
          dense
          borderless
          class="parameter-tree-editor__search"
          :placeholder="$t('parameterTree.search')"
          :aria-label="$t('parameterTree.search')"
        >
          <template #prepend>
            <q-icon name="search" size="xs" />
          </template>
          <template v-if="search" #append>
            <q-icon
              name="close"
              size="xs"
              class="cursor-pointer"
              @click="search = ''"
            />
          </template>
        </q-input>
        <q-btn
          dense
          flat
          size="sm"
          icon="unfold_more"
          :title="$t('parameterTree.expandAll')"
          @click="expandAll"
        />
        <q-btn
          dense
          flat
          size="sm"
          icon="unfold_less"
          :title="$t('parameterTree.collapseAll')"
          @click="collapseAll"
        />
      </template>
    </div>

    <q-input
      v-if="!nested && editMode === 'text'"
      :model-value="textValue"
      type="textarea"
      outlined
      autogrow
      class="parameter-tree-editor__text"
      :label="$t('parameterTree.json')"
      :error="!!textError"
      :error-message="textError"
      @update:model-value="updateText(String($event ?? ''))"
    />
    <div v-else class="parameter-tree-editor__tree">
      <div v-if="isContainer(modelValue)" class="parameter-tree-editor__brace">
        {{ openingBrace }}
      </div>
      <div v-else class="parameter-tree-editor__root-row">
        <q-select
          :model-value="valueType(modelValue)"
          dense
          borderless
          emit-value
          map-options
          :options="typeOptions"
          class="parameter-tree-editor__type"
          :aria-label="$t('parameterTree.type')"
          @update:model-value="changeRootType($event)"
        />
        <q-input
          v-if="typeof modelValue === 'string'"
          :model-value="modelValue"
          dense
          borderless
          class="parameter-tree-editor__value parameter-tree-editor__value--string"
          @update:model-value="emit('update:modelValue', String($event ?? ''))"
        />
        <q-input
          v-else-if="typeof modelValue === 'number'"
          :model-value="modelValue"
          type="number"
          dense
          borderless
          class="parameter-tree-editor__value parameter-tree-editor__value--number"
          @update:model-value="emit('update:modelValue', Number($event))"
        />
        <q-checkbox
          v-else-if="typeof modelValue === 'boolean'"
          :model-value="modelValue"
          dense
          @update:model-value="emit('update:modelValue', $event === true)"
        />
        <span v-else class="parameter-tree-editor__null">null</span>
      </div>
      <div
        v-for="([key, value], index) in visibleEntries"
        :key="index"
        class="parameter-tree-editor__node"
      >
        <div
          class="parameter-tree-editor__row"
          :class="{ 'parameter-tree-editor__row--match': matches(key, value) }"
        >
          <q-btn
            v-if="isContainer(value)"
            dense
            flat
            round
            size="sm"
            :icon="isExpanded(key) ? 'arrow_drop_down' : 'chevron_right'"
            class="parameter-tree-editor__toggle"
            :title="
              $t(
                isExpanded(key)
                  ? 'parameterTree.collapse'
                  : 'parameterTree.expand',
              )
            "
            @click="toggle(key)"
          />
          <span v-else class="parameter-tree-editor__toggle-placeholder" />

          <q-input
            v-if="isObject(modelValue)"
            :model-value="key"
            dense
            borderless
            class="parameter-tree-editor__key"
            :input-style="{ width: `${Math.max(8, key.length + 1)}ch` }"
            :aria-label="$t('parameterTree.key')"
            @update:model-value="renameEntry(key, $event)"
          />
          <span v-else class="parameter-tree-editor__index">[{{ key }}]</span>
          <span class="parameter-tree-editor__colon">:</span>

          <q-input
            v-if="typeof value === 'string'"
            :model-value="value"
            dense
            borderless
            class="parameter-tree-editor__value parameter-tree-editor__value--string"
            :aria-label="$t('parameterTree.value')"
            @update:model-value="changeValue(key, String($event ?? ''))"
          />
          <q-checkbox
            v-else-if="typeof value === 'boolean'"
            :model-value="value"
            dense
            class="parameter-tree-editor__value parameter-tree-editor__value--boolean"
            :aria-label="$t('parameterTree.value')"
            @update:model-value="changeValue(key, $event === true)"
          />
          <q-input
            v-else-if="typeof value === 'number'"
            :model-value="value"
            type="number"
            dense
            borderless
            class="parameter-tree-editor__value parameter-tree-editor__value--number"
            :aria-label="$t('parameterTree.value')"
            @update:model-value="changeValue(key, Number($event))"
          />
          <span v-else-if="value === null" class="parameter-tree-editor__null">
            null
          </span>
          <button
            v-else
            type="button"
            class="parameter-tree-editor__summary"
            @click="toggle(key)"
          >
            {{ Array.isArray(value) ? '[' : '{' }}
            {{ Object.keys(value).length }} {{ $t('parameterTree.items') }}
            {{ Array.isArray(value) ? ']' : '}' }}
          </button>

          <q-space />
          <div class="parameter-tree-editor__actions">
            <q-select
              :model-value="valueType(value)"
              dense
              borderless
              emit-value
              map-options
              :options="typeOptions"
              class="parameter-tree-editor__type"
              :aria-label="$t('parameterTree.type')"
              @update:model-value="changeType(key, $event)"
            />
            <q-btn
              v-if="isContainer(value)"
              dense
              flat
              round
              size="sm"
              icon="add"
              :title="$t('parameterTree.add')"
              @click="addChild(key)"
            />
            <q-btn
              dense
              flat
              round
              size="sm"
              icon="content_copy"
              :title="$t('parameterTree.duplicate')"
              @click="duplicateEntry(key)"
            />
            <q-btn
              dense
              flat
              round
              size="sm"
              icon="arrow_upward"
              :disable="originalIndex(key) === 0"
              :title="$t('parameterTree.moveUp')"
              @click="moveEntry(key, -1)"
            />
            <q-btn
              dense
              flat
              round
              size="sm"
              icon="arrow_downward"
              :disable="originalIndex(key) === entries.length - 1"
              :title="$t('parameterTree.moveDown')"
              @click="moveEntry(key, 1)"
            />
            <q-btn
              dense
              flat
              round
              size="sm"
              color="negative"
              icon="remove"
              :title="$t('parameterTree.remove')"
              @click="removeEntry(key)"
            />
          </div>
        </div>
        <ParameterTreeEditor
          v-if="isContainer(value) && isExpanded(key)"
          nested
          :model-value="value"
          :search-term="search"
          :expansion-command="activeExpansionCommand"
          @update:model-value="changeValue(key, $event)"
        />
      </div>
      <div
        v-if="search && visibleEntries.length === 0"
        class="parameter-tree-editor__empty"
      >
        {{ $t('parameterTree.noMatches') }}
      </div>
      <div
        v-if="isContainer(modelValue)"
        class="parameter-tree-editor__footer row items-center"
      >
        <div>{{ closingBrace }}</div>
        <q-btn
          dense
          flat
          size="sm"
          icon="add"
          :label="$t('parameterTree.add')"
          @click="addEntry"
        />
      </div>
    </div>
    <div v-if="hint" class="text-caption text-grey q-mt-xs">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { isParameterObject, isParameterType } from '../common';
import type { ParameterTree } from '../common';

type ParameterContainer = ParameterTree[] | Record<string, ParameterTree>;
type ParameterTreeType =
  'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';

const props = withDefaults(
  defineProps<{
    modelValue: ParameterTree;
    label?: string;
    hint?: string;
    nested?: boolean;
    searchTerm?: string;
    expansionCommand?: { version: number; expanded: boolean };
  }>(),
  {
    label: undefined,
    hint: undefined,
    nested: false,
    searchTerm: '',
    expansionCommand: undefined,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: ParameterTree];
}>();

const { t } = useI18n();
const editMode = ref<'tree' | 'text'>('tree');
const textValue = ref('');
const search = ref('');
const collapsed = ref(new Set<string>());
const localExpansionCommand = ref<{ version: number; expanded: boolean }>();
const activeExpansionCommand = computed(
  () => props.expansionCommand ?? localExpansionCommand.value,
);
const entries = computed(() =>
  isContainer(props.modelValue) ? Object.entries(props.modelValue) : [],
);
const openingBrace = computed(() =>
  Array.isArray(props.modelValue) ? '[' : '{',
);
const closingBrace = computed(() =>
  Array.isArray(props.modelValue) ? ']' : '}',
);
const filter = computed(() => props.searchTerm || search.value);
const visibleEntries = computed(() =>
  filter.value
    ? entries.value.filter(([key, value]) => containsMatch(key, value))
    : entries.value,
);
const typeOptions = computed(() =>
  (['string', 'number', 'boolean', 'null', 'array', 'object'] as const).map(
    (value) => ({
      label: String(t(`parameterTree.types.${value}`)),
      value,
    }),
  ),
);
const editModeOptions = computed(() => [
  {
    label: String(t('parameterTree.tree')),
    value: 'tree' as const,
  },
  {
    label: String(t('parameterTree.text')),
    value: 'text' as const,
  },
]);
const textError = computed(() => {
  if (parseValue(textValue.value) !== undefined) return '';
  return String(t('parameterTree.invalidJson'));
});

watch(
  () => props.expansionCommand,
  (command) => applyExpansionCommand(command),
  { deep: true },
);

watch(
  () => props.modelValue,
  (value) => {
    const parsed = parseValue(textValue.value);
    if (
      parsed === undefined ||
      JSON.stringify(parsed) !== JSON.stringify(value)
    )
      textValue.value = JSON.stringify(value, null, 2);
  },
  { deep: true, immediate: true },
);

function parseValue(value: string): ParameterTree | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return isParameterType(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function updateText(value: string): void {
  textValue.value = value;
  const parsed = parseValue(value);
  if (parsed !== undefined) emit('update:modelValue', parsed);
}

function applyExpansionCommand(
  command: { version: number; expanded: boolean } | undefined,
): void {
  if (!command) return;
  collapsed.value = command.expanded
    ? new Set()
    : new Set(
        entries.value
          .filter(([, value]) => isContainer(value))
          .map(([key]) => key),
      );
}

function isObject(
  value: ParameterTree,
): value is Record<string, ParameterTree> {
  return isParameterObject(value);
}

function isContainer(value: ParameterTree): value is ParameterContainer {
  return Array.isArray(value) || isObject(value);
}

function valueType(value: ParameterTree): ParameterTreeType {
  if (Array.isArray(value)) return 'array';
  if (isObject(value)) return 'object';
  if (value === null) return 'null';
  if (typeof value === 'number') return 'number';
  return typeof value === 'boolean' ? 'boolean' : 'string';
}

function emitEntry(key: string, value: ParameterTree): void {
  if (Array.isArray(props.modelValue)) {
    const next = [...props.modelValue];
    next[Number(key)] = value;
    emit('update:modelValue', next);
  } else if (isObject(props.modelValue)) {
    emit('update:modelValue', { ...props.modelValue, [key]: value });
  }
}

function renameEntry(key: string, nextValue: unknown): void {
  const nextKey = String(nextValue ?? '');
  if (
    !isObject(props.modelValue) ||
    nextKey === key ||
    Object.hasOwn(props.modelValue, nextKey)
  )
    return;
  const renamed = Object.fromEntries(
    entries.value.map(([entryKey, value]) => [
      entryKey === key ? nextKey : entryKey,
      value,
    ]),
  );
  emit('update:modelValue', renamed);
}

function changeValue(key: string, value: ParameterTree): void {
  emitEntry(key, value);
}

function changeType(key: string, type: ParameterTreeType): void {
  if (valueType(entryValue(key)) === type) return;
  emitEntry(key, defaultValue(type));
  if (type === 'object' || type === 'array') collapsed.value.delete(key);
}

function changeRootType(type: ParameterTreeType): void {
  if (valueType(props.modelValue) !== type)
    emit('update:modelValue', defaultValue(type));
}

function defaultValue(type: ParameterTreeType): ParameterTree {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'array':
      return [];
    case 'object':
      return {};
  }
}

function addEntry(): void {
  emit(
    'update:modelValue',
    Array.isArray(props.modelValue)
      ? [...props.modelValue, '']
      : isObject(props.modelValue)
        ? { ...props.modelValue, [uniqueKey(props.modelValue)]: '' }
        : props.modelValue,
  );
}

function addChild(key: string): void {
  const object = entryValue(key);
  if (!isContainer(object)) return;
  emitEntry(
    key,
    Array.isArray(object)
      ? [...object, '']
      : { ...object, [uniqueKey(object)]: '' },
  );
  collapsed.value.delete(key);
}

function entryValue(key: string): ParameterTree {
  if (Array.isArray(props.modelValue)) return props.modelValue[Number(key)];
  if (isObject(props.modelValue)) return props.modelValue[key];
  return props.modelValue;
}

function duplicateEntry(key: string): void {
  const container = props.modelValue;
  if (!isContainer(container)) return;
  const index = originalIndex(key);
  const value = cloneValue(entries.value[index][1]);
  if (Array.isArray(container)) {
    const next = [...container];
    next.splice(index + 1, 0, value);
    emit('update:modelValue', next);
  } else {
    emit(
      'update:modelValue',
      Object.fromEntries(
        entries.value.flatMap(([entryKey, entryValue]) =>
          entryKey === key
            ? [
                [entryKey, entryValue],
                [uniqueKey(container), value],
              ]
            : [[entryKey, entryValue]],
        ),
      ),
    );
  }
}

function cloneValue(value: ParameterTree): ParameterTree {
  if (Array.isArray(value)) return value.map(cloneValue);
  return isObject(value)
    ? Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, cloneValue(child)]),
      )
    : value;
}

function moveEntry(key: string, offset: -1 | 1): void {
  const moved = [...entries.value];
  const index = moved.findIndex(([entryKey]) => entryKey === key);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= moved.length) return;
  [moved[index], moved[target]] = [moved[target], moved[index]];
  emit(
    'update:modelValue',
    Array.isArray(props.modelValue)
      ? moved.map(([, value]) => value)
      : Object.fromEntries(moved),
  );
}

function removeEntry(key: string): void {
  if (Array.isArray(props.modelValue)) {
    const next = [...props.modelValue];
    next.splice(Number(key), 1);
    emit('update:modelValue', next);
  } else if (isObject(props.modelValue)) {
    const next = { ...props.modelValue };
    delete next[key];
    emit('update:modelValue', next);
  }
}

function uniqueKey(object: Record<string, ParameterTree>): string {
  let key = 'key';
  let suffix = 2;
  while (Object.hasOwn(object, key)) key = `key${suffix++}`;
  return key;
}

function originalIndex(key: string): number {
  return entries.value.findIndex(([entryKey]) => entryKey === key);
}

function isExpanded(key: string): boolean {
  return !!filter.value || !collapsed.value.has(key);
}

function toggle(key: string): void {
  const next = new Set(collapsed.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  collapsed.value = next;
}

function expandAll(): void {
  collapsed.value = new Set();
  publishExpansion(true);
}

function collapseAll(): void {
  collapsed.value = new Set(
    entries.value.filter(([, value]) => isContainer(value)).map(([key]) => key),
  );
  publishExpansion(false);
}

function publishExpansion(expanded: boolean): void {
  localExpansionCommand.value = {
    version: (localExpansionCommand.value?.version ?? 0) + 1,
    expanded,
  };
}

function matches(key: string, value: ParameterTree): boolean {
  const term = filter.value.toLocaleLowerCase();
  return (
    !!term &&
    (key.toLocaleLowerCase().includes(term) ||
      (!isContainer(value) && String(value).toLocaleLowerCase().includes(term)))
  );
}

function containsMatch(key: string, value: ParameterTree): boolean {
  return (
    matches(key, value) ||
    (isContainer(value) &&
      Object.entries(value).some(([childKey, child]) =>
        containsMatch(childKey, child),
      ))
  );
}
</script>

<style scoped>
.parameter-tree-editor {
  min-width: 0;
}

.parameter-tree-editor__header {
  gap: 0.25rem;
  min-height: 2rem;
  margin-bottom: 0.25rem;
}

.parameter-tree-editor__search {
  width: 10rem;
}

.parameter-tree-editor__mode {
  flex-shrink: 0;
}

.parameter-tree-editor__tree {
  max-height: min(28rem, 52vh);
  overflow: auto;
  padding: 0.35rem 0.5rem;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: Consolas, Monaco, monospace;
}

.parameter-tree-editor__text {
  font-family: Consolas, Monaco, monospace;
}

.parameter-tree-editor__brace,
.parameter-tree-editor__footer {
  color: #d4d4d4;
  line-height: 1.75rem;
}

.parameter-tree-editor__node {
  position: relative;
  margin-left: 1rem;
  border-left: 1px dotted #454545;
  padding-left: 0.35rem;
}

.parameter-tree-editor__row {
  display: flex;
  align-items: center;
  min-height: 2rem;
  gap: 0.2rem;
  padding: 0 0.25rem;
  border-radius: 5px;
}

.parameter-tree-editor__row:hover,
.parameter-tree-editor__row:focus-within {
  background: rgba(86, 156, 214, 0.14);
}

.parameter-tree-editor__row--match {
  background: rgba(220, 220, 170, 0.18);
}

.parameter-tree-editor__toggle,
.parameter-tree-editor__toggle-placeholder {
  flex: 0 0 1.5rem;
  width: 1.5rem;
}

.parameter-tree-editor__toggle-placeholder {
  display: inline-block;
}

.parameter-tree-editor__key {
  flex: 0 0 auto;
  max-width: 14rem;
  align-self: center;
  color: #9cdcfe;
  font-weight: 600;
}

.parameter-tree-editor__index {
  min-width: 3rem;
  color: #808080;
}

.parameter-tree-editor__colon {
  color: #d4d4d4;
}

.parameter-tree-editor__value {
  margin-left: 0.15rem;
}

.parameter-tree-editor__value--string {
  flex: 1 1 8rem;
  align-self: center;
  color: #ce9178;
}

.parameter-tree-editor__value--boolean {
  color: #b5cea8;
}

.parameter-tree-editor__value--number {
  flex: 1 1 5rem;
  color: #b5cea8;
}

.parameter-tree-editor__null {
  color: #569cd6;
  font-style: italic;
}

.parameter-tree-editor__root-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.parameter-tree-editor__summary {
  appearance: none;
  border: 0;
  background: transparent;
  color: #808080;
  font: inherit;
  cursor: pointer;
}

.parameter-tree-editor__actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 120ms ease;
}

.parameter-tree-editor__row:hover .parameter-tree-editor__actions,
.parameter-tree-editor__row:focus-within .parameter-tree-editor__actions {
  opacity: 1;
}

.parameter-tree-editor__type {
  width: 5.5rem;
  font-size: 0.72rem;
}

.parameter-tree-editor__empty {
  padding: 0.75rem 1.5rem;
  color: #808080;
}

.parameter-tree-editor__footer {
  gap: 0.5rem;
}

:deep(.q-field__control) {
  align-items: center;
  min-height: 1.75rem;
}

:deep(.q-field__native),
:deep(.q-field__input) {
  min-height: 1.75rem;
  align-self: center;
  padding-top: 0;
  padding-bottom: 0;
  line-height: 1.75rem;
}

.parameter-tree-editor__tree :deep(.q-field__native),
.parameter-tree-editor__tree :deep(.q-field__input),
.parameter-tree-editor__tree :deep(.q-btn) {
  color: #d4d4d4;
}

.parameter-tree-editor__key :deep(.q-field__native),
.parameter-tree-editor__key :deep(.q-field__input) {
  color: #4fc1ff;
}

.parameter-tree-editor__value--string :deep(.q-field__native),
.parameter-tree-editor__value--string :deep(.q-field__input) {
  color: #ce9178;
}

.parameter-tree-editor__value--number :deep(.q-field__native),
.parameter-tree-editor__value--number :deep(.q-field__input) {
  color: #b5cea8;
}
</style>
