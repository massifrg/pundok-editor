<template>
  <q-btn v-if="configurations.length <= 1" class="toolbar-button" elevation="3" size="sm" color="grey-5"
    @click="$emit('newDocument')" title="new empty document" icon="mdi-file-document" split dense></q-btn>
  <q-btn-dropdown v-if="configurations.length > 1" class="toolbar-button" title="new empty document"
    icon="mdi-file-document" split dense dropdown-icon="mdi-menu-down" @click="$emit('newDocument')" elevation="3"
    size="sm" color="grey-5" auto-close>
    <q-list>
      <q-item v-for="c in configurations" :key="c.name" clickable :value="c.name" :title="configTitle(c)" dense
        @click="$emit('newDocument', c.name)">{{ c.name }}
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { ConfigurationSummary } from '../common';
import { useBackend } from '../stores';

export default {
  emits: ['newDocument'],
  data() {
    return {
      configurations: [] as ConfigurationSummary[]
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
  },
  mounted() {
    this.backend?.availableConfigurations().then(configs => {
      this.configurations = configs
    })
  },
  methods: {
    configTitle(conf: ConfigurationSummary) {
      return `new empty "${conf.name}" document (${conf.description})`
    }
  }
};
</script>
