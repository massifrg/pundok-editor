<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { toRaw } from 'vue';
import { ActionName, availableAction, availableActionsNames } from '../actions';
import { ActionNameWithProps, isOppositeAction } from '../common';
import AddOrRemoveClassActionEditor from './actioneditors/AddOrRemoveClassActionEditor.vue'
import AddOrRemoveCustomClassActionEditor from './actioneditors/AddOrRemoveCustomClassActionEditor.vue'
import AddOrRemoveCustomStyleActionEditor from './actioneditors/AddOrRemoveCustomStyleActionEditor.vue'
import AddOrRemoveMarkActionEditor from './actioneditors/AddOrRemoveMarkActionEditor.vue'
import InsertRawInlineActionEditor from './actioneditors/InsertRawInlineActionEditor.vue'
import SetIndexRefActionEditor from './actioneditors/SetIndexRefActionEditor.vue';
import SetSpanActionEditor from './actioneditors/SetSpanActionEditor.vue'
import { defaultPropsFor } from '../actions/defaultProps';
import { getEditorConfiguration } from '../schema';

export default {
  props: ['editor', 'startActions', 'searchOnly'],
  emits: ['update-actions', 'close'],
  data() {
    return {
      actions: (this.startActions || []) as ActionNameWithProps[],
      editableActionName: undefined as string | undefined,
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyles() {
      return this.configuration?.customStyles
    },
    availableActionsNames() {
      return availableActionsNames()
    },
    appendNewActionTooltip() {
      return `append new action to be applied on ${this.searchOnly ? 'found' : 'replaced'} texts`
    }
  },
  watch: {
    actions(value) {
      this.notifyActions(value)
    }
  },
  components: {
    AddOrRemoveClassActionEditor,
    AddOrRemoveCustomClassActionEditor,
    AddOrRemoveCustomStyleActionEditor,
    AddOrRemoveMarkActionEditor,
    InsertRawInlineActionEditor,
    SetIndexRefActionEditor,
    SetSpanActionEditor,
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
    actionLabel(actionName: string) {
      return availableAction(actionName)?.label
    },
    isAddOrRemoveClassAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-class' || name === 'remove-class'
    },
    isAddOrRemoveCustomStyleAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-custom-style' || name === 'remove-custom-style'
    },
    isAddOrRemoveCustomClassAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-custom-class' || name === 'remove-custom-class'
    },
    isAddOrRemoveMarkAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-mark' || name === 'remove-mark'
    },
    isSetSpanAction(a: ActionNameWithProps) {
      return (a.name as ActionName) === 'set-span'
    },
    isSetIndexRefAction(a: ActionNameWithProps) {
      return (a.name as ActionName) === 'set-index-ref'
    },
    isInsertRawInlineAction(a: ActionNameWithProps) {
      return (a.name as ActionName) === 'insert-raw-inline'
    },
    newActionItem(_name?: string) {
      const name = _name || this.availableActionsNames[0]
      console.log(`name=${name}`)
      const newAction = {
        name,
        props: defaultPropsFor(name as ActionName, this.configuration) as Record<string, any>
      }
      this.actions.push(newAction)
      console.log(newAction)
      this.notifyActions(this.actions)
    },
    setActionItem(index: number, name: string) {
      if (index >= 0 && index < this.actions.length) {
        const currentAction = this.actions[index]
        if (currentAction.name !== name) {
          const props = isOppositeAction(this.actions[index].name, name)
            ? currentAction.props
            : defaultPropsFor(name as ActionName, this.configuration)
          this.actions = this.actions.map((a, i) => i === index ? { name, props } : a)
        }
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
    <q-card-section class="q-px-xs">
      <div class="q-text-h6 q-ma-md">Actions to be applied on {{ searchOnly ? 'found' : 'replaced' }} texts:</div>
      <q-list>
        <q-item v-for="(a, index) in actions" dense>
          <q-item-section side>
            <q-chip>{{ index + 1 }}</q-chip>
          </q-item-section>
          <q-item-section side>
            <q-icon size="xs" name="delete" @click="removeActionItem(index)" @click.stop.prevent />
          </q-item-section>
          <q-item-section side>
            <q-icon v-if="index > 0" size="xs" name="arrow_upward" @click="moveActionItemUp(index)"
              @click.stop.prevent />
            <q-icon v-if="index < actions.length - 1" size="xs" name="arrow_downward" @click="moveActionItemDown(index)"
              @click.stop.prevent />
          </q-item-section>
          <q-item-section>
            <q-btn-dropdown :label="a.name" :title="actionLabel(a.name)" :icon="actionIcon(a.name)">
              <q-item clickable @click="removeActionItem(index)" v-close-popup>
                <q-item-section side>
                  <q-icon name="delete" />
                </q-item-section>
                <q-item-section color="negative">
                  <q-item-label>remove action</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item v-for="action_name in availableActionsNames" clickable @click="setActionItem(index, action_name)"
                v-close-popup>
                <q-item-section side>
                  <q-icon :name="actionIcon(action_name)"></q-icon>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ actionLabel(action_name) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-btn-dropdown>
          </q-item-section>
          <q-item-section side>
            <AddOrRemoveClassActionEditor v-if="isAddOrRemoveClassAction(a)" :index="index" :action='a'
              @set-props="setActionProps" />
            <AddOrRemoveCustomStyleActionEditor v-if="isAddOrRemoveCustomStyleAction(a)" :editor="editor" :index="index"
              :action='a' @set-props="setActionProps" />
            <AddOrRemoveMarkActionEditor v-if="isAddOrRemoveMarkAction(a)" :index="index" :action='a'
              @set-props="setActionProps" />
            <AddOrRemoveCustomClassActionEditor v-if="isAddOrRemoveCustomClassAction(a)" :editor="editor" :index="index"
              :action='a' @set-props="setActionProps" />
            <SetSpanActionEditor v-if="isSetSpanAction(a)" :editor="editor" :index="index" :action='a'
              @set-props="setActionProps" />
            <SetIndexRefActionEditor v-if="isSetIndexRefAction(a)" :editor="editor" :index="index" :action='a'
              @set-props="setActionProps" />
            <InsertRawInlineActionEditor v-if="isInsertRawInlineAction(a)" :editor="editor" :index="index" :action='a'
              @set-props="setActionProps" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
    <q-card-actions align="center">
      <q-btn size="sm" icon="add_action" label="new" :title="appendNewActionTooltip" @click="newActionItem()" />
      <q-space />
      <q-btn size="sm" icon="close" label="close" @click="$emit('close')" />
    </q-card-actions>
  </q-card>
</template>