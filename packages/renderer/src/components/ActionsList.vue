<script lang="ts">
import { ActionName, availableActionsNames } from '../actions';
import { ActionNameWithProps } from '../common';
import AddOrRemoveClassActionEditor from './actioneditors/AddOrRemoveClassActionEditor.vue'

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
    AddOrRemoveClassActionEditor
  },
  methods: {
    isAddOrRemoveClassAction(a: ActionNameWithProps) {
      const name = a.name as ActionName
      return name === 'add-class' || name === 'remove-class'
    },
    newActionItem() {
      this.actions.push({ name: this.availableActions[0] })
    },
    moveActionItemUp(index: number) {
      if (index > 0) {
        const actions = this.actions
        this.actions = actions.map((a, i) => {
          if (i === index - 1) return actions[index]
          else if (i === index) return actions[index - 1]
          else return a
        })
      }
    },
    moveActionItemDown(index: number) {
      const actions = this.actions
      if (index < actions.length - 1) {
        this.actions = actions.map((a, i) => {
          if (i === index) return actions[index + 1]
          else if (i === index + 1) return actions[index]
          else return a
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
    <q-card-section>
      <q-list>
        <q-item v-for="(a, index) in actions" dense>
          <q-item-section>
            <q-select v-model="a.name" :options="availableActions" dense>
              <template v-slot:prepend>
                <q-icon size="xs" name="mdi-arrow-up" @click="moveActionItemUp(index)" @click.stop.prevent />
                <q-icon size="xs" name="mdi-arrow-down" @click="moveActionItemDown(index)" @click.stop.prevent />
              </template>
              <template v-slot:append>
                <q-icon size="xs" name="mdi-trash-can" @click="removeActionItem(index)" @click.stop.prevent />
              </template>
            </q-select>
          </q-item-section>
          <q-item-section>
            <AddOrRemoveClassActionEditor v-if="isAddOrRemoveClassAction(a)" :action="a" :index="index"
              @set-props="setActionProps" />
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