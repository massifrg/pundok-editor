<template>
  <q-card-actions style="min-width: 300px">
    <q-btn-dropdown no-caps>
      <template v-slot:label>
        <div>{{ className }}</div>
        <div v-html="attrsLabel" style="font-size: smaller; text-align: left"></div>
      </template>
      <q-list>
        <q-item v-for="c in customClasses" dense clickable v-close-popup :title="c.description"
          @click="setCustomClass(c)">
          <q-item-section><q-item-label>{{ c.name }}</q-item-label></q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <q-btn color="primary" icon="mdi-playlist-edit">
      <q-popup-proxy>
        <q-banner>Attributes related to class "{{ className }}":</q-banner>
        <OtherAttributesEditor :editor="editor" attrName="kv" :originalEntries="attrEntries"
          :initialEntries="attrEntries" :forbiddenAttrNames="['custom-style', 'id', 'classes']"
          :classes="className && [className] || []" @update-attribute="updateAttribute" />
      </q-popup-proxy>
    </q-btn>
  </q-card-actions>
</template>

<script lang="ts">
import { AddOrRemoveCustomClassActionProps, CustomAttribute, CustomClass } from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { getEditorConfiguration } from '../../schema';
import { defaultPropsFor } from '../../actions';
import OtherAttributesEditor from '../attreditors/OtherAttributesEditor.vue';
import { toRaw } from 'vue';

export default {
  props: ['editor', 'index', 'action'],
  emits: ['set-props'],
  components: { OtherAttributesEditor },
  data() {
    const props: AddOrRemoveCustomClassActionProps = this.action?.props
      || defaultPropsFor(this.action.name)
      || { className: 'class-name', attrs: {} }
    return {
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
    selectedCustomClass(): CustomClass | undefined {
      return this.customClasses.find(c => c.name === this.className)
    },
    customAttributes(): CustomAttribute[] {
      return this.selectedCustomClass?.attributes || []
    },
    attrEntries() {
      const attrs = this.attrs || {}
      const entries: Record<string, any> = Object.entries(attrs).map(([key, value]) => {
        const ca = this.customAttributes.find(a => a.name === key) || {}
        return { ...ca, key, value }
      })
      this.customAttributes.filter(ca => !attrs[ca.name]).forEach(ca => {
        entries.push({ ...ca, key: ca.name })
      })
      console.log(entries)
      return entries
    },
    attrsLabel() {
      const ae = this.attrs && Object.entries(this.attrs)
      if (ae)
        return ae.map(([k, v]) => '-&nbsp;' + k + '=' + v).join('<br>')
    }
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    updateAttribute(_: string, newValue?: Record<string, string>) {
      if (newValue) {
        this.attrs = newValue
        this.updateProps()
      }
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