<template>
  <q-space />
  <q-card-actions align="center">
    <q-btn icon="reload" :title="title" size="xs" @click="$emit('reset-attribute', attributeName)" />
  </q-card-actions>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from '../helpers';
setupQuasarIcons()
</script>

<script lang="ts">
export default {
  props: ['attributeName', 'attributeDesc'],
  emits: ['reset-attribute'],
  computed: {
    title() {
      return 'reset ' + (this.attributeDesc || `attribute "${this.attributeName}"`)
    }
  }
}
</script>