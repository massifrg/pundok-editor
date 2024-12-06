<template>
  <q-btn-dropdown v-if="inputConverters.length > 0" :title="dropDownTitle" icon="mdi-file-import" color="grey-5" split
    dense size="sm" dropdown-icon="mdi-menu-down" :disable-main-btn="!defaultInputConverter"
    @click="importWithConverter(defaultInputConverter)">
    <q-list>
      <q-item v-for="(oc, index) in inputConverters" :key="index" :title="oc.description" clickable v-close-popup
        density="compact" dense @click="importWithConverter(oc)">
        <q-item-section side style="width: 3rem"> {{ oc.extensions.join(', ') }} </q-item-section>
        <q-item-section no-wrap>{{ oc.name }}</q-item-section>
      </q-item>
      <q-item key="-1" title="choose an input converter..." clickable v-close-popup density="compact" dense
        @click="showImportDialog()">
        <q-item-section side style="width: 3rem"></q-item-section>
        <q-item-section no-wrap><i>choose...</i></q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { InputConverter } from '../common';
import { setActionImportDocument, setActionShowImportDialog } from '../actions';
import { getEditorConfiguration } from '../schema';

export default {
  props: ['editor'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    defaultInputConverter() {
      return this.configuration?.defaultInputConverter
    },
    inputConverters() {
      return this.configuration?.inputConverters || []
    },
    dropDownTitle() {
      if (this.defaultInputConverter) {
        const { name, extensions } = this.defaultInputConverter
        return `import in ${extensions.join(', ')} with "${name}" converter or choose a converter`
      }
    },
  },
  methods: {
    importWithConverter(ic?: InputConverter) {
      if (ic) setActionImportDocument(this.editor.state, ic)
    },
    showImportDialog() {
      setActionShowImportDialog(this.editor.state)
    }
  }
}
</script>../actions/actionCommands