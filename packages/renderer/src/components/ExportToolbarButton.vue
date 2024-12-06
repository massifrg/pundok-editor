<template>
  <q-btn-dropdown v-if="converters.length > 0" :title="dropDownTitle" icon="mdi-file-export" color="grey-5" split dense
    size="sm" dropdown-icon="mdi-menu-down" :disable-main-btn="!defaultOutputConverter"
    @click="exportWithConverter(defaultOutputConverter)">
    <q-list>
      <q-item v-for="(oc, index) in converters" :key="index" :title="oc.description" clickable v-close-popup
        density="compact" dense @click="exportWithConverter(oc)">
        <q-item-section side style="width: 3rem"> {{ oc.extension }} </q-item-section>
        <q-item-section no-wrap>{{ oc.name }}</q-item-section>
      </q-item>
      <q-item key="-1" title="choose an output converter..." clickable v-close-popup density="compact" dense
        @click="showExportDialog()">
        <q-item-section side style="width: 3rem"></q-item-section>
        <q-item-section no-wrap><i>choose...</i></q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { OutputConverter, StoredDoc } from '../common';
import { setActionExportDocument, setActionShowExportDialog } from '../actions';
import { getEditorDocState } from '../schema';

export default {
  props: ['editor'],
  computed: {
    docState() {
      return getEditorDocState(this.editor)
    },
    configuration() {
      return this.docState?.configuration
    },
    documentName() {
      return this.docState?.documentName
    },
    lastExportResponse() {
      return this.docState?.lastExportResponse
    },
    configurationName() {
      return this.configuration?.name
    },
    defaultOutputConverter() {
      return this.configuration?.defaultOutputConverter
    },
    outputConverters() {
      return this.configuration?.outputConverters || []
    },
    converters() {
      return this.outputConverters.filter(oc => !oc.projectBuild)
    },
    dropDownTitle() {
      if (this.defaultOutputConverter) {
        const { name, extension } = this.defaultOutputConverter
        return `export in ${extension} with "${name}" converter (or choose a different converter)`
      }
    },
  },
  methods: {
    exportWithConverter(oc?: OutputConverter) {
      const editor = this.editor
      if (editor && oc) {
        const outputConverter = { ...oc }
        let storedDoc: Partial<StoredDoc> | undefined = undefined
        if (this.lastExportResponse) {
          const { id, configurationName, converter, path, exportedAsPath } = this.lastExportResponse.doc
          if (this.documentName == id && this.configurationName == configurationName && oc.name == converter?.name) {
            console.log(`exportedAsPath=${exportedAsPath}`)
            storedDoc = { id, path, converter, configurationName, exportedAsPath }
            outputConverter.feedback = 'success'
          }
        }
        setActionExportDocument(editor.state, outputConverter, storedDoc)
      }
    },
    showExportDialog() {
      const editor = this.editor
      setActionShowExportDialog(editor.state)
    }
  }
}
</script>../actions/actionCommands