<template>
  <div class="q-pa-sm">
    <q-input v-model="text" filled dark outlined type="textarea" autofocus :input-style="inputStyle()" class="text-h6"
      spellcheck="false" @keydown="keydown" />
  </div>
</template>

<script lang="ts">
const INPUT_COMMON_STYLES = [
  "font-family: monospace",
  "color: antiquewhite",
  "line-height: 1.4",
  "font-size: smaller",
  "min-width: 70vw",
]
const INPUT_IS_BLOCK_STYLES = [
  "min-height: 70vh",
]

export default {
  emits: ['update-attribute', 'commit', 'cancel'],
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
          if (this.isBlock && !e.ctrlKey)
            return true
          else
            e.preventDefault()
          this.$emit('commit')
          break
        case 'Escape':
          this.$emit('cancel')
          e.preventDefault()
          break
      }
    },
    inputStyle() {
      return [
        ...INPUT_COMMON_STYLES,
        ...(this.isBlock ? INPUT_IS_BLOCK_STYLES : [])
      ].join(';')
    }
  }
}
</script>