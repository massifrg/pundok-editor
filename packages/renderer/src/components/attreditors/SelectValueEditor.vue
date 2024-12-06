<template>
  <q-card align="center">
    <q-btn-toggle v-model="value" :options="options" toggle-color="primary" color="white" text-color="primary"
      @update:model-value="update" />
  </q-card>
</template>

<script lang="ts">

export default {
  props: ['attrName', 'startValue', 'options'],
  emits: ['update-attribute'],
  data() {
    return {
      value: this.startValue
    }
  },
  watch: {
    startValue(value) {
      this.value = value
    }
  },
  methods: {
    update(newValue: string) {
      console.log(`${this.attrName} new value: ${newValue}`)
      this.$emit('update-attribute', this.attrName, newValue)
    }
  }
};
</script>