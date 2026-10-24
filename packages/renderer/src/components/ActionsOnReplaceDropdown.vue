<script lang="ts">
import { QBtnDropdown } from 'quasar';
import { actionsAsText } from '../actions';
import { ActionNameWithProps } from '../common';
import ActionsList from './ActionsList.vue';
import { getEditorConfiguration } from '../schema';


export default {
  props: ['editor', 'actions', 'searchOnly'],
  emits: ['update-actions'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    }
  },
  data() {
    return {
      isEmpty: true,
      label: actionsAsText(this.actions, getEditorConfiguration(this.editor))
    }
  },
  watch: {
    actions(value) {
      this.isEmpty = !value || value.length === 0
      this.label = actionsAsText(value, this.configuration)
    }
  },
  components: {
    ActionsList
  },
  methods: {
    update(actions: ActionNameWithProps[]) {
      this.isEmpty = !actions || actions.length === 0
      this.label = actionsAsText(actions, this.configuration)
      // forward event
      this.$emit('update-actions', actions)
    },
    hideMenu() {
      (this.$refs.actionsOnReplace as QBtnDropdown).hide()
    }
  }
}
</script>
<template>
  <q-btn-dropdown ref="actionsOnReplace" class="q-ma-xs" size="sm" rounded color="primary" :outline="isEmpty"
    :label="label" no-caps>
    <!-- :no-caps="noneActive || operation === 'remove all'" :menu-anchor="menuAnchor" :menu-self="menuSelf" -->
    <ActionsList :editor="editor" :start-actions="actions" :searchOnly="searchOnly" style="min-width: 100%;"
      @update-actions="update" @close="hideMenu()" />
  </q-btn-dropdown>
</template>