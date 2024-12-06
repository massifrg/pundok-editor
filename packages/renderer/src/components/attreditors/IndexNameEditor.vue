<template>
  <q-select v-model="indexName" :options="indicesNames" @update:model-value="updateIndexName" />
</template>

<script lang="ts">
import { INDEX_NAME_ATTR } from '../../common';

export default {
  props: ['indicesNames', 'startValue'],
  emits: ['update-attribute'],
  data() {
    return {
      indexName: this.startValue,
    }
  },
  methods: {
    updateIndexName() {
      this.$emit('update-attribute', INDEX_NAME_ATTR, this.indexName)
    }
  }
}
</script>