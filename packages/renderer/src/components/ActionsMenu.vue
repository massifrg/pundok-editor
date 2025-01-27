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
        <q-item-section>{{ action.label }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script lang="ts">
import { isString } from 'lodash'
import { ActionForNodeOrMark } from '../actions'
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
      // console.log(`action tooltip!`)
      const actionTooltip = action.tooltip
      if (actionTooltip) {
        return isString(actionTooltip)
          ? actionTooltip
          : actionTooltip(this.editor, action)
      }
    }
  },
}
</script>