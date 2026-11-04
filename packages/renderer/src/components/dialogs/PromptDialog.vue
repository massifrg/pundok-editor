<template>
  <q-dialog :model-value="visible" @hide="$emit('close-dialog')">
    <q-card>
      <q-card-section>
        <q-input v-model="value" :label="label" :default="startValue" :rules="[validate as ValidationRule]"
          autofocus no-error-icon @focus="selectInput" @keyup="onKeypress"></q-input>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn :disable="validate && !validate(value)" color="primary" label="OK" @click="onOkClick" />
        <q-btn color="primary" label="Cancel" @click="onCancelClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { ValidationRule } from 'quasar';


export default {
  props: {
    visible: {
      required: true,
      default: false,
      type: Boolean
    },
    startValue: {
      required: false,
      default: '',
      type: String,
    },
    validate: {
      required: false,
      type: Function
    },
    label: {
      required: false,
      type: String,
    }
  },
  emits: ['set-value', 'close-dialog'],
  data() {
    return {
      value: this.startValue
    }
  },
  watch: {
    startValue(value: string) {
      this.value = value
    },
  },
  methods: {
    onCancelClick() {
      this.hide()
    },
    onKeypress(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        this.onOkClick()
        e.preventDefault()
        return false
      }
    },
    selectInput(e: Event) {
      const input = e.target
      if (input instanceof HTMLInputElement) input.select()
    },
    onOkClick() {
      const validate = this.validate
      if (!validate || (validate && this.validate(this.value) === true)) {
        this.$emit('set-value', this.value)
        this.hide()
      }
    },
    hide() {
      this.$emit('close-dialog')
    }
  }
}
</script>