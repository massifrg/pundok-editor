<template>
  <div class="raw-elements-editor">
    <q-card bordered class="q-mb-md">
      <q-card-section class="row items-center q-gutter-xs">
        <div class="text-subtitle1">
          {{ $t('configEditor.rawElements.defaultRawFormat') }}
        </div>
        <RawFormatMenu
          :model-value="defaultRawFormat ?? null"
          :options="defaultFormatOptions"
          class="raw-elements-editor__select"
          :label="$t('configEditor.rawElements.defaultRawFormat')"
          @update:model-value="setDefaultRawFormat"
        />
        <q-space />
        <span class="text-subtitle1">{{
          $t('configEditor.rawElements.show')
        }}</span>
        <RawFormatMenu
          :model-value="selectedFormat"
          :options="formatFilterOptions"
          class="raw-elements-editor__select"
          :label="$t('configEditor.rawElements.showFormats')"
          @update:model-value="selectedFormat = $event"
        />
      </q-card-section>
    </q-card>

    <q-tabs
      v-model="rawElementsTab"
      dense
      align="justify"
      stretch
      class="text-primary q-mb-sm full-width"
    >
      <q-tab
        name="rawInlines"
        :label="$t('configEditor.rawElements.rawInlinesTab')"
      />
      <q-tab
        name="rawBlocks"
        :label="$t('configEditor.rawElements.rawBlocksTab')"
      />
    </q-tabs>

    <q-tab-panels v-model="rawElementsTab" animated>
      <q-tab-panel name="rawInlines" class="q-pa-none">
        <q-card bordered>
          <q-card-section class="row items-center q-gutter-xs">
            <div class="text-subtitle1">
              {{ $t('configEditor.rawElements.rawInlines') }}
            </div>
            <q-space />
            <q-btn
              dense
              flat
              :icon="
                sortAscending.rawInlines
                  ? 'sort_alphabetical_descending'
                  : 'sort_alphabetical_ascending'
              "
              :label="$t('configEditor.rawElements.sort')"
              :title="$t('configEditor.rawElements.sortDescription')"
              @click="sortRawElements('rawInlines')"
            />
            <q-space />
            <q-btn
              dense
              icon="add"
              :label="$t('configEditor.rawElements.addRawInline')"
              @click="addRaw('rawInlines')"
            />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="rawInlines.length === 0" class="text-caption">
            {{ $t('configEditor.rawElements.none') }}
          </q-card-section>
          <q-card-section
            v-else-if="visibleRawInlines.length === 0"
            class="text-caption"
          >
            {{ $t('configEditor.rawElements.noneInSelectedFormat') }}
          </q-card-section>
          <div v-else class="q-pa-xs q-gutter-xs">
            <q-btn
              v-for="{ raw, index } in visibleRawInlines"
              :key="rawKey(raw, index)"
              color="secondary"
              :title="raw.title"
              :label="labelFor(raw)"
              no-caps
              size="md"
              class="q-pa-xs q-ma-xs"
              @click="editRaw('rawInlines', index)"
            />
          </div>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="rawBlocks" class="q-pa-none">
        <q-card bordered>
          <q-card-section class="row items-center q-gutter-xs">
            <div class="text-subtitle1">
              {{ $t('configEditor.rawElements.rawBlocks') }}
            </div>
            <q-space />
            <q-btn
              dense
              flat
              :icon="
                sortAscending.rawBlocks
                  ? 'sort_alphabetical_descending'
                  : 'sort_alphabetical_ascending'
              "
              :label="$t('configEditor.rawElements.sort')"
              :title="$t('configEditor.rawElements.sortDescription')"
              @click="sortRawElements('rawBlocks')"
            />
            <q-space />
            <q-btn
              dense
              icon="add"
              :label="$t('configEditor.rawElements.addRawBlock')"
              @click="addRaw('rawBlocks')"
            />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="rawBlocks.length === 0" class="text-caption">
            {{ $t('configEditor.rawElements.none') }}
          </q-card-section>
          <q-card-section
            v-else-if="visibleRawBlocks.length === 0"
            class="text-caption"
          >
            {{ $t('configEditor.rawElements.noneInSelectedFormat') }}
          </q-card-section>
          <div v-else class="q-pa-xs q-gutter-xs">
            <q-btn
              v-for="{ raw, index } in visibleRawBlocks"
              :key="rawKey(raw, index)"
              color="secondary"
              :title="raw.title"
              :label="labelFor(raw)"
              no-caps
              size="md"
              class="q-pa-xs q-ma-xs"
              @click="editRaw('rawBlocks', index)"
            />
          </div>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <q-dialog :model-value="!!rawEditorSelection" @hide="closeRawEditor">
      <q-card
        v-if="selectedRaw"
        flat
        bordered
        class="q-mt-md raw-elements-editor__subeditor"
      >
        <q-card-section class="q-gutter-xs">
          <div class="row items-start q-gutter-xs">
            <RawFormatMenu
              :model-value="selectedRaw.raw.format"
              :options="rawFormatOptions"
              class="raw-elements-editor__format-select"
              :label="$t('configEditor.rawElements.format')"
              @update:model-value="
                setRawFormat(selectedRaw.group, selectedRaw.index, $event)
              "
            />
            <q-input
              :model-value="selectedRaw.raw.title"
              outlined
              dense
              class="col raw-title"
              :label="$t('configEditor.rawElements.title')"
              @update:model-value="
                updateTitle(selectedRaw.group, selectedRaw.index, $event)
              "
            />
            <q-btn
              dense
              flat
              round
              icon="content_copy"
              :title="$t('configEditor.buttons.copy')"
              @click="copyEditedRaw"
            />
            <q-btn
              dense
              flat
              round
              icon="delete"
              :title="$t('configEditor.buttons.delete')"
              @click="removeEditedRaw"
            />
          </div>
          <div
            v-if="selectedRaw.group === 'rawInlines'"
            class="row items-start q-gutter-xs"
          >
            <q-input
              :model-value="contentPart(selectedRaw.raw, 0)"
              outlined
              dense
              class="col raw-elements-editor__content-input"
              input-class="raw-elements-editor__content"
              :label="$t('configEditor.rawElements.contentFirst')"
              @update:model-value="
                updateContentPart(
                  selectedRaw.group,
                  selectedRaw.index,
                  0,
                  $event,
                )
              "
            />
            <q-input
              :model-value="contentPart(selectedRaw.raw, 1)"
              outlined
              dense
              :class="[
                'col',
                {
                  'raw-elements-editor__content-input': hasSecondContent(
                    selectedRaw.raw,
                  ),
                  'raw-elements-editor__content-input--empty':
                    !hasSecondContent(selectedRaw.raw),
                },
              ]"
              :input-class="
                hasSecondContent(selectedRaw.raw)
                  ? 'raw-elements-editor__content'
                  : undefined
              "
              :label="$t('configEditor.rawElements.contentSecond')"
              @update:model-value="
                updateContentPart(
                  selectedRaw.group,
                  selectedRaw.index,
                  1,
                  $event,
                )
              "
            />
          </div>
          <template v-else>
            <q-input
              :model-value="contentPart(selectedRaw.raw, 0)"
              outlined
              dense
              autogrow
              type="textarea"
              class="raw-elements-editor__content-input"
              input-class="raw-elements-editor__content"
              :label="$t('configEditor.rawElements.contentFirst')"
              @update:model-value="
                updateContentPart(
                  selectedRaw.group,
                  selectedRaw.index,
                  0,
                  $event,
                )
              "
            />
            <q-input
              :model-value="contentPart(selectedRaw.raw, 1)"
              outlined
              dense
              autogrow
              type="textarea"
              :class="{
                'raw-elements-editor__content-input': hasSecondContent(
                  selectedRaw.raw,
                ),
                'raw-elements-editor__content-input--empty': !hasSecondContent(
                  selectedRaw.raw,
                ),
              }"
              :input-class="
                hasSecondContent(selectedRaw.raw)
                  ? 'raw-elements-editor__content'
                  : undefined
              "
              :label="$t('configEditor.rawElements.contentSecond')"
              @update:model-value="
                updateContentPart(
                  selectedRaw.group,
                  selectedRaw.index,
                  1,
                  $event,
                )
              "
            />
          </template>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  allRawFormats,
  type InsertableRaw,
  type PundokEditorConfigInit,
} from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import RawFormatMenu from './RawFormatMenu.vue';

