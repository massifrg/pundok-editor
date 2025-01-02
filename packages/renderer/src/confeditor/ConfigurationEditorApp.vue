<script lang="ts">
// optional styles
import { mapState } from 'pinia';
import { useActions } from '../stores'
import { EditorAction } from '../actions';
import { createBackend } from '../backend';

export default {
  components: {
  },
  data() {
    return {
      backend: createBackend({ ipc: window.ipc }),
    }
  },
  computed: {
    ...mapState(useActions, ['lastAction']),
  },
  watch: {
    lastAction(action: EditorAction) {
    },
  },
  methods: {
  }
}
</script>

<template>
</template>