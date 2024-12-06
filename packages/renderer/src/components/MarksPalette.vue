<template>
  <q-card>
    <span class="q-px-sm q-ma-xs">Marks:</span>
    <q-card-section horizontal>
      <q-btn v-for="m in addableSimpleMarks()" class="q-ma-xs" size="sm" rounded color="primary" :outline="!m.active"
        @click="toggleMark(m)" :label="m.label" :icon="m.icon" :title="m.title" />
    </q-card-section>
    <span class="q-px-sm q-ma-xs" v-if="addableCustomStyles().length > 0">Custom styles:</span>
    <q-card-section horizontal>
      <q-btn v-for="m in addableCustomStyles()" class="q-ma-xs" size="sm" rounded color="primary" :outline="!m.active"
        @click="toggleMark(m)" :label="m.label" :icon="m.icon" :title="m.title" />
    </q-card-section>
    <span class="q-px-sm q-ma-xs" v-if="addableSpans().length > 0">Span with classes and/or
      attributes:</span>
    <q-card-section horizontal>
      <q-btn v-for="s in addableSpans()" class="q-ma-xs" size="sm" rounded color="primary" :outline="!s.active"
        @click="toggleMark(s)" :label="s.label" :icon="s.icon" :title="s.title" />
    </q-card-section>
    <q-card-actions v-if="operations || showLogicalOperator" horizontal align="center" class="q-mx-sm">
      <q-btn-toggle v-if="operations" v-model="operation" toggle-color="primary" size="sm" :options="operationOptions"
        @update:model-value="$emit('selected-operation', operation)" />
      <q-btn-toggle v-if="showLogicalOperator" :model-value="selectedLogicalOperator" :options="logicalOperatorOptions"
        toggle-color="primary" @update:model-value="updateLogicalOperator" size="sm" />
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { AddableMark } from '.';
import { MarkOperation, MarksLogicalOperator } from '../schema';

export default {
  props: ['editor', 'addableMarks', 'operations', 'defaultOperation', 'logicalOperator', 'showLogicalOperator'],
  emits: ['selected-marks', 'selected-operation', 'selected-logical-operator'],
  data() {
    return {
      operation: this.defaultOperation,
      selectedLogicalOperator: this.logicalOperator || 'and' as MarksLogicalOperator,
      logicalOperatorOptions: [
        {
          label: 'match all',
          value: 'and' as MarksLogicalOperator
        },
        {
          label: 'match one or more',
          value: 'or' as MarksLogicalOperator
        },
      ]
    }
  },
  computed: {
    selectedMarks(): AddableMark[] {
      return (this.addableMarks as AddableMark[]).filter(am => am.active)
    },
    operationOptions() {
      const operations: MarkOperation[] = this.operations || []
      return operations.map(o => {
        const op = o.toString()
        return {
          label: op.substring(0, 1).toUpperCase() + op.substring(1),
          value: o
        }
      })
    },
  },
  methods: {
    addableSimpleMarks(): AddableMark[] {
      return (this.addableMarks as AddableMark[]).filter(am => am.kind === "base")
    },
    addableCustomStyles(): AddableMark[] {
      return (this.addableMarks as AddableMark[]).filter(am => am.kind === "style")
    },
    addableSpans(): AddableMark[] {
      return (this.addableMarks as AddableMark[]).filter(am => am.kind === 'span')
    },
    toggleMark(addableMark: AddableMark) {
      addableMark.active = !addableMark.active
      this.$emit('selected-marks', this.selectedMarks)
    },
    updateLogicalOperator(value: MarksLogicalOperator) {
      this.selectedLogicalOperator = value
      this.$emit('selected-logical-operator', value)
    }
  }
}
</script>