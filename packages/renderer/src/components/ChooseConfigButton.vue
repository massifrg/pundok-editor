<template>
  <q-btn-dropdown v-if="configurations.length > 1" class="toolbar-button" :label="currentConfigurationName"
    :title="title" icon="mdi-sync-circle" dense dropdown-icon="mdi-menu-down" @click="" elevation="3" size="sm"
    color="grey-5" auto-close>
    <q-list>
      <q-item v-for="c in otherConfigurations" :key="c.name" clickable :value="c.name" :title="configTitle(c)" dense
        @click="$emit('change-configuration', c.name)">{{ c.name }}</q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { ConfigurationSummary } from '../common';
import { useBackend } from '../stores';

export default {
  props: ['currentConfigurationName', 'title'],
  emits: ['change-configuration'],
  data() {
    return {
      configurations: [] as ConfigurationSummary[]
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    otherConfigurations(): ConfigurationSummary[] {
      return this.configurations.filter(c => c.name !== this.currentConfigurationName)
    }
  },
  mounted() {
    this.backend?.availableConfigurations().then(configs => {
      this.configurations = configs
    })
  },
  methods: {
    configTitle(conf: ConfigurationSummary) {
      return conf.description
    },
    changeConfig(newConfName: string) {
      if (newConfName != this.currentConfigurationName)
        this.$emit('change-configuration', newConfName)
    }
  }
};
</script>
