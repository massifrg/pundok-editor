<template>
  <q-input v-model='className' :label="$t('actions.editors.class')" @update:model-value="changeOldName" />
  <q-input v-if="isRenaming" v-model='newName' :label="$t('actions.editors.rename to') + ':'"
    @update:model-value="changeNewName" />
</template>

<script lang="ts">
import { t } from '../../i18n'
import { AddRemoveRenameClassActionProps } from '../../common';

export default {
  props: ['index', 'action'],
  emits: ['set-props'],
  data() {
    return {
      className: this.action?.props?.className || '',
      newName: this.action?.props?.newName || ''
    }
  },
  computed: {
    isRenaming() {
      return this.action.name.startsWith('rename')
    }
  },
  methods: {
    setProps(props: AddRemoveRenameClassActionProps) {
      this.$emit('set-props', this.index, props)
    },
    changeOldName(value: string | number | null) {
      this.setProps(
        {
          className: value,
          newName: this.newName,
        } as AddRemoveRenameClassActionProps
      )
    },
    changeNewName(value: string | number | null) {
      this.setProps(
        {
          className: this.className,
          newName: value,
        } as AddRemoveRenameClassActionProps
      )
    }
  }
}
</script>