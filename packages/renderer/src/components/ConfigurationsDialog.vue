<template>
  <q-dialog :model-value="visible">
    <q-card>
      <q-card-section v-if="debugInfo['configs-dir']">
        Configurations are in folder {{ debugInfo['configs-dir'] }}
      </q-card-section>
      <q-card-section>
        <q-radio v-for="c in availableConfigs" :model-value="chosenConfiguration" :val="c.name" :label="c.name"
          :title="c.description" @update:model-value="updateChosenConfiguration" />
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn label="Ok" color="primary" @click="setConfiguration" />
        <q-btn label="Cancel" color="primary" @click="$emit('closeConfigurationsDialog')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
// import { type PandocEditorConfig } from '../config'
import { mapState } from 'pinia'
import { useBackend } from '../stores'
import { ConfigurationSummary } from '../common'

export default {
  props: ['visible', 'editor', 'currentConfiguration'],
  emits: ['setConfiguration', 'closeConfigurationsDialog'],
  data() {
    return {
      availableConfigs: [] as ConfigurationSummary[],
      chosenConfiguration: this.currentConfiguration,
      debugInfo: {} as Record<string, any>,
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
  },
  mounted() {
    const backend = this.backend
    if (backend) {
      backend.availableConfigurations().then((configs: ConfigurationSummary[]) => {
        this.availableConfigs = configs
      })
      backend.debugInfo().then(info => {
        this.debugInfo = info
      })
    }

  },
  methods: {
    updateChosenConfiguration(value: string) {
      this.chosenConfiguration = value
    },
    setConfiguration() {
      this.$emit('setConfiguration', this.chosenConfiguration)
      this.$emit('closeConfigurationsDialog')
    }
  },
  watch: {
    availableConfigurations() {
      if (!this.chosenConfiguration && this.availableConfigs.length > 0) {
        this.chosenConfiguration = this.availableConfigs[0]
      }
    },
  }
}
</script>