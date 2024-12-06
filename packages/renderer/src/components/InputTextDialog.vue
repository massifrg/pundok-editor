<template>
  <q-dialog :model-value="visible">
    <q-card class="q-pa-md">
      <TextAttrEditor :start-value="startValue" :attr-name="label" @update-attribute="updateText"
        @esc-key-pressed="doCancel" @enter-key-pressed="doOk" />
      <q-card-actions>
        <q-space />
        <q-btn label="Ok" color="primary" @click="doOk()" />
        <q-btn label="Cancel" color="primary" @click="doCancel()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import TextAttrEditor from './attreditors/TextAttrEditor.vue';

export default {
  components: { TextAttrEditor },
  emits: ['close-dialog'],
  props: ['visible', 'label', 'startValue'],
  data() {
    return {
      text: this.startValue as string | null | undefined
    }
  },
  methods: {
    doOk() {
      this.$emit('close-dialog', this.text, this.startValue)
    },
    doCancel() {
      this.$emit('close-dialog')
    },
    updateText(_: string, text: string) {
      this.text = text
    }
  }
}
</script>