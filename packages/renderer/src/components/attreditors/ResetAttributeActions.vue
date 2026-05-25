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
import { t } from '../../i18n'
export default {
  props: ['attributeName', 'attributeDesc'],
  emits: ['reset-attribute'],
  computed: {
    title() {
      return this.$t('attributesEditor.resetAttribute', {
        name: this.attributeDesc || this.$t('attributesEditor.attribute', {
          name: this.attributeName
        })
      })
    }
  }
}
</script>