setupQuasarIcons();

type RawGroup = 'rawInlines' | 'rawBlocks';

const props = defineProps<{
  modelValue: Partial<PundokEditorConfigInit>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Partial<PundokEditorConfigInit>];
}>();

const rawFormats = allRawFormats();
const defaultRawFormat = ref<string | undefined>();
const rawElementsTab = ref<RawGroup>('rawInlines');
const selectedFormat = ref<string | null>(null);
const sortAscending = ref<Record<RawGroup, boolean>>({
  rawInlines: false,
  rawBlocks: false,
});
const rawInlines = ref<InsertableRaw[]>([]);
const rawBlocks = ref<InsertableRaw[]>([]);
const rawEditorSelection = ref<{ group: RawGroup; index: number }>();
const { t } = useI18n();

const defaultFormatOptions = computed(() => [
  {
    label: t('configEditor.rawElements.unset'),
    value: null,
  },
  ...rawFormats.map((format) => ({ label: format, value: format })),
]);
const rawFormatOptions = computed(() =>
  rawFormats.map((format) => ({ label: format, value: format })),
);
const formatFilterOptions = computed(() => [
  {
    label: t('configEditor.rawElements.allFormats'),
    value: null,
  },
  ...rawFormats.map((format) => ({ label: format, value: format })),
]);
const visibleRawInlines = computed(() =>
  rawInlines.value
    .map((raw, index) => ({ raw, index }))
    .filter(
      ({ raw }) => !selectedFormat.value || raw.format === selectedFormat.value,
    ),
);
const visibleRawBlocks = computed(() =>
  rawBlocks.value
    .map((raw, index) => ({ raw, index }))
    .filter(
      ({ raw }) => !selectedFormat.value || raw.format === selectedFormat.value,
    ),
);
const selectedRaw = computed(() => {
  const selection = rawEditorSelection.value;
  if (!selection) return undefined;
  const raw = getRaw(selection.group, selection.index);
  return raw ? { ...selection, raw } : undefined;
});

