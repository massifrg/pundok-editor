<template>
  <q-card-actions style="min-width: 300px">
    <q-btn-dropdown :label="buttonLabel" no-caps>
      <q-list>
        <q-item v-for="alt in alternatives" dense clickable v-close-popup :title="alt.description"
          @click="selectAlternative(alt)">
          <q-item-section side>
            <q-icon :name="alt.icon || 'mdi-invoice-list-outline'"></q-icon>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ alt.name }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <q-btn icon="mdi-playlist-edit" color="primary" no-caps>
      <q-popup-proxy>
        <q-tabs v-model="tab">
          <q-tab name="classes" icon="mdi-octagram" label="Classes" />
          <q-tab name="attributes" icon="mdi-playlist-edit" label="Attributes" />
        </q-tabs>
        <q-tab-panels v-model="tab">
          <q-tab-panel name="classes">
            <ClassesEditor :editor="editor" :start-value="classes" :important-classes="[]" :forbidden-classes="[]"
              @add-class="addClass" @remove-class="removeClass" />
          </q-tab-panel>
          <q-tab-panel name="attributes">
            <OtherAttributesEditor :editor="editor" attr-name="kv" :original-entries="attrEntries"
              :initial-entries="attrEntries" :forbidden-attr-names="['custom-style', 'id', 'classes']"
              :classes="classes || []" @update-attribute="updateAttribute" />
          </q-tab-panel>
        </q-tab-panels>
      </q-popup-proxy>
    </q-btn>
  </q-card-actions>
</template>

<script lang="ts">
import { SetSpanActionProps, CustomAttribute, attrsToCssSelectorString, CustomSpan } from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { getEditorConfiguration } from '../../schema';
import { defaultPropsFor } from '../../actions';
import OtherAttributesEditor from '../attreditors/OtherAttributesEditor.vue';
import ClassesEditor from '../attreditors/ClassesEditor.vue';

export default {
  props: ['editor', 'index', 'action'],
  emits: ['set-props'],
  components: { ClassesEditor, OtherAttributesEditor },
  data() {
    const props: SetSpanActionProps = this.action?.props
      || defaultPropsFor(this.action.name)
      || { classes: [], attrs: {}, alternatives: [], alternativeIndex: -1 }
    return {
      tab: 'attributes',
      classes: props.classes,
      attrs: props.attrs,
      alternatives: props.alternatives,
      alternativeIndex: props.alternativeIndex,
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customClasses() {
      return this.configuration?.customClasses || []
    },
    customAttributes(): CustomAttribute[] {
      const customClasses = this.classes
        .map(c => this.customClasses.find(cc => c === cc.name))
        .filter(c => !!c)
      const attributes: CustomAttribute[] = []
      customClasses.forEach(c => {
        c.attributes?.forEach(a => {
          if (!attributes.find(fa => fa.name === a.name))
            attributes.push(a)
        })
      })
      return attributes
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
      return entries
    },
    computedLabel() {
      return attrsToCssSelectorString({
        classes: this.classes,
        attributes: this.attrs
      })
    },
    alternativesLabels() {
      const alts: CustomSpan[] = this.alternatives || []
      return alts.map(alt => attrsToCssSelectorString({
        classes: alt.classes,
        attributes: alt.kv
      }))
    },
    selectedAlternativeIndex() {
      const label = this.computedLabel
      return this.alternativesLabels.findIndex(al => al === label)
    },
    buttonLabel() {
      const alternatives: CustomSpan[] = this.alternatives || []
      const index = this.selectedAlternativeIndex
      return index >= 0 && alternatives[index].name || this.computedLabel
    },
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    selectAlternative(alt: CustomSpan) {
      this.classes = alt.classes || []
      this.attrs = alt.kv || {}
      this.updateProps()
    },
    addClass(c: string) {
      const classes = this.classes
      this.classes = [...classes.filter(tc => tc !== c), c]
      this.updateProps()
    },
    removeClass(c: string) {
      const classes = this.classes
      this.classes = classes.filter(tc => tc !== c)
      this.updateProps()
    },
    updateAttribute(_: string, newValue?: Record<string, string>) {
      if (newValue) {
        this.attrs = newValue
        this.updateProps()
      }
    },
    updateProps() {
      this.$emit('set-props', this.index, {
        classes: this.classes,
        attrs: this.attrs,
        alternatives: this.alternatives,
        alternativeIndex: this.selectedAlternativeIndex,
      } as SetSpanActionProps)
    }
  }
}
</script>

<style>
.span-desc {
  font-size: smaller;
  text-align: left;
  font-weight: normal;
}
</style>