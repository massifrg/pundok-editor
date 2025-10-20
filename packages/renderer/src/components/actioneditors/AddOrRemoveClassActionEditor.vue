<template>
  <q-input v-model='className' label="class:" @update:model-value="change" />
</template>

<script lang="ts">
import { AddOrRemoveClassActionProps } from '../../common';

export default {
  props: ['index', 'start-props'],
  emits: ['set-props'],
  data() {
    const props: AddOrRemoveClassActionProps = this['start-props']
    return {
      className: props?.class || ''
    }
  },
  methods: {
    change(value: string | number | null) {
      this.$emit('set-props', this.index, { class: this.className } as AddOrRemoveClassActionProps)
    }
  }
}
</script>