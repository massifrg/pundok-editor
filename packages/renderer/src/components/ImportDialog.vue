<template>
  <q-dialog :model-value="visible" full-width>
    <q-card>
      <q-card-section v-if="rows.length > 0">
        <q-table :rows="rows" row-key="name" selection="single" v-model:selected="selected">
          <template v-slot:body-selection="scope">
            <q-toggle v-model="scope.selected" />
          </template>
        </q-table>
      </q-card-section>
      <q-card-section v-if="rows.length === 0">
        There are no output converters available!
      </q-card-section>
      <q-card-actions>
        <q-checkbox v-if="rows.length > 0 && selected" :modelValue="askFeedback" true-value="command-line"
          @update:model-value="askFeedbackOrNot">show command line</q-checkbox>
        <q-space />
        <q-btn label="Ok" :disabled="selected.length === 0" color="primary" @click="setInputConverter" />
        <q-btn label="Cancel" color="primary" @click="$emit('closeImportDialog')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { Ref, ref } from 'vue'
import { QTableProps } from 'quasar';
import { setupQuasarIcons } from './helpers/quasarIcons';
import { CustomInputConverter, ExternalInputConverter, FeedbackMessageType, InputConverter, PandocInputConverter } from '../common';
import { getEditorConfiguration } from '../schema';

const columns: QTableProps['columns'] = [
  {
    name: 'name',
    label: 'name',
    field: 'name',
    sortable: true,
    align: 'left'
  },
  {
    name: 'type',
    label: 'type',
    field: 'type',
    sortable: true,
    align: 'center'
  },
  {
    name: 'description',
    label: 'description',
    field: 'description',
    sortable: false,
    align: 'left'
  },
  {
    name: 'extensions',
    label: 'input files',
    field: 'extensions',
    sortable: false,
    align: 'left'
  },
  {
    name: 'format',
    label: 'format or script',
    field: 'format',
    sortable: true,
    align: 'left'
  },
  {
    name: 'options',
    label: 'options',
    field: 'options',
    sortable: false,
    align: 'left'
  },
]

function formatOptions(ic: InputConverter): string {
  if ((ic as ExternalInputConverter).commandArgs) {
    return (ic as ExternalInputConverter).commandArgs.join(' ')
  } else if ((ic as CustomInputConverter).options) {
    const s = JSON.stringify((ic as CustomInputConverter).options)
    return s === '{}' ? '' : s
  }
  return ''
}

export default {
  props: ['editor', 'visible'],
  emits: ['closeImportDialog', 'setInputConverter'],
  data() {
    return {
      selected: ref([]) as Ref<InputConverter[]>,
      askFeedback: false as FeedbackMessageType | false,
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    inputConverters() {
      return this.configuration?.inputConverters || []
    },
    rows() {
      return this.inputConverters.map(i => {
        return {
          name: i.name,
          type: i.type || 'pandoc',
          description: i.description || '',
          format: (i as PandocInputConverter).format || (i as ExternalInputConverter).command || '',
          extensions: i.extensions.join(','),
          options: formatOptions(i)
        }
      })
    },
    columns() {
      return columns
    },
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    setInputConverter() {
      const converterName = this.selected[0].name
      const converter = this.inputConverters.find(f => f.name === converterName)
      console.log(`converter name="${converterName}", converter=${JSON.stringify(converter)}`)
      if (converter) {
        if (this.askFeedback) converter.feedback = this.askFeedback
        this.$emit('setInputConverter', converter)
      }
    },
    askFeedbackOrNot(value: FeedbackMessageType | false) {
      this.askFeedback = value
    }
  }
}
</script>