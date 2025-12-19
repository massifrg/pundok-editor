<template>
  <q-btn-dropdown class="q-ma-xs" size="sm" rounded color="primary" :icon="icon" :outline="noneSelected" :label="label"
    :title="title || 'Select marks or custom styles that must be present or absent'" :no-caps="noneSelected"
    :menu-anchor="menuAnchor" :menu-self="menuSelf">
    <MarksPalette :editor="editor" :addableMarks="addableMarks" @selected-marks="forwardSelectedMarks" />
  </q-btn-dropdown>
</template>

<script lang="ts">
import { AddableMark } from './helpers/addableMark';
import MarksPalette from './MarksPalette.vue'

const NONE_SELECTED_LABEL = 'no filter'

export default {
  components: { MarksPalette },
  props: ['editor', 'title', 'icon', 'addableMarks', 'noneSelectedLabel', 'menuAnchor', 'menuSelf'],
  emits: ['selected-marks'],
  data() {
    return {
      noneSelected: true,
      label: this.noneSelectedLabel || NONE_SELECTED_LABEL,
    }
  },
  methods: {
    forwardSelectedMarks(positive: AddableMark[], negative: AddableMark[]) {
      console.log('selected marks:')
      console.log(positive)
      console.log(negative)
      this.noneSelected = positive.length + negative.length === 0
      this.label = this.noneSelected
        ? (this.noneSelectedLabel || NONE_SELECTED_LABEL)
        : [...positive.map(p => `+${p.name}`), ...negative.map(n => `-${n.name}`)].join(',')
      this.$emit('selected-marks', positive, negative)
    }
  }
}
</script>