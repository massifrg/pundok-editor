<template>
  <div class="q-pa-md">
    <q-slider v-model="value" :min="minValue" :max="maxValue" :step="1" label label-always snap
      @update:model-value="updateValue" />
  </div>
</template>

<script lang="ts">
import { isString } from 'lodash';

export default {
  props: {
    attrName: String,
    minValue: Number,
    maxValue: Number,
    startValue: Number,
  },
  emits: ['update-attribute'],
  data() {
    return {
      value: this.startValue
    }
  },
  watch: {
    startValue(newValue) {
      this.value = newValue
    }
  },
  methods: {
    updateValue(newValue: string | number | null) {
      if (newValue !== null) {
        const value = isString(newValue) ? parseInt(newValue) : newValue
        const minValue = this.minValue === undefined ? 1 : this.minValue
        const maxValue = this.maxValue === undefined ? 1 : this.maxValue
        console.log(`minValue=${minValue}, maxValue=${maxValue}`)
        if (this.attrName && value >= minValue && value <= maxValue) {
          this.$emit('update-attribute', this.attrName, newValue);
        }
      }
    },
  },
};
</script>