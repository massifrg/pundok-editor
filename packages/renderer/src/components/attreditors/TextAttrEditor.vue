<template>
  <q-card>
    <q-input stack-label :model-value="value" :label="attrName" @update:model-value="updateText" @keydown="keydown" />
  </q-card>
</template>

<script lang="ts">
import { isNumber } from 'lodash';

export default {
  props: {
    attrName: String,
    startValue: String,
    enterCommits: Boolean,
  },
  emits: ['update-attribute', 'esc-key-pressed', 'enter-key-pressed', 'commit'],
  data() {
    return {
      value: this.startValue || '',
    };
  },
  watch: {
    startValue(newValue) {
      this.value = newValue;
    },
  },
  methods: {
    updateText(newValue: string | number | null) {
      if (newValue || newValue === '') {
        const value = isNumber(newValue) ? newValue.toString() : newValue
        this.value = value;
        this.$emit('update-attribute', this.attrName, value);
      }
    },
    keydown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Enter':
          this.$emit('enter-key-pressed')
          if (this.enterCommits)
            this.$emit('commit')
          e.preventDefault()
          break
        case 'Escape':
          this.$emit('esc-key-pressed')
          e.preventDefault()
          break
      }
    },
  }
};
</script>