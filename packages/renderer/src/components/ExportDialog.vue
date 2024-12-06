<template>
  <q-dialog :model-value="visible" full-width>
    <q-card>
      <q-card-section v-if="rows.length > 0">
        <q-table :rows="rows" row-key="name" selection="single" v-model:selected="selected">
          <template v-slot:body-selection="scope">
            <q-toggle v-model="scope.selected" />
          </template>
          <template v-slot:body-cell-standalone="props">
            <q-td :props="props">
              <q-icon v-if="props.value === true" name="mdi-check" />
            </q-td>
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
        <q-btn label="Ok" :disabled="selected.length === 0" color="primary" @click="setOutputConverter" />
        <q-btn label="Cancel" color="primary" @click="$emit('closeExportDialog')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { Ref, ref } from 'vue'
import { QTableProps } from 'quasar';
import { setupQuasarIcons } from './helpers/quasarIcons';
import { FeedbackMessageType, OutputConverter, PandocOutputConverter } from '../common';
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
    name: 'format',
    label: 'format',
    field: 'format',
    sortable: true,
    align: 'center'
  },
  {
    name: 'filters',
    label: 'filters',
    field: 'filters',
    sortable: true,
    align: 'left'
  },
  {
    name: 'referenceFile',
    label: 'reference file',
    field: 'referenceFile',
    sortable: false,
    align: 'left'
  },
  {
    name: 'standalone',
    label: 'standalone',
    field: 'standalone',
    sortable: false,
    align: 'center'
  },
  {
    name: 'show',
    label: 'show',
    field: 'show',
    sortable: false,
    align: 'center'
  },
]

export default {
  props: ['editor', 'visible'],
  emits: ['closeExportDialog', 'setOutputConverter'],
  data() {
    return {
      selected: ref([]) as Ref<OutputConverter[]>,
      askFeedback: false as FeedbackMessageType | false,
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    outputConverters(): OutputConverter[] {
      return this.configuration?.outputConverters || []
    },
    rows() {
      return this.outputConverters.map(o => {
        const pandocOC = o as PandocOutputConverter
        return {
          name: o.name,
          type: o.type || 'pandoc',
          description: o.description || '',
          format: o.format,
          filters: pandocOC.filters?.join(', ') || '',
          referenceFile: pandocOC.referenceFile || '',
          standalone: pandocOC.standalone,
          show: (o.openResult === 'editor' && 'in editor')
            || (o.openResult === 'os' || 'ext. app')
            || ''
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
    setOutputConverter() {
      const converterName = this.selected[0].name
      const converter = this.outputConverters.find(f => f.name === converterName)
      console.log(`converter name="${converterName}", converter=${JSON.stringify(converter)}`)
      if (converter) {
        if (this.askFeedback) converter.feedback = this.askFeedback
        this.$emit('setOutputConverter', converter)
      }
    },
    askFeedbackOrNot(value: FeedbackMessageType | false) {
      this.askFeedback = value
    }
  }
}
</script>