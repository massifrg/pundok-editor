<script lang="ts">
import { ActionName } from '../actions';
import {
  ActionNameWithProps,
  AddOrRemoveClassActionProps,
  AddOrRemoveCustomStyleActionProps,
  AddOrRemoveMarkActionProps,
  SetSpanActionProps
} from '../common';
import ActionsList from './ActionsList.vue';

function actionsAsText(actions: ActionNameWithProps[]) {
  if (!actions || actions.length === 0)
    return 'no actions'
  return actions.map(a => {
    const prefix = a.name.startsWith('add')
      ? '+'
      : a.name.startsWith('remove')
        ? '-'
        : ''
    switch (a.name as ActionName) {
      case 'add-mark':
      case 'remove-mark':
        return `${prefix}${(a?.props as AddOrRemoveMarkActionProps).markType}`
      case 'add-custom-style':
      case 'remove-custom-style':
        return `${prefix}${(a?.props as AddOrRemoveCustomStyleActionProps).styleName}`
      case 'add-class':
      case 'remove-class':
        return `${prefix}.${(a?.props as AddOrRemoveClassActionProps).className}`
      case 'set-span':
        return `${prefix}${(a?.props as SetSpanActionProps).name}`
      default:
        return a.name
    }
  }).join(',')
}

export default {
  props: ['editor', 'actions'],
  emits: ['update-actions'],
  data() {
    return {
      isEmpty: true,
      label: actionsAsText(this.actions)
    }
  },
  watch: {
    actions(value) {
      this.isEmpty = !value || value.length === 0
      this.label = actionsAsText(value)
    }
  },
  components: {
    ActionsList
  },
  methods: {
    update(actions: ActionNameWithProps[]) {
      this.isEmpty = actions.length === 0
      this.label = actionsAsText(actions)
      // forward event
      this.$emit('update-actions', actions)
    }
  }
}
</script>
<template>
  <q-btn-dropdown class="q-ma-xs" size="sm" rounded color="primary" :outline="isEmpty" :label="label"
    title="Actions on replaced text">
    <!-- :no-caps="noneActive || operation === 'remove all'" :menu-anchor="menuAnchor" :menu-self="menuSelf" -->
    <ActionsList :editor="editor" :start-actions="actions" @update-actions="update" />
  </q-btn-dropdown>
</template>