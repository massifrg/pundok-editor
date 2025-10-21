<script lang="ts">
import { ActionNameWithProps } from '../common';
import ActionsList from './ActionsList.vue';

export default {
  props: ['editor'],
  data() {
    return {
      isEmpty: true,
      label: 'no actions'
    }
  },
  components: {
    ActionsList
  },
  methods: {
    update(actions: ActionNameWithProps[]) {
      this.isEmpty = actions.length === 0
      this.label = actions.map(a => a.name).join(',')
    }
  }
}
</script>
<template>
  <q-btn-dropdown class="q-ma-xs" size="sm" rounded color="primary" :outline="isEmpty" :label="label"
    title="Actions on replaced text">
    <!-- :no-caps="noneActive || operation === 'remove all'" :menu-anchor="menuAnchor" :menu-self="menuSelf" -->
    <ActionsList :editor="editor" @update-actions="update" />
  </q-btn-dropdown>
</template>