<template>
  <q-btn class="toolbar-button" elevation="3" size="xs" :disabled="disabled" :color="color || 'grey-5'"
    :text-color="textColor || 'white'" :icon="icon">
    <span class="button-text" v-if="text">{{ text }}</span>
    <q-badge v-if="styleactive" rounded floating :color="styleactiveColor || 'white'"></q-badge>
    <slot />
  </q-btn>
</template>

<script lang="ts">
export default {
  props: ['color', 'textColor', 'icon', 'text', 'badge', 'disabled', 'styleactive', 'styleactiveColor'],
};
</script>

<style lang="scss">
.button-text {
  font-size: larger;
}
</style>
