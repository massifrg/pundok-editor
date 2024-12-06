<template>
  <q-input class="q-mx-xs" v-model="targetUrl" label="URL" stack-label debounce="500"
    @update:model-value="updateTargetUrl" />
  <q-input class="q-mx-xs" v-model="targetTitle" label="title" stack-label debounce="500"
    @update:model-value="updateTargetTitle" />
</template>

<script lang="ts">

export default {
  props: ['editor', 'urlAttrName', 'url', 'title'],
  emits: ['update-attribute'],
  data() {
    return {
      targetUrl: this.url || '',
      targetTitle: this.title || '',
    }
  },
  watch: {
    url(value: string | null) {
      this.updateTargetUrl(value)
    },
    title(value: string | null) {
      this.updateTargetTitle(value)
    }
  },
  methods: {
    updateTargetUrl(value: string | number | null) {
      this.targetUrl = value
      this.$emit('update-attribute', this.urlAttrName || 'url', this.targetUrl)
    },
    updateTargetTitle(value: string | number | null) {
      this.targetTitle = value
      this.$emit('update-attribute', 'title', this.targetTitle)
    }
  }
}
</script>