watch(
  () => props.modelValue,
  (value) => {
    defaultRawFormat.value = value.defaultRawFormat;
    rawInlines.value = copyRawList(value.rawInlines);
    rawBlocks.value = copyRawList(value.rawBlocks);
  },
  { immediate: true, deep: true },
);

function copyRawList(raws?: InsertableRaw[]): InsertableRaw[] {
  return (raws || []).map((raw) => ({
    ...raw,
    content: Array.isArray(raw.content)
      ? ([...raw.content] as [string, string])
      : raw.content,
  }));
}

function emitChange(partial: Partial<PundokEditorConfigInit> = {}) {
  emit('update:modelValue', {
    ...props.modelValue,
    defaultRawFormat: defaultRawFormat.value,
    rawInlines: copyRawList(rawInlines.value),
    rawBlocks: copyRawList(rawBlocks.value),
    ...partial,
  });
}

function setDefaultRawFormat(format: string | null) {
  defaultRawFormat.value = format || undefined;
  emitChange();
}

function addRaw(group: RawGroup) {
  const list = group === 'rawInlines' ? rawInlines.value : rawBlocks.value;
  list.push({
    format: selectedFormat.value || rawFormats[0] || '',
    content: '',
  });
  emitChange();
}

function removeRaw(group: RawGroup, index: number) {
  const list = group === 'rawInlines' ? rawInlines.value : rawBlocks.value;
  list.splice(index, 1);
  emitChange();
}

function editRaw(group: RawGroup, index: number) {
  rawEditorSelection.value = { group, index };
}

