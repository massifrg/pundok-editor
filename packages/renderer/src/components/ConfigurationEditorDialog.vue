<template>
  <q-dialog :model-value="visible" full-width full-height @hide="onCancel">
    <q-card class="configuration-editor-dialog">
      <q-card-section>
        <div class="text-h6">Edit editor configuration</div>
      </q-card-section>

      <q-card-section class="configuration-editor-dialog__body">
        <q-tabs
          v-model="activeTab"
          vertical
          class="configuration-editor-dialog__tabs text-primary"
          outside-arrows
          mobile-arrows
        >
          <q-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="tab.label" />
        </q-tabs>

        <q-separator vertical />

        <q-tab-panels v-model="activeTab" animated class="configuration-editor-dialog__panels">
          <q-tab-panel v-for="tab in tabs" :key="tab.name" :name="tab.name">
            <InheritedConfigurationsEditor
              v-if="tab.name === 'inherited-configurations'"
              v-model="chosenConfigurations"
            />
            <CustomStylesEditor
              v-else-if="tab.name === 'customStyles'"
              v-model="values.customStyles"
            />
            <div v-for="field in tab.fields" v-else :key="field.name" class="q-mb-md">
              <q-input
                v-if="field.kind === 'text'"
                v-model="values[field.name]"
                :label="field.label"
                outlined
                :type="field.name === 'description' ? 'textarea' : 'text'"
                :hint="field.description"
                clearable
              />
              <q-toggle
                v-else-if="field.kind === 'boolean'"
                v-model="values[field.name]"
                :label="field.label"
                :hint="field.description"
              />
              <q-input
                v-else
                v-model="jsonValues[field.name]"
                :label="field.label"
                type="textarea"
                outlined
                autogrow
                :hint="field.description"
                :error="!!jsonErrors[field.name]"
                :error-message="jsonErrors[field.name]"
                @update:model-value="clearJsonError(field.name)"
              />
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="Cancel" @click="onCancel" />
        <q-btn label="Save" color="primary" @click="onSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers'

setupQuasarIcons()
</script>

<script lang="ts">
import { PundokEditorConfigInit } from '../common'
import InheritedConfigurationsEditor from './confeditors/InheritedConfigurationsEditor.vue'
import CustomStylesEditor from './confeditors/CustomStylesEditor.vue'

type EditorConfigField = {
  name: keyof PundokEditorConfigInit
  label: string
  description: string
  kind: 'text' | 'boolean' | 'json' | 'customStyles'
}

type EditorConfigTab = {
  name: string
  label: string
  fields: EditorConfigField[]
}

const fields: EditorConfigField[] = [
  { name: 'name', label: 'Name', description: 'The configuration name.', kind: 'text' },
  { name: 'description', label: 'Description', description: 'An optional description.', kind: 'text' },
  { name: 'version', label: 'Version', description: 'Minimal suitable editor version, as a JSON array of numbers.', kind: 'json' },
  { name: 'isLocal', label: 'Local', description: 'Whether this is a local configuration.', kind: 'boolean' },
  { name: 'tiptap', label: 'TipTap', description: 'TipTap/ProseMirror options, as a JSON object.', kind: 'json' },
  { name: 'workingFormat', label: 'Working format', description: 'Default format used to open documents.', kind: 'text' },
  { name: 'copyFormat', label: 'Copy format', description: 'Format used by Save a copy.', kind: 'text' },
  { name: 'mainFormats', label: 'Main formats', description: 'Formats shown prominently, as a JSON array of strings.', kind: 'json' },
  { name: 'documentTemplate', label: 'Document template', description: 'JSON-stringified template for new documents.', kind: 'text' },
  { name: 'autoDelimiters', label: 'Automatic delimiters', description: 'Delimiter pairs, as a JSON object.', kind: 'json' },
  { name: 'customStyles', label: 'Custom styles', description: 'Custom style definitions.', kind: 'customStyles' },
  { name: 'customClasses', label: 'Custom classes', description: 'Custom class definitions, as a JSON array.', kind: 'json' },
  { name: 'customAttributes', label: 'Custom attributes', description: 'Custom attribute definitions, as a JSON array.', kind: 'json' },
  { name: 'customMetadata', label: 'Custom metadata', description: 'Custom metadata definitions, as a JSON array.', kind: 'json' },
  { name: 'noteStyles', label: 'Note styles', description: 'Note style definitions, as a JSON array.', kind: 'json' },
  { name: 'customCss', label: 'Custom CSS', description: 'CSS file paths, as a JSON array of strings.', kind: 'json' },
  { name: 'indices', label: 'Indices', description: 'Index definitions, as a JSON array.', kind: 'json' },
  { name: 'defaultRawFormat', label: 'Default raw format', description: 'Default format for raw inline and block elements.', kind: 'text' },
  { name: 'rawInlines', label: 'Raw inlines', description: 'Insertable raw inline samples, as a JSON array.', kind: 'json' },
  { name: 'rawBlocks', label: 'Raw blocks', description: 'Insertable raw block samples, as a JSON array.', kind: 'json' },
  { name: 'inputConverters', label: 'Input converters', description: 'Document input converters, as a JSON array.', kind: 'json' },
  { name: 'outputConverters', label: 'Output converters', description: 'Document output converters, as a JSON array.', kind: 'json' },
  { name: 'automations', label: 'Automations', description: 'Predefined editor automations, as a JSON array.', kind: 'json' },
]

