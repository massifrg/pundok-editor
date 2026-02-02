<template>
  <q-dialog :model-value="visible">
    <q-card>
      <q-card-section>
        <q-input v-model="value" :label="label" :default="startValue" :rules="[validate as ValidationRule]"
          no-error-icon @keyup="onKeypress"></q-input>
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
    onOkClick() {
      const validate = this.validate
      if (!validate || (validate && this.validate(this.value) === true)) {
        this.$emit('set-value', this.value)
        this.hide()
      }
    },
    onDialogHide() {
    },
    hide() {
      this.onDialogHide()
      this.$emit('close-dialog')
    }
  }
}
</script>