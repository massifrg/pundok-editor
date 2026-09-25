<template>
  <q-dialog :model-value="visible" full-width full-height @hide="onCancel">
    <q-card class="configuration-editor-dialog">
      <q-card-section>
        <div class="text-h6">{{ $t('configEditor.title') }}</div>
      </q-card-section>

      <q-card-section class="configuration-editor-dialog__body">
        <q-tabs v-model="activeTab" vertical class="configuration-editor-dialog__tabs text-primary" outside-arrows
          mobile-arrows>
          <q-tab v-for="tab in tabs" :key="tab.name" :name="tab.name" :label="$t(tab.label)" />
        </q-tabs>

        <q-separator vertical />

        <q-tab-panels v-model="activeTab" animated class="configuration-editor-dialog__panels">
          <q-tab-panel v-for="tab in tabs" :key="tab.name" :name="tab.name">
            <ProjectConfigurationsEditor v-if="tab.name === 'project-configurations'"
              v-model="chosenConfigurations" />
            <CustomStylesEditor v-else-if="tab.name === 'customStyles'" v-model="values.customStyles" />
            <div v-for="field in tab.fields" v-else :key="field.name" class="q-mb-md">
              <q-input v-if="field.kind === 'text'" v-model="values[field.name]" :label="$t(field.label)" outlined
                :type="field.name === 'description' ? 'textarea' : 'text'" :hint="$t(field.description)" clearable />
              <q-toggle v-else-if="field.kind === 'boolean'" v-model="values[field.name]" :label="$t(field.label)"
                :hint="$t(field.description)" />
              <q-input v-else v-model="jsonValues[field.name]" :label="$t(field.label)" type="textarea" outlined autogrow
                :hint="$t(field.description)" :error="!!jsonErrors[field.name]" :error-message="jsonErrors[field.name]"
                @update:model-value="clearJsonError(field.name)" />
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn :label="$t('configEditor.buttons.cancel')" @click="onCancel" />
        <q-btn :label="$t('configEditor.buttons.save')" color="primary" @click="onSave" />
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
import ProjectConfigurationsEditor from './confeditors/ProjectConfigurationsEditor.vue'
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
  { name: 'name', label: 'configEditor.general.name', description: 'configEditor.general.nameDescription', kind: 'text' },
  { name: 'description', label: 'configEditor.general.description', description: 'configEditor.general.descriptionDescription', kind: 'text' },
  { name: 'version', label: 'configEditor.general.version', description: 'configEditor.general.versionDescription', kind: 'json' },
  { name: 'isLocal', label: 'configEditor.general.local', description: 'configEditor.general.localDescription', kind: 'boolean' },
  { name: 'tiptap', label: 'configEditor.general.tiptap', description: 'configEditor.general.tiptapDescription', kind: 'json' },
  { name: 'workingFormat', label: 'configEditor.fileFormats.workingFormat', description: 'configEditor.fileFormats.workingFormatDescription', kind: 'text' },
  { name: 'copyFormat', label: 'configEditor.fileFormats.copyFormat', description: 'configEditor.fileFormats.copyFormatDescription', kind: 'text' },
  { name: 'mainFormats', label: 'configEditor.fileFormats.mainFormats', description: 'configEditor.fileFormats.mainFormatsDescription', kind: 'json' },
  { name: 'documentTemplate', label: 'configEditor.documentTemplate.label', description: 'configEditor.documentTemplate.description', kind: 'text' },
  { name: 'autoDelimiters', label: 'configEditor.autoDelimiters.label', description: 'configEditor.autoDelimiters.description', kind: 'json' },
  { name: 'customStyles', label: 'configEditor.customStyles.label', description: 'configEditor.customStyles.description', kind: 'customStyles' },
  { name: 'customClasses', label: 'configEditor.customClasses.label', description: 'configEditor.customClasses.description', kind: 'json' },
  { name: 'customAttributes', label: 'configEditor.customAttributes.label', description: 'configEditor.customAttributes.description', kind: 'json' },
  { name: 'customMetadata', label: 'configEditor.customMetadata.label', description: 'configEditor.customMetadata.description', kind: 'json' },
  { name: 'noteStyles', label: 'configEditor.noteStyles.label', description: 'configEditor.noteStyles.description', kind: 'json' },
  { name: 'customCss', label: 'configEditor.customCss.label', description: 'configEditor.customCss.description', kind: 'json' },
  { name: 'indices', label: 'configEditor.indices.label', description: 'configEditor.indices.description', kind: 'json' },
  { name: 'defaultRawFormat', label: 'configEditor.rawElements.defaultRawFormat', description: 'configEditor.rawElements.defaultRawFormatDescription', kind: 'text' },
  { name: 'rawInlines', label: 'configEditor.rawElements.rawInlines', description: 'configEditor.rawElements.rawInlinesDescription', kind: 'json' },
  { name: 'rawBlocks', label: 'configEditor.rawElements.rawBlocks', description: 'configEditor.rawElements.rawBlocksDescription', kind: 'json' },
  { name: 'inputConverters', label: 'configEditor.inputConverters.label', description: 'configEditor.inputConverters.description', kind: 'json' },
  { name: 'outputConverters', label: 'configEditor.outputConverters.label', description: 'configEditor.outputConverters.description', kind: 'json' },
  { name: 'automations', label: 'configEditor.automations.label', description: 'configEditor.automations.description', kind: 'json' },
]

const groupedFields = (names: (keyof PundokEditorConfigInit)[]) =>
  names.map(name => fields.find(field => field.name === name)!)

const tabs: EditorConfigTab[] = [
  {
    name: 'general',
    label: 'configEditor.tabs.general',
    fields: groupedFields(['name', 'description', 'version', 'isLocal', 'tiptap']),
  },
  {
    name: 'file-formats',
    label: 'configEditor.tabs.fileFormats',
    fields: groupedFields(['workingFormat', 'copyFormat', 'mainFormats']),
  },
  {
    name: 'project-configurations',
    label: 'configEditor.tabs.projectConfigurations',
    fields: [],
  },
  ...fields
    .filter(field => ![
      'name',
      'description',
      'version',
      'isLocal',
      'tiptap',
      'workingFormat',
      'copyFormat',
      'mainFormats',
      'defaultRawFormat',
      'rawInlines',
      'rawBlocks',
    ].includes(field.name))
    .map(field => ({ name: field.name,     label: `configEditor.tabs.${field.name}`, fields: [field] })),
  {
    name: 'raw-elements',
    label: 'configEditor.tabs.rawElements',
    fields: groupedFields(['defaultRawFormat', 'rawInlines', 'rawBlocks']),
  },
]

export default {
  props: {
    visible: { type: Boolean, default: false },
    configuration: { type: Object, default: () => ({}) },
    projectConfigurations: { type: Array, default: () => [] },
  },
  emits: ['save', 'close'],
  components: {
    ProjectConfigurationsEditor,
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
      this.chosenConfigurations = [...(this.projectConfigurations as string[])]
      const values: Record<string, any> = {}
      const jsonValues: Record<string, string> = {}
      fields.forEach(field => {
        const value = source[field.name]
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
        name: '',
        version: [],
        ...(this.configuration as Record<string, any>),
        ...this.values,
      }
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
      this.$emit('save', result as PundokEditorConfigInit, [...this.chosenConfigurations])
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
