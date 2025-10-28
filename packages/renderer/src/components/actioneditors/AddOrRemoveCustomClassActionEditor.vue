<template>
  <q-btn-dropdown :label="selectedCustomClass" no-caps>
    <q-list>
      <q-item v-for="c in customClasses" dense clickable v-close-popup :title="c.description"
        @click="setCustomClass(c)">
        <q-item-section><q-item-label>{{ c.name }}</q-item-label></q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
  <q-btn color="primary" icon="mdi-playlist-edit" @click="showDialog = !showDialog">
    <q-dialog v-model="showDialog">
      <q-card>
        <q-card-section>
          <OtherAttributesEditor :editor="editor" :nodeOrMark="customSpan" attrName="kv" originalEntries=""
            initialEntries="" forbiddenAttrNames="" classes="" @update-attribute="updateAttribute" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-btn>
</template>

<script lang="ts">
import { AddOrRemoveCustomClassActionProps, CustomClass, MARK_NAME_SPAN } from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { editableAttrsForNodeOrMark, getEditorConfiguration } from '../../schema';
import { defaultPropsFor } from '../../actions';
import OtherAttributesEditor from '../attreditors/OtherAttributesEditor.vue';

export default {
  props: ['editor', 'index', 'action'],
  emits: ['set-props'],
  data() {
    const props: AddOrRemoveCustomClassActionProps = this.action?.props
      || defaultPropsFor(this.action.name)
      || { className: 'class-name', attrs: {} }
    return {
      showDialog: false,
      className: props.className,
      attrs: props.attrs
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customClasses() {
      return this.configuration?.customClasses || []
    },
    selectedCustomClass() {
      return this.action.props.className
    },
    customSpan() {
      return this.editor?.state.schema.marks[MARK_NAME_SPAN].create()
    },
    editableAttributes(): string[] {
      return editableAttrsForNodeOrMark(this.customSpan)
    },
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    hasAttribute(attrName: string): boolean {
      return this.editableAttributes.includes(attrName);
    },
    updateAttribute(attrName: string, newValue?: string) {
      const attrs = { ...this.attrs }
      if (newValue) {
        attrs[attrName] = newValue
      } else {
        delete attrs[attrName]
      }
      this.attrs = attrs
      this.updateProps()
    },
    setCustomClass(c: CustomClass) {
      this.className = c.name
      const entries = c.attributes
        ? Object.entries(this.attrs as object).filter(([a, _]) => c.attributes?.find(attr => attr.name === a))
        : []
      this.attrs = Object.fromEntries(entries)
    },
    updateProps() {
      this.$emit('set-props', this.index, {
        className: this.className,
        attrs: this.attrs
      } as AddOrRemoveCustomClassActionProps)
    }
  }
}
</script>