<template>
  <q-dialog :model-value="modelValue" persistent>
    <q-card>
      <q-card-section class="row items-center">
        <q-avatar icon="mdi-content-save-alert" :color="color_unsaved" text-color="white" />
        <span class="q-ml-sm"><b>This editor has unsaved content!</b></span>
      </q-card-section>
      <q-card-section v-if="extraValues.length > 0">
        <q-toggle v-for="(ev, i) in extraValues" v-model="values[i]" :key="ev.name" :label="ev.label"
          :false-value="ev.values[0] !== undefined ? ev.values[0] : false"
          :true-value="ev.values[1] !== undefined ? ev.values[1] : true" :color="ev.color" keep-color
          @update:model-value="updateExtraValue(i)" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat :label="cancelLabel" :color="cancelColor" @click="canceled()" />
        <q-btn flat :label="confirmLabel" :color="confirmColor" @click="confirmed()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { COLOR_UNSAVED } from '../common';
import { PendingOperationExtraValue } from './helpers/pending';

export default {
  props: ['modelValue', 'pendingOperation'],
  emits: ['pending-canceled', 'pending-confirmed', 'update-value'],
  data() {
    return {
      values: [] as any[],
      color_unsaved: COLOR_UNSAVED
    }
  },
  watch: {
    pendingOperation(pending) {
      const extraValues: PendingOperationExtraValue[] = pending?.extraValues || []
      this.values = extraValues.map(ev => ev.default !== undefined ? ev.default : ev.values[0])
    }
  },
  computed: {
    pendingType() {
      return this.pendingOperation?.type
    },
    cancelLabel() {
      return this.pendingOperation?.cancel?.label || 'Cancel'
    },
    cancelColor() {
      return this.pendingOperation?.cancel?.color || 'primary'
    },
    confirmLabel() {
      return this.pendingOperation?.confirm?.label || 'Confirm'
    },
    confirmColor() {
      return this.pendingOperation?.confirm?.color || 'primary'
    },
    extraValues(): PendingOperationExtraValue[] {
      return this.pendingOperation?.extraValues || []
    }
  },
  methods: {
    canceled() {
      this.$emit('pending-canceled', this.pendingOperation)
    },
    confirmed() {
      this.$emit('pending-confirmed', this.pendingOperation)
    },
    updateExtraValue(index: number) {
      const extraValue = this.extraValues[index]
      if (extraValue) {
        this.$emit('update-value', extraValue.name, this.values[index])
      }
    }
  }
}

</script>