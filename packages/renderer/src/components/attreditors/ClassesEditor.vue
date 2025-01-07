<template>
  <q-card>
    <div v-if="newClasses.length > 0" class="q-pa-md">
      <q-chip v-for="c in (newClasses as string[])" :key="c" :v-model="c" :removable="!isImportant(c)"
        icon-remove="mdi-close-circle-outline" @remove="removeClass(c)" title="remove this class">
        {{ c }}
      </q-chip>
    </div>
    <q-card-actions horizontal align="center">
      <q-btn v-for="c in addableCustomClasses" :key="c.name" icon="mdi-plus" :title="addableClassTitle(c)"
        @click="addNewClass(c.name)" :label="c.name" size="sm" color="primary" no-caps />
      <q-space />
      <q-btn icon="mdi-plus" color="primary" title="add a class" @click="showAddClassDialog = true" />
      <q-dialog v-model="showAddClassDialog">
        <q-card class="q-pa-3">
          <q-card-section>
            <q-input :model-value="classToAdd" autofocus :label="newClassLabel"
              :color="invalidClass ? 'red' : 'primary'" @update:model-value="updateClassToAdd" @keydown="keydown" />
          </q-card-section>
          <q-card-actions>
            <q-space />
            <q-btn :disable="invalidClass" label="Add" color="primary" @click="addNewClass(classToAdd)" />
            <q-btn label="Cancel" color="primary" @click="closeAddClassDialog" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { isString } from 'lodash';
import {
  CustomClass,
  CustomStyleInstance,
  NODE_NAME_DIV,
  customClassesForNodeOrMark
} from '../../common';
import { IncludeDocCustomClass, getEditorConfiguration } from '../../schema';

export default {
  props: ['editor', 'nodeOrMark', 'startValue', 'importantClasses', 'forbiddenClasses'],
  emits: ['update-attribute', 'remove-class', 'add-class'],
  data() {
    return {
      oldClasses: this.startValue || [] as string[],
      newClasses: this.startValue || [] as string[],
      showAddClassDialog: false,
      classToAdd: '',
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customClasses(): CustomClass[] {
      const classes = []
      if (this.nodeOrMark?.type.name === NODE_NAME_DIV) classes.push(IncludeDocCustomClass)
      const customClasses = this.configuration && this.configuration.customClasses || []
      return [...classes, ...customClasses]
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    availableCustomClasses(): CustomClass[] {
      return this.nodeOrMark
        ? customClassesForNodeOrMark(this.nodeOrMark, this.customClasses, this.customStyles)
        : []
    },
    addableCustomClasses(): CustomClass[] {
      return this.availableCustomClasses.filter(acc => !this.newClasses.includes(acc.name))
    },
    invalidClassError(): string | undefined {
      if (this.newClasses.includes(this.classToAdd)) return 'class already present!'
      if ((this.forbiddenClasses || []).includes(this.classToAdd)) return 'class is forbidden here!'
      return undefined
    },
    invalidClass() {
      return (this.invalidClassError !== undefined) || this.classToAdd.length === 0
    },
    newClassLabel() {
      return this.invalidClassError || 'new class'
    }
  },
  watch: {
    startValue(newValue: string[]) {
      this.newClasses = newValue
    }
  },
  methods: {
    addableClassTitle(cc: CustomClass) {
      const title = `add class "${cc.name}"`
      return cc.description ? `${title}: ${cc.description}` : title
    },
    isImportant(c: string) {
      return (this.importantClasses || []).includes(c);
    },
    removeClass(rc: string) {
      if (!this.isImportant(rc)) {
        const newClasses = (this.newClasses as string[]).filter(c => c !== rc);
        this.newClasses = newClasses;
        // this.$emit('update-attribute', 'classes', newClasses);
        this.$emit('remove-class', rc);
      }
    },
    updateClassToAdd(newValue: string | number | null) {
      if (isString(newValue)) this.classToAdd = newValue
    },
    keydown(e: KeyboardEvent) {
      if (e.key === 'Enter' && !this.invalidClass) {
        this.addNewClass(this.classToAdd)
        e.preventDefault()
      }
      if (e.key === 'Escape') this.closeAddClassDialog()
    },
    addNewClass(newClass: string) {
      this.newClasses = this.newClasses.concat([newClass])
      this.closeAddClassDialog()
      // this.$emit('update-attribute', 'classes', this.newClasses);
      this.$emit('add-class', newClass);
    },
    closeAddClassDialog() {
      this.showAddClassDialog = false
      this.classToAdd = ''
    }
  },
};
</script>