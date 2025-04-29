<template>
  <q-card-section align="center">
    <q-btn no-caps :label="selectedLabel">
      <q-menu auto-close>
        <q-list>
          <q-item key="0" clickable v-close-popup density="compact" :value="null" title="remove custom style" dense
            @click="updateValue(null)">
            <q-item-section avatar><q-icon v-if="!value" name="mdi-check" size="xs" /></q-item-section>
            <q-item-section no-wrap><i>no custom style</i></q-item-section>
          </q-item>
          <q-item v-for="(styleItem, index) in styles" :key="index + 1" clickable v-close-popup density="compact"
            :value="index" :title="description(styleItem)" dense @click="updateValue(styleItem.styleDef.name)">
            <q-item-section avatar><q-icon v-if="value === styleItem.styleDef.name" name="mdi-check"
                size="xs" /></q-item-section>
            <q-item-section no-wrap v-html="styleLabel(styleItem)" />
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </q-card-section>
  <q-card-section>
    <span v-if="value"><b>{{ selectedLabel }}</b>: </span>{{ customStyleDescription(selectedStyle) }}
  </q-card-section>
  <q-card-section v-if="selectedStyle?.deprecated">
    <b>This custom style is deprecated.</b>
  </q-card-section>
</template>

<script lang="ts">
import { CustomStyleInstance, customStylesForType } from '../../common';
import { uniq } from 'lodash';
import { getEditorConfiguration } from '../../schema';

export default {
  props: ['editor', 'type', 'level', 'originalValue'],
  emits: ['update-attribute'],
  data() {
    return {
      value: this.originalValue
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    styles() {
      return uniq(
        customStylesForType(this.customStyles, this.type)
          .filter(cs => cs.element === this.type && (!this.level || this.level === cs.attrs.level))
      )
    },
    styleNames() {
      return this.styles.map((s) => s.styleDef.name);
    },
    selectedLabel() {
      return this.value || 'no custom style'
    },
    selectedStyle(): CustomStyleInstance | undefined {
      const name = this.value
      return this.styles.find(s => s.styleDef.name === name)
    }
  },
  methods: {
    updateValue(newValue: string | number | null) {
      if (this.value !== newValue) {
        this.value = newValue
        this.$emit('update-attribute', 'customStyle', this.value);
      }
    },
    customStyleDescription(style: CustomStyleInstance | undefined): string {
      return style && style.styleDef.description || ''
    },
    description(cs: CustomStyleInstance): string {
      return [cs.styleDef.description || '', cs.deprecated ? '(deprecated)' : ''].join(' ')
    },
    styleLabel(cs: CustomStyleInstance) {
      return cs.deprecated ? `<del>${cs.styleDef.name}</del>` : cs.styleDef.name
    }
  },
};
</script>