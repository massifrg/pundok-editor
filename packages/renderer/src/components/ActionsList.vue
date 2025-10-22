<script lang="ts">
import { toRaw } from 'vue';
import { ActionName, availableAction, availableActionsNames } from '../actions';
import { ActionNameWithProps } from '../common';
import AddOrRemoveClassActionEditor from './actioneditors/AddOrRemoveClassActionEditor.vue'
import AddOrRemoveCustomStyleActionEditor from './actioneditors/AddOrRemoveCustomStyleActionEditor.vue'
import AddOrRemoveMarkActionEditor from './actioneditors/AddOrRemoveMarkActionEditor.vue'

export default {
  props: ['editor', 'startActions'],
  emits: ['update-actions'],
  data() {
    return {
      actions: (this.startActions || []) as ActionNameWithProps[],
      editableActionName: undefined as string | undefined,
    }
  },
  computed: {
    availableActions() {
      return availableActionsNames()
    }
  },
  watch: {
    actions(value) {
      this.notifyActions(value)
    }
  },
  components: {
    AddOrRemoveClassActionEditor,
    AddOrRemoveCustomStyleActionEditor,
    AddOrRemoveMarkActionEditor,
  },
  methods: {
    getAction(actionName: string) {
      return availableAction(actionName)
    },
    notifyActions(actions: ActionNameWithProps[]) {
      this.$emit('update-actions', actions)
    },
    actionIcon(actionName: string) {
      return this.getAction(actionName)?.icon
    },
    isAddOrRemoveClassAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-class' || name === 'remove-class'
    },
    isAddOrRemoveCustomStyleAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-custom-style' || name === 'remove-custom-style'
    },
    isAddOrRemoveMarkAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-mark' || name === 'remove-mark'
    },
    newActionItem(name?: string) {
      this.actions.push({
        name: name || this.availableActions[0],
        props: {}
      })
      this.notifyActions(this.actions)
    },
    setActionItem(index: number, name: string) {
      if (index >= 0 && index < this.actions.length) {
        if (this.actions[index].name !== name)
          this.actions = this.actions.map((a, i) => i === index ? { name } : a)
      }
    },
    moveActionItemUp(index: number) {
      if (index > 0) {
        const actions: ActionNameWithProps[] = toRaw(this.actions)
        this.actions = actions.map((a, i) => {
          if (i === index - 1) return { ...actions[index] }
          else if (i === index) return { ...actions[index - 1] }
          else return { ...a }
        })
      }
    },
    moveActionItemDown(index: number) {
      if (index < this.actions.length - 1) {
        const actions: ActionNameWithProps[] = toRaw(this.actions)
        this.actions = actions.map((a, i) => {
          if (i === index) return { ...actions[index + 1] }
          else if (i === index + 1) return { ...actions[index] }
          else return { ...a }
        })
      }
    },
    removeActionItem(index: number) {
      this.actions = this.actions.filter((_, i) => i !== index)
    },
    setActionProps(index: number, props: object) {
      this.actions = this.actions.map((a, i) => index !== i ? a : { name: a.name, props })
      console.log(`set props of ${index}. ${this.actions[index].name} to ${JSON.stringify(this.actions[index].props)}`)
    }
  }
}
</script>

<template>
  <q-card>
    <q-card-section class="q-px-xs" style="min-width: 640px">
      <div class="q-text-h6 q-ma-md">Operations on the replaced text:</div>
      <q-list>
        <q-item v-for="(a, index) in actions" dense>
          <q-item-section side>
            <q-chip>{{ index + 1 }}</q-chip>
          </q-item-section>
          <q-item-section side>
            <q-icon v-if="index > 0" size="xs" name="mdi-arrow-up" @click="moveActionItemUp(index)"
              @click.stop.prevent />
            <q-icon v-if="index < actions.length - 1" size="xs" name="mdi-arrow-down" @click="moveActionItemDown(index)"
              @click.stop.prevent />
          </q-item-section>
          <q-item-section>
            <q-btn-dropdown :label="a.name" :icon="actionIcon(a.name)">
              <q-item v-for="action_name in availableActions" clickable @click="setActionItem(index, action_name)"
                v-close-popup>
                <q-item-section side>
                  <q-icon :name="actionIcon(action_name)"></q-icon>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ action_name }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable @click="removeActionItem(index)" v-close-popup>
                <q-item-section side>
                  <q-icon name="mdi-trash-can" />
                </q-item-section>
                <q-item-section color="negative">
                  <q-item-label>remove action</q-item-label>
                </q-item-section>
              </q-item>
            </q-btn-dropdown>
          </q-item-section>
          <q-item-section>
            <AddOrRemoveClassActionEditor v-if="isAddOrRemoveClassAction(a)" :index="index" :action='a'
              @set-props="setActionProps" />
            <AddOrRemoveCustomStyleActionEditor v-if="isAddOrRemoveCustomStyleAction(a)" :editor="editor" :index="index"
              :action='a' @set-props="setActionProps" />
            <AddOrRemoveMarkActionEditor v-if="isAddOrRemoveMarkAction(a)" :index="index" :action='a'
              @set-props="setActionProps" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-btn size="sm" icon="mdi-plus" label="append new" @click="newActionItem()" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>