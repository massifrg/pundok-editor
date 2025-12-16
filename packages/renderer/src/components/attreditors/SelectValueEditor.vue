<template>
  <q-card align="center">
    <q-btn-toggle v-model="value" :options="options" toggle-color="primary" color="white" text-color="primary"
      :title="title" no-caps no-wrap @update:model-value="update" />
  </q-card>
</template>

<script lang="ts">

export default {
  props: ['attrName', 'startValue', 'options'],
  emits: ['update-attribute'],
  computed: {
    title() {
      const options: { label: string, value: any, title?: string }[] = this.options || []
      const option = options.find(v => v.value == this.value)
      return option?.title || option?.label
    }
  },
  data() {
    return {
      value: this.startValue || this.options[0].value
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