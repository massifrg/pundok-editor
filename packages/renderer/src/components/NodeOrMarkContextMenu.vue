<template>
  <q-list dense>
    <q-item v-for="action in actionsItems" :title="titleFor(action)" clickable @click="setAction(action)"
      v-close-popup="isGroup(action) ? 0 : 1">
      <!-- :v-close-popup=""> -->
      <q-item-section side>
        <span>
          <q-icon :name="action.icon" size="sm" />
          <q-icon :name="action.iconRight" size="sm" />
        </span>
      </q-item-section>
      <q-item-section>{{ action.label }}</q-item-section>
      <q-item-section v-if="isGroup(action)" side>
        <q-icon name="mdi-arrow-right" />
      </q-item-section>
      <ActionsMenu v-if="isGroup(action)" :editor="editor" :node-or-mark="nodeOrMark"
        :actions="actionsOfGroup[action.name]" />
    </q-item>
  </q-list>
</template>

<script lang="ts">
import { isString } from 'lodash'
import {
  ActionForNodeOrMark,
  ActionsGroup,
  actionsForNodeOrMark,
  canExecuteEditorAction
} from '../actions'
import { useActions } from '../stores'
import ActionsMenu from './ActionsMenu.vue'

type ActionOrGroup = ActionForNodeOrMark | ActionsGroup

const BASE_GROUP_NAME = '_'

export default {
  components: { ActionsMenu },
  props: ['editor', 'nodeOrMark', 'groupName'],
  data() {
    return {
      visible: true,
      actions: useActions(),
    }
  },
  computed: {
    actionsOfGroup(): Record<string, ActionForNodeOrMark[]> {
      const aog: Record<string, ActionForNodeOrMark[]> = {}
      const editor = this.editor
      if (!editor) return {}
      actionsForNodeOrMark(editor.state, this.nodeOrMark).forEach(a => {
        const groupname = a?.group?.name || BASE_GROUP_NAME
        aog[groupname] = aog[groupname] || []
        if (canExecuteEditorAction(editor, a))
          aog[groupname].push(a)
      })
      return aog
    },
    actionsItems(): ActionOrGroup[] {
      let result: ActionOrGroup[] = []
      const aog = this.actionsOfGroup
      const groupnames = Object.keys(aog)
      groupnames.sort((g1, g2) => g1 === BASE_GROUP_NAME ? -1 : 1)
      const groupName = this.groupName || BASE_GROUP_NAME
      groupnames.forEach(n => {
        const actions = aog[n]
        if (n === groupName) {
          result = result.concat(actions)
        } else if (actions.length > 0) {
          const group = actions[0].group
          if (group) result.push(group)
        }
      })
      return result
    }
  },
  methods: {
    isAction(a: ActionOrGroup) {
      return this.actionsOfGroup[a.name] === undefined
    },
    isGroup(a: ActionOrGroup) {
      return this.actionsOfGroup[a.name] !== undefined
    },
    setAction(action: ActionForNodeOrMark) {
      if (this.isAction(action))
        this.actions.setAction(action)
    },
    titleFor(action: ActionForNodeOrMark) {
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