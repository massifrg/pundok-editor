<template>
  <div class="q-pa-sm">
    <q-input v-model="text" filled dark outlined type="textarea"
      input-style="font-family: monospace; color: antiquewhite" class="text-h6" spellcheck="false" @keydown="keydown" />
  </div>
</template>

<script lang="ts">
export default {
  emits: ['update-attribute', 'enter-key-pressed', 'esc-key-pressed'],
  props: ['startValue', 'format', 'isBlock'],
  data() {
    return {
      text: this.startValue
    }
  },
  watch: {
    startValue(value) {
      this.text = value
    },
    text(newValue: string) {
      if (newValue) {
        this.text = this.isBlock ? newValue : newValue.replace(/\r?\n/g, '');
        this.$emit('update-attribute', 'text', this.text);
      }
    },
  },
  methods: {
    keydown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Enter':
          if (!this.isBlock) e.preventDefault()
          this.$emit('enter-key-pressed')
          break
        case 'Escape':
          this.$emit('esc-key-pressed')
          e.preventDefault()
          break
      }
    },
  }
}
</script>