<template>
  <q-btn-dropdown class="q-ma-xs" size="sm" rounded color="primary" :outline="noneActive" :label="label"
    :title="title || 'Mark or custom style'" :no-caps="noneActive || operation === 'remove all'"
    :menu-anchor="menuAnchor" :menu-self="menuSelf">
    <MarksPalette :editor="editor" :operations="operations" :defaultOperation="defaultOperation"
      :addableMarks="addableMarks" :logicalOperator="logicalOperator" :showLogicalOperator="showLogicalOperator"
      @selected-marks="forwardSelectedMarks" @selected-operation="forwardSelectedOperation"
      @selected-logical-operator="forwardSelectedLogicalOperator" />
  </q-btn-dropdown>
</template>

<script lang="ts">
import { AddableMark } from '.';
import { MarkOperationType, MarksLogicalOperator } from '../schema';
import MarksPalette from './MarksPalette.vue'

export default {
  components: { MarksPalette },
  props: ['editor', 'title', 'operations', 'defaultOperation', 'addableMarks', 'logicalOperator', 'showLogicalOperator', 'menuAnchor', 'menuSelf'],
  emits: ['selected-marks', 'selected-operation', 'selected-logical-operator'],
  data() {
    return {
      selectedMarks: ((this.addableMarks || []) as AddableMark[]).filter(m => m.active),
      operation: this.defaultOperation,
    }
  },
  computed: {
    noneActive() {
      return this.selectedMarks.length === 0
    },
    prefix() {
      const operation = this.operation
      if (operation === 'add') return '+'
      if (operation === 'remove') return '-'
      return ''
    },
    label() {
      if (this.operation === 'remove all') return 'remove Marks'
      return this.noneActive
        ? 'No Mark'
        : this.selectedMarks.map(m => `${this.prefix}${m.name}`).join(',')
    }
  },
  watch: {
    addableMarks(marks: AddableMark[]) {
      this.selectedMarks = marks.filter(m => m.active)
    },
    defaultOperation(op: MarkOperationType) {
      this.operation = op
    }
  },
  methods: {
    forwardSelectedMarks(marks: AddableMark[]) {
      this.selectedMarks = marks
      this.$emit('selected-marks', marks)
    },
    forwardSelectedOperation(operation: MarkOperationType) {
      this.operation = operation
      this.$emit('selected-operation', operation)
    },
    forwardSelectedLogicalOperator(operator: MarksLogicalOperator) {
      this.$emit('selected-logical-operator', operator)
    }
  }
}
</script>