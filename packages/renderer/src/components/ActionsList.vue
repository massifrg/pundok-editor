<script lang="ts">
import { toRaw } from 'vue';
import { ActionName, availableActionsNames } from '../actions';
import { ActionNameWithProps } from '../common';
import AddOrRemoveClassActionEditor from './actioneditors/AddOrRemoveClassActionEditor.vue'
import AddOrRemoveMarkActionEditor from './actioneditors/AddOrRemoveMarkActionEditor.vue'

export default {
  data() {
    return {
      actions: [] as ActionNameWithProps[],
      editableActionName: undefined as string | undefined,
    }
  },
  computed: {
    availableActions() {
      console.log(availableActionsNames())
      return availableActionsNames()
    }
  },
  components: {
    AddOrRemoveClassActionEditor,
    AddOrRemoveMarkActionEditor,
  },
  methods: {
    isAddOrRemoveClassAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-class' || name === 'remove-class'
    },
    isAddOrRemoveMarkAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-mark' || name === 'remove-mark'
    },
    newActionItem(name?: string) {
      this.actions.push({ name: name || this.availableActions[0] })
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
      console.log(this.actions)
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
      console.log(this.actions)
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
    <q-card-section>
      <q-list>
        <q-item v-for="(a, index) in actions" dense>
          <q-item-section side>
            <q-chip>{{ index + 1 }}</q-chip>
          </q-item-section>
          <q-item-section side>
            <q-icon size="xs" name="mdi-arrow-up" @click="moveActionItemUp(index)" @click.stop.prevent />
            <q-icon size="xs" name="mdi-arrow-down" @click="moveActionItemDown(index)" @click.stop.prevent />
          </q-item-section>
          <q-item-section>
            <q-btn-dropdown :label="a.name">
              <q-item v-for="action_name in availableActions" clickable @click="setActionItem(index, action_name)"
                v-close-popup>
                <q-item-section>
                  <q-item-label>{{ action_name }}</q-item-label>
                </q-item-section>
              </q-item>
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
              :default-props="{ class: '' }" @set-props="setActionProps" />
            <AddOrRemoveMarkActionEditor v-if="isAddOrRemoveMarkAction(a)" :index="index" :action='a'
              :default-props="{ markType: 'Emph' }" @set-props="setActionProps" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-btn size="xs" icon="mdi-plus" @click="newActionItem()" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>