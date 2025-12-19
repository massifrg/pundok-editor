<template>
  <q-btn-dropdown class="q-ma-xs" size="sm" rounded color="primary" :icon="icon" :outline="isNoneSelected"
    :label="label" :title="title || 'Select marks or custom styles that must be present or absent'"
    :no-caps="isNoneSelected" :menu-anchor="menuAnchor" :menu-self="menuSelf">
    <MarksPalette :editor="editor" :addableMarks="addableMarks" :positiveMarks='positiveMarks'
      :negativeMarks='negativeMarks' @selected-marks="forwardSelectedMarks" />
  </q-btn-dropdown>
</template>

<script lang="ts">
import { AddableMark } from './helpers/addableMark';
import MarksPalette from './MarksPalette.vue'

const NONE_SELECTED_LABEL = 'no filter'

export default {
  components: { MarksPalette },
  props: [
    'editor',
    'title',
    'icon',
    'addableMarks',      // AddableMark[]
    'positiveMarks',     // AddableMark[]
    'negativeMarks',     // AddableMark[]
    'noneSelectedLabel',
    'menuAnchor',
    'menuSelf'
  ],
  emits: ['selected-marks'],
  data() {
    return {
      label: this.computeLabel(this.positiveMarks || [], this.negativeMarks || []),
    }
  },
  computed: {
    isNoneSelected(): boolean {
      return (this.positiveMarks?.length || 0) + (this.negativeMarks?.length || 0) === 0
    }
  },
  methods: {
    computeLabel(positive: AddableMark[], negative: AddableMark[]) {
      return (positive?.length || 0) + (negative?.length || 0) === 0
        ? this.noneSelectedLabel || NONE_SELECTED_LABEL
        : [...positive.map(p => `+${p.name}`), ...negative.map(n => `-${n.name}`)].join(',')
    },
    forwardSelectedMarks(positive: AddableMark[], negative: AddableMark[]) {
      this.label = this.computeLabel(positive, negative)
      this.$emit('selected-marks', positive, negative)
    }
  }
}
</script>