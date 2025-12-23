<template>
  <q-card>
    <span class="q-px-sm q-ma-xs">Marks:</span>
    <q-card-section horizontal>
      <q-btn v-for="m in addableSimpleMarks()" class="q-ma-xs" size="sm" rounded :color="colorFor(m)"
        :outline="getState(m) === 0" @click="toggleMark(m)" :label="labelFor(m)" :icon="m.icon" :title="titleFor(m)" />
    </q-card-section>
    <span class="q-px-sm q-ma-xs" v-if="addableCustomStyles().length > 0">Custom styles:</span>
    <q-card-section horizontal>
      <q-btn v-for="m in addableCustomStyles()" class="q-ma-xs" size="sm" rounded :color="colorFor(m)"
        :outline="getState(m) === 0" @click="toggleMark(m)" :label="labelFor(m)" :icon="m.icon" :title="titleFor(m)" />
    </q-card-section>
    <span class="q-px-sm q-ma-xs" v-if="addableSpans().length > 0">Span with classes and/or
      attributes:</span>
    <q-card-section horizontal>
      <q-btn v-for="s in addableSpans()" class="q-ma-xs" size="sm" rounded :color="colorFor(s)"
        :outline="getState(s) === 0" @click="toggleMark(s)" :label="labelFor(s)" :icon="s.icon" :title="titleFor(s)" />
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import { isEqual } from 'lodash';
import { AddableMark } from './helpers/addableMark';

export default {
  props: ['editor', 'addableMarks', 'positiveMarks', 'negativeMarks'],
  emits: ['selected-marks'],
  data() {
    return {
      states: Object.fromEntries(((this.addableMarks || []) as AddableMark[])
        .map(am => {
          const state = this.positiveMarks && this.positiveMarks.find((p: AddableMark) => isEqual(am, p))
            ? 1
            : this.negativeMarks && this.negativeMarks.find((n: AddableMark) => isEqual(am, n))
              ? -1
              : 0
          return [am.name, state]
        })),
    }
  },
  computed: {
    selectedPositive(): AddableMark[] {
      const names = Object.entries(this.states)
        .filter(([name, state]) => state > 0)
        .map(([name, state]) => name)
      return this.addableMarksWithNames(names)
    },
    selectedNegative(): AddableMark[] {
      const names = Object.entries(this.states)
        .filter(([name, state]) => state < 0)
        .map(([name, state]) => name)
      return this.addableMarksWithNames(names)
    }
  },
  methods: {
    getState(am: AddableMark) {
      return this.states[am.name]
    },
    addableMarksWithNames(names: string[]): AddableMark[] {
      return ((this.addableMarks || []) as AddableMark[]).filter(am => names.includes(am.name))
    },
    addableSimpleMarks(): AddableMark[] {
      return (this.addableMarks as AddableMark[]).filter(am => am.markspec.kind === "base")
    },
    addableCustomStyles(): AddableMark[] {
      return (this.addableMarks as AddableMark[]).filter(am => am.markspec.kind === "style")
    },
    addableSpans(): AddableMark[] {
      return (this.addableMarks as AddableMark[]).filter(am => am.markspec.kind === 'span')
    },
    labelFor(am: AddableMark) {
      const state = this.getState(am)
      if (am.icon) return undefined
      const prefix = state === 0 ? '' : (state > 0 ? '+' : '-')
      return prefix + (am.label || am.name)
    },
    colorFor(am: AddableMark) {
      const state = this.getState(am)
      return state === 0 ? 'secondary' : (state > 0 ? 'positive' : 'negative')
    },
    titleFor(am: AddableMark) {
      const state = this.getState(am)
      const suffix = state === 0 ? '' : (state > 0 ? ' present' : ' absent')
      return am.title + suffix
    },
    toggleMark(addableMark: AddableMark) {
      let state = this.getState(addableMark)
      state = state === 0 ? 1 : (state > 0 ? -1 : 0)
      this.states = { ...this.states, [addableMark.name]: state }
      this.emitSelectedMarks()
    },
    emitSelectedMarks() {
      this.$emit('selected-marks', this.selectedPositive, this.selectedNegative)
    }
  }
}
</script>