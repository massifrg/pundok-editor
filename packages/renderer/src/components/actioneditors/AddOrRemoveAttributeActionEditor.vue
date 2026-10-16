<template>
  <q-input v-model='attrName' :label="$t('actions.editors.attributeName')" @update:model-value="changeAttrName" />
  <q-input v-if="isAdding" v-model='attrValue' :label="$t('actions.editors.attributeValue')"
    @update:model-value="changeAttrValue" />
  <q-input v-if="isRenaming" v-model='newName' :label="$t('actions.editors.rename to') + ':'"
    @update:model-value="changeNewName" />
</template>

<script lang="ts">
import { t } from '../../i18n'
import { AddRemoveRenameAttributeActionProps } from '../../common';

export default {
  props: ['index', 'action'],
  emits: ['set-props'],
  data() {
    return {
      attrName: this.action?.props?.attrName || '',
      attrValue: this.action?.props?.attrValue || '',
      newName: this.action?.props?.newName || ''
    }
  },
  computed: {
    isAdding() {
      return this.action.name.startsWith('add')
    },
    isRenaming() {
      return this.action.name.startsWith('rename')
    }
  },
  methods: {
    setProps(props: AddRemoveRenameAttributeActionProps) {
      this.$emit('set-props', this.index, props)
    },
    changeAttrName(value: string | number | null) {
      const v = value && value.toString() || ''
      let attrName = v
      let attrValue = this.attrValue
      const firstEqualIndex = v.indexOf('=')
      if (firstEqualIndex > 1) {
        attrName = v.substring(0, firstEqualIndex)
        attrValue = v.substring(firstEqualIndex + 1)
      }
      this.setProps({ attrName, attrValue, newName: this.newName } as AddRemoveRenameAttributeActionProps)
    },
    changeAttrValue(value: string | number | null) {
      this.setProps(
        {
          attrName: this.attrName,
          attrValue: value,
          newName: this.newName,
        } as AddRemoveRenameAttributeActionProps
      )
    },
    changeNewName(value: string | number | null) {
      this.setProps(
        {
          attrName: this.attrName,
          attrValue: this.attrValue,
          newName: value,
        } as AddRemoveRenameAttributeActionProps
      )
    }
  }
}
</script>