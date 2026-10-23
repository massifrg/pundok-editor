<template>
  <q-menu auto-close anchor="top end" self="top start">
    <q-list dense>
      <q-item v-for="action in actions" :title="titleFor(action)" clickable @click="setAction(action)" v-close-popup>
        <q-item-section side>
          <span>
            <q-icon :name="action.icon" size="sm" />
            <q-icon :name="action.iconRight" size="sm" />
          </span>
        </q-item-section>
        <q-item-section>{{ labelFor(action) }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script lang="ts">
import { ActionForNodeOrMark, labelForAction, tooltipForAction } from '../actions'
import { useActions } from '../stores'

export default {
  props: ['editor', 'nodeOrMark', 'actions'],
  data() {
    return {
      useActions: useActions(),
    }
  },
  methods: {
    setAction(action: ActionForNodeOrMark) {
      this.useActions.setAction(action)
    },
    titleFor(action: ActionForNodeOrMark) {
      const t = (this as any).$t ? (this as any).$t.bind(this) : undefined
      return tooltipForAction(action, this.editor, t)
    },
    labelFor(action: ActionForNodeOrMark) {
      const t = (this as any).$t ? (this as any).$t.bind(this) : undefined
      return labelForAction(action, this.editor, t)
    },
  },
}
</script>