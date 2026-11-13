<template>
  <q-drawer
    show-if-above
    behavior="desktop"
    bordered
    :v-model="panelState === 'normal'"
    side="right"
    :mini="panelState === 'mini'"
    @mouseenter="$emit('mouseenter')"
    @mouseleave="$emit('mouseleave')"
    mini-to-overlay
    :mini-width="60"
    :width="240"
    :breakpoint="500"
    :class="dark ? 'bg-grey-9' : 'bg-grey-3'"
  >
    <CustomStylesPanel
      :editor="editor"
      :panel-state="panelState"
      :current-blocks="currentBlocks"
    />
  </q-drawer>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { NodeWithPos } from '@tiptap/vue-3';

const CustomStylesPanel = defineAsyncComponent(
  () => import('../CustomStylesPanel.vue'),
);

defineProps<{
  editor?: any;
  panelState: 'normal' | 'mini';
  currentBlocks: NodeWithPos[];
  dark: boolean;
}>();

defineEmits<{
  mouseenter: [];
  mouseleave: [];
}>();
</script>
