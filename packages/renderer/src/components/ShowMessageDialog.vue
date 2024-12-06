<template>
  <q-dialog :model-value="visible" full-width>
    <q-card>
      <q-card-section>
        <div class="text-h5 text-bold">{{ messageTitle }}</div>
      </q-card-section>
      <q-card-section horizontal class="q-pa-md q-ma-md">
        <q-icon :name="messageIcon" size="xl" :color="messageColor" class="q-pt-sm" />
        <q-card-section>
          <div :class="`${messageType}-message`" class="text" v-html="messageLines.join('<br>')"
            style="overflow-y: auto" />
        </q-card-section>
      </q-card-section>
      <q-card-actions>
        <q-btn round icon="mdi-content-copy" title="copy message to clipboard" @click="copyToClipboard()" />
        <span style="width: 1rem"> </span>
        <q-badge v-if="copiedToClipboard" color="info">message copied</q-badge>
        <q-space />
        <q-btn label="Ok" color="primary" @click="$emit('closeShowMessageDialog')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { FeedbackMessageType } from '../common';
import { copyToClipboard } from 'quasar'

export default {
  props: ['visible', 'message', 'icon', 'color'],
  emits: ['closeShowMessageDialog'],
  data() {
    return {
      copiedToClipboard: false
    }
  },
  computed: {
    messageType() {
      return this.message.type as FeedbackMessageType
    },
    messageTitle() {
      if (this.messageType === 'error') return 'Error'
      if (this.messageType === 'command-line') return 'Conversion command'
      if (this.messageType === 'success') return 'Success'
      return ''
    },
    messageIcon() {
      if (this.icon) return this.icon;
      if (this.messageType === 'error') return 'mdi-alert-circle';
      if (this.messageType === 'command-line') return 'mdi-bash';
      if (this.messageType === 'success') return 'mdi-check';
      return 'mdi-alert-circle';
    },
    messageColor() {
      if (this.color) return this.color;
      if (this.messageType === 'error') return 'negative';
      if (this.messageType === 'command-line') return 'info';
      if (this.messageType === 'success') return 'positive';
      return 'warning';
    },
    messageLines(): string[] {
      return (this.message.message as string).split(/[\r]?[\n]/).filter(s => s.length > 0)
    }
  },
  methods: {
    copyToClipboard() {
      copyToClipboard(this.message.message)
        .then(() => {
          this.copiedToClipboard = true
          setTimeout(() => { this.copiedToClipboard = false }, 1000)
        })
        .catch(() => {
          // fail
        })
    }
  }
}
</script>

<style>
.command-line-message {
  width: 100%;
  font-family: monospace;
  padding: .3rem;
  border: 1px solid black;
}
</style>