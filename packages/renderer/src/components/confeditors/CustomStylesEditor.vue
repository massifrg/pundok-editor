<template>
  <div class="custom-styles-editor">
    <div class="row items-center q-mb-sm">
      <div class="text-subtitle1">
        {{ $t('configEditor.customStyles.title') }}
      </div>
      <q-space />
      <q-btn
        dense
        icon="add"
        :label="$t('configEditor.customStyles.newStyle')"
        @click="newStyle"
      />
    </div>

    <q-list v-if="allStyles.length > 0" bordered separator>
      <q-item
        v-for="style in allStyles"
        :key="style.name"
        dense
        :class="{
          'text-grey-7': isInherited(style),
        }"
        :style="{
          backgroundColor: inheritedBackground(style.name),
        }"
      >
        <q-item-section>
          <q-item-label class="row items-center no-wrap">
            <span class="text-weight-bold" :class="{ 'text-strike': isRemoved(style.name) }">{{ style.name }}</span>
            <q-space />
            <span class="text-caption text-grey-7">{{
              appliesToLabel(style.appliesTo)
            }}</span>
          </q-item-label>
          <q-item-label v-if="style.description" caption>{{
            style.description
          }}</q-item-label>
          <q-item-label v-if="isInherited(style)" caption>
            {{ $t('configEditor.inheritedFrom', { name: inheritedSource(style.name) }) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row no-wrap q-gutter-xs">
            <q-btn
              v-if="isInherited(style)"
              dense
              flat
              round
              icon="content_copy"
              :title="$t('configEditor.customStyles.copyStyle')"
              @click="copyInheritedStyle(style)"
            />
            <template v-else>
              <q-btn
                dense
                flat
                round
                icon="edit"
                :title="$t('configEditor.customStyles.editStyle')"
                @click="editStyle(style.name)"
              />
              <q-btn
                dense
                flat
                round
                icon="remove"
                :title="$t('configEditor.customStyles.deleteStyle')"
                @click="deleteStyle(style.name)"
              />
            </template>
            <q-toggle
              v-if="isInherited(style)"
              :model-value="isRemoved(style.name)"
              color="primary"
              :icon="mdiEyeOff"
              :title="$t('configEditor.removeInherited', { name: style.name })"
              @update:model-value="setRemoved(style.name, $event)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-else class="text-caption q-pa-sm">
      {{ $t('configEditor.customStyles.none') }}
    </div>

    <q-dialog :model-value="!!draft" @hide="cancelEdit">
      <q-card
        v-if="draft"
        flat
        bordered
        class="q-mt-md"
        style="width: 80vw; max-width: 80vw"
      >
        <q-card-section class="q-pb-sm">
          <div class="text-subtitle2">
            {{
              $t(
                editingIndex === null
                  ? 'configEditor.customStyles.newTitle'
                  : 'configEditor.customStyles.editTitle',
              )
            }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="draft.name"
            :label="$t('configEditor.customStyles.name')"
            outlined
            dense
            :readonly="editingIndex !== null"
            :error="!!nameError"
            :error-message="nameError"
          >
            <template #error>
              <q-icon name="alert_circle" size="xs" class="q-mr-xs" />
              {{ nameError }}
            </template>
          </q-input>
          <q-separator class="q-my-md" />
          <q-select
            v-model="draft.appliesTo"
            :options="appliesToOptions"
            :label="$t('configEditor.customStyles.appliesTo')"
            multiple
            emit-value
            map-options
            outlined
            dense
            @update:model-value="onAppliesToChanged"
          >
            <template #selected-item="scope">
              <q-chip
                dense
                removable
                icon-remove="remove_item"
                @remove="scope.removeAtIndex(scope.index)"
              >
                {{ scope.opt.value }}
              </q-chip>
            </template>
          </q-select>
          <div v-if="headingSelected" class="q-mt-md">
            <div class="text-caption q-mb-xs">
              {{ $t('configEditor.customStyles.headingLevels') }}
            </div>
            <div class="row q-gutter-sm">
              <q-checkbox
                v-for="level in headingLevels"
                :key="level"
                v-model="draft.levels"
                :val="level"
                :label="String(level)"
                dense
              />
            </div>
            <q-separator class="q-my-md" />
          </div>
          <CssPropertiesEditor v-model="draft.css" class="q-mt-md" />
          <q-separator class="q-my-md" />
          <q-select
            v-model="draft.deprecatedFor"
            :options="deprecatedElementOptions"
            :label="$t('configEditor.customStyles.deprecatedFor')"
            multiple
            emit-value
            map-options
            outlined
            dense
            @update:model-value="onDeprecatedForChanged"
          >
            <template #selected-item="scope">
              <q-chip
                dense
                removable
                icon-remove="remove_item"
                @remove="scope.removeAtIndex(scope.index)"
              >
                {{ scope.opt.value }}
              </q-chip>
            </template>
          </q-select>
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
            :disable="!canApply"
            @click="applyEdit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script lang="ts">
import {
  CustomizableElements,
  CustomStyleDef,
  CustomizableElement,
  NODE_NAME_HEADING,
} from '../../common';
import { mdiEyeOff } from '@mdi/js';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import CssPropertiesEditor from './CssPropertiesEditor.vue';

type CustomStyleDraft = CustomStyleDef;

export default {
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    inherited: {
      type: Array,
      default: () => [],
    },
    removed: {
      type: Array,
      default: () => [],
    },
    provenance: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['update:modelValue', 'update:removed'],
  data() {
    return {
      mdiEyeOff,
      styles: [] as CustomStyleDef[],
      draft: undefined as CustomStyleDraft | undefined,
      editingIndex: null as number | null,
      nameError: '',
    };
  },
  components: {
    CssPropertiesEditor,
  },
  computed: {
    allStyles(): CustomStyleDef[] {
      const inherited = (this.inherited as CustomStyleDef[])
        .filter((style) => !this.styles.some((local) => local.name === style.name))
        .sort((first, second) =>
          this.inheritedSource(first.name).localeCompare(this.inheritedSource(second.name)),
        );
      return [
        ...this.styles,
        ...inherited,
      ];
    },
    customizableElementOptions(): {
      label: string;
      value: CustomizableElement;
    }[] {
      return Object.entries(CustomizableElements).map(([key, value]) => ({
        value: key as CustomizableElement,
        label: `${key} (${value} Pandoc type)`,
      }));
    },
    deprecatedElementOptions(): {
      label: string;
      value: CustomizableElement;
    }[] {
      return this.customizableElementOptions.filter(
        (option) => !this.draft?.appliesTo.includes(option.value),
      );
    },
    appliesToOptions(): { label: string; value: CustomizableElement }[] {
      return this.customizableElementOptions.filter(
        (option) => !this.draft?.deprecatedFor?.includes(option.value),
      );
    },
    canApply(): boolean {
      return (
        !!this.draft?.name.trim() && (this.draft?.appliesTo.length || 0) > 0
      );
    },
    headingSelected(): boolean {
      return !!this.draft?.appliesTo.includes(NODE_NAME_HEADING);
    },
    headingLevels(): number[] {
      return [1, 2, 3, 4, 5, 6];
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(value: CustomStyleDef[]) {
        if (!this.draft)
          this.styles = value.map((style) => this.copyStyle(style));
      },
    },
  },
  setup() {
    setupQuasarIcons();
  },
  methods: {
    isRemoved(name: string): boolean {
      return (this.removed as string[]).includes(name);
    },
    inheritedSource(name: string): string {
      return (this.provenance as Record<string, string>)[name] || '';
    },
    inheritedBackground(name: string): string | undefined {
      if (!this.inheritedSource(name)) return undefined;
      const sources = [...new Set(Object.values(this.provenance as Record<string, string>))];
      const colors = ['#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fce4ec', '#f1f8e9'];
      return colors[Math.max(0, sources.indexOf(this.inheritedSource(name)) % colors.length)];
    },
    setRemoved(name: string, value: boolean | null) {
      const names = new Set(this.removed as string[]);
      if (value) names.add(name);
      else names.delete(name);
      this.$emit('update:removed', [...names]);
    },
    copyStyle(style: CustomStyleDef): CustomStyleDef {
      const appliesTo = Array.isArray(style.appliesTo)
        ? style.appliesTo
        : [style.appliesTo];
      return {
        ...style,
        appliesTo: [...appliesTo] as CustomizableElement[],
        deprecatedFor: style.deprecatedFor
          ? [...style.deprecatedFor]
          : undefined,
        levels: style.levels ? [...style.levels] : undefined,
        css: style.css
          ? style.css.map(
              ([propertyName, propertyValue]) =>
                [String(propertyName), String(propertyValue)] as [
                  string,
                  string,
                ],
            )
          : undefined,
        classes: style.classes ? [...style.classes] : undefined,
        attributes: style.attributes ? [...style.attributes] : undefined,
      };
    },
    newStyle() {
      this.editingIndex = null;
      this.nameError = '';
      this.draft = {
        name: '',
        appliesTo: ['span'],
        deprecatedFor: [],
      };
    },
    editStyle(name: string) {
      const index = this.styles.findIndex((style) => style.name === name);
      if (index < 0) return;
      this.editingIndex = index;
      this.nameError = '';
      this.draft = this.copyStyle(this.styles[index]);
      if (!this.draft.deprecatedFor) this.draft.deprecatedFor = [];
      if (
        this.draft.appliesTo.includes(NODE_NAME_HEADING) &&
        !this.draft.levels
      ) {
        this.draft.levels = [...this.headingLevels];
      }
    },
    isInherited(style: CustomStyleDef): boolean {
      return (
        !this.styles.some((item) => item.name === style.name) &&
        (this.inherited as CustomStyleDef[]).some(
          (item) => item.name === style.name,
        )
      );
    },
    appliesToLabel(appliesTo: CustomStyleDef['appliesTo']): string {
      return appliesTo.length ? appliesTo.join(', ') : '*';
    },
    copyInheritedStyle(style: CustomStyleDef) {
      this.styles = [...this.styles, this.copyStyle(style)];
      this.emitStyles();
    },
    onAppliesToChanged(appliesTo: CustomizableElement[]) {
      if (this.draft?.deprecatedFor) {
        this.draft.deprecatedFor = this.draft.deprecatedFor.filter(
          (element) => !appliesTo.includes(element),
        );
      }
      if (
        appliesTo.includes(NODE_NAME_HEADING) &&
        this.draft &&
        !this.draft.levels
      ) {
        this.draft.levels = [...this.headingLevels];
      }
    },
    onDeprecatedForChanged(deprecatedFor: CustomizableElement[]) {
      if (this.draft) {
        this.draft.appliesTo = this.draft.appliesTo.filter(
          (element) => !deprecatedFor.includes(element),
        );
      }
    },
    deleteStyle(name: string) {
      this.styles = this.styles.filter((style) => style.name !== name);
      this.emitStyles();
      if (this.draft?.name === name) this.cancelEdit();
    },
    cancelEdit() {
      this.draft = undefined;
      this.editingIndex = null;
      this.nameError = '';
    },
    applyEdit() {
      if (!this.draft || !this.draft.name.trim()) {
        this.nameError = this.$t('configEditor.customStyles.nameRequired');
        return;
      }
      if (this.draft.appliesTo.length === 0) return;
      const name = this.draft.name.trim();
      if (
        this.editingIndex === null &&
        this.styles.some((style) => style.name === name)
      ) {
        this.nameError = this.$t('configEditor.customStyles.duplicateName');
        return;
      }
      const style = this.copyStyle({ ...this.draft, name });
      if (this.editingIndex === null) this.styles = [...this.styles, style];
      else this.styles.splice(this.editingIndex, 1, style);
      this.emitStyles();
      this.cancelEdit();
    },
    emitStyles() {
      this.$emit(
        'update:modelValue',
        this.styles.map((style) => this.copyStyle(style)),
      );
    },
  },
};
</script>
