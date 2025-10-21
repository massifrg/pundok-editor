<template>
  <q-input v-model='className' label="class:" @update:model-value="change" />
</template>

<script lang="ts">
import { AddOrRemoveClassActionProps } from '../../common';

export default {
  props: ['index', 'action'],
  emits: ['set-props'],
  data() {
    return {
      className: this.action?.props?.class || ''
    }
  },
  methods: {
    change(value: string | number | null) {
      this.$emit('set-props', this.index, { class: this.className } as AddOrRemoveClassActionProps)
    }
  }
}
</script>