const groupedFields = (names: (keyof PundokEditorConfigInit)[]) =>
  names.map(name => fields.find(field => field.name === name)!)

const tabs: EditorConfigTab[] = [
  {
    name: 'general',
    label: 'General',
    fields: groupedFields(['name', 'description', 'version', 'isLocal', 'tiptap']),
  },
  {
    name: 'file-formats',
    label: 'File formats',
    fields: groupedFields(['workingFormat', 'copyFormat', 'mainFormats']),
  },
  {
    name: 'inherited-configurations',
    label: 'Inherited configuration',
    fields: [],
  },
  ...fields
    .filter(field => ![
      'name',
      'description',
      'version',
      'isLocal',
      'inherits',
      'tiptap',
      'workingFormat',
      'copyFormat',
      'mainFormats',
      'defaultRawFormat',
      'rawInlines',
      'rawBlocks',
    ].includes(field.name))
    .map(field => ({ name: field.name, label: field.label, fields: [field] })),
  {
    name: 'raw-elements',
    label: 'Raw elements',
    fields: groupedFields(['defaultRawFormat', 'rawInlines', 'rawBlocks']),
  },
]

export default {
  props: {
    visible: { type: Boolean, default: false },
    configuration: { type: Object, default: () => ({}) },
    inheritedConfigurations: { type: Array, default: () => [] },
  },
  emits: ['save', 'close'],
  components: {
    InheritedConfigurationsEditor,
    CustomStylesEditor,
  },
  data() {
    return {
      fields,
      tabs,
      activeTab: tabs[0].name,
      chosenConfigurations: [] as string[],
      values: {} as Record<string, any>,
      jsonValues: {} as Record<string, string>,
      jsonErrors: {} as Record<string, string>,
    }
  },
  watch: {
    visible(value: boolean) {
      if (value) this.loadConfiguration()
    },
  },
  mounted() {
    if (this.visible) this.loadConfiguration()
  },
  methods: {
    loadConfiguration() {
      const source = this.configuration as Partial<PundokEditorConfigInit>
      this.chosenConfigurations = [...(this.inheritedConfigurations as string[])]
      const values: Record<string, any> = {}
      const jsonValues: Record<string, string> = {}
      fields.forEach(field => {
        const value = source[field.name]
        if (field.name === 'inherits') return
        if (field.kind === 'json') {
          jsonValues[field.name] = JSON.stringify(value === undefined ? null : value, null, 2)
        } else if (field.name === 'customStyles') {
          values[field.name] = value || []
        } else {
          values[field.name] = value
        }
      })
      this.values = values
      this.jsonValues = jsonValues
      this.jsonErrors = {}
      this.activeTab = tabs[0].name
    },
    clearJsonError(fieldName: string) {
      if (this.jsonErrors[fieldName]) {
        const errors = { ...this.jsonErrors }
        delete errors[fieldName]
        this.jsonErrors = errors
      }
    },
    onCancel() {
      this.$emit('close')
    },
    onSave() {
      const result: Record<string, any> = {
        ...(this.configuration as Record<string, any>),
        ...this.values,
      }
      delete result.inherits
      const errors: Record<string, string> = {}
      fields.filter(field => field.kind === 'json').forEach(field => {
        try {
          const parsed = JSON.parse(this.jsonValues[field.name])
          if (parsed === null) {
            delete result[field.name]
          } else {
            result[field.name] = parsed
          }
        } catch {
          errors[field.name] = 'Enter valid JSON.'
        }
      })
      if (Object.keys(errors).length > 0) {
        this.jsonErrors = errors
        const errorField = Object.keys(errors)[0]
        this.activeTab = tabs.find(tab => tab.fields.some(field => field.name === errorField))?.name || tabs[0].name
        return
      }
      Object.keys(result).forEach(key => {
        if (result[key] === undefined || result[key] === '') delete result[key]
      })
      this.$emit('save', result, [...this.chosenConfigurations])
      this.$emit('close')
    },
  },
}
</script>

<style scoped>
.configuration-editor-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.configuration-editor-dialog__body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: row;
}

.configuration-editor-dialog__tabs {
  flex: 0 0 12rem;
  overflow-y: auto;
}

.configuration-editor-dialog__panels {
  flex: 1;
  overflow: auto;
}

</style>
