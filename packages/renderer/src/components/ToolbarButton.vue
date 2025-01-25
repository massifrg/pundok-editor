<template>
  <q-btn class="toolbar-button" elevation="3" size="xs" :disabled="disabled" :color="color || 'grey-5'"
    :text-color="textColor || 'white'" :icon="icon" :title="tooltip">
    <span class="button-text" v-if="text">{{ text }}</span>
    <q-badge v-if="styleactive" rounded floating :color="styleactiveColor || 'white'"></q-badge>
    <slot />
  </q-btn>
</template>

<script lang="ts">
import { shortcutSuffix } from '../common';

export default {
  props: [
    'color',
    'textColor',
    'icon',
    'text',
    'badge',
    'disabled',
    'styleactive',
    'styleactiveColor',
    'title',
    'shortcut'
  ],
  computed: {
    tooltip() {
      return (this.title || '') + shortcutSuffix(this.shortcut)
    }
  }
};
</script>

<style lang="scss">
.button-text {
  font-size: larger;
}
</style>