function closeRawEditor() {
  rawEditorSelection.value = undefined;
}

function removeEditedRaw() {
  const selection = rawEditorSelection.value;
  if (!selection) return;
  removeRaw(selection.group, selection.index);
  closeRawEditor();
}

function copyEditedRaw() {
  const selection = rawEditorSelection.value;
  const raw = selection && getRaw(selection.group, selection.index);
  if (!selection || !raw) return;

  const list =
    selection.group === 'rawInlines' ? rawInlines.value : rawBlocks.value;
  list.push(copyRawList([raw])[0]);
  emitChange();
  rawEditorSelection.value = {
    group: selection.group,
    index: list.length - 1,
  };
}

function sortRawElements(group: RawGroup) {
  const list = group === 'rawInlines' ? rawInlines.value : rawBlocks.value;
  const ascending = !sortAscending.value[group];
  sortAscending.value[group] = ascending;
  const direction = ascending ? 1 : -1;
  list.sort(
    (left, right) =>
      direction *
      (compareRawText(left.format, right.format) ||
        compareRawText(contentPart(left, 0), contentPart(right, 0)) ||
        compareRawText(contentPart(left, 1), contentPart(right, 1))),
  );
  emitChange();
}

const rawTextCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareRawText(left: string, right: string): number {
  const lettersAndNumbersOnly = (value: string) =>
    value.normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
  return rawTextCollator.compare(
    lettersAndNumbersOnly(left),
    lettersAndNumbersOnly(right),
  );
}

function setRawFormat(
  group: RawGroup,
  index: number,
  format: string | number | null,
) {
  const raw = getRaw(group, index);
  if (!raw || typeof format !== 'string') return;
  raw.format = format;
  emitChange();
}

function updateTitle(
  group: RawGroup,
  index: number,
  title: string | number | null | undefined,
) {
  const raw = getRaw(group, index);
  if (!raw) return;
  raw.title =
    typeof title === 'string'
      ? title || undefined
      : title == null
        ? undefined
        : String(title);
  emitChange();
}

function contentPart(raw: InsertableRaw, part: 0 | 1): string {
  if (Array.isArray(raw.content)) return raw.content[part] || '';
  return part === 0 ? raw.content || '' : '';
}

function hasSecondContent(raw: InsertableRaw): boolean {
  return contentPart(raw, 1) !== '';
}

function updateContentPart(
  group: RawGroup,
  index: number,
  part: 0 | 1,
  value: string | number | null | undefined,
) {
  const raw = getRaw(group, index);
  if (!raw) return;
  const text =
    typeof value === 'string' ? value : value == null ? '' : String(value);
  const first = part === 0 ? text : contentPart(raw, 0);
  const second = part === 1 ? text : contentPart(raw, 1);
  raw.content = second ? [first, second] : first || '';
  emitChange();
}

function getRaw(group: RawGroup, index: number): InsertableRaw | undefined {
  const list = group === 'rawInlines' ? rawInlines.value : rawBlocks.value;
  return list[index];
}

function rawKey(raw: InsertableRaw, index: number) {
  return `${raw.format}-${index}`;
}

function labelFor(raw: InsertableRaw): string {
  return Array.isArray(raw.content)
    ? raw.content.join('...')
    : raw.content || '';
}
</script>

<style scoped>
.raw-elements-editor__select {
  min-width: 13rem;
}

.raw-elements-editor__format-select {
  flex: 0 0 10rem;
}

.raw-elements-editor__subeditor {
  width: 80vw;
  max-width: 80vw;
}

.raw-title {
  font-size: 1rem;
}

:deep(.raw-elements-editor__content) {
  color: #00c000;
  caret-color: #00ff00;
  font-family: monospace;
  opacity: 1;
  font-size: 1rem;
}

:deep(.raw-elements-editor__content-input .q-field__control) {
  background-color: #000;
}

:deep(.raw-elements-editor__content-input--empty .q-field__control) {
  background-color: #fff;
}
</style>
