<template>
  <div class="expandable-button-set">
    <template v-for="button in defaultButtons" :key="button.name">
      <slot
        name="button"
        :button="button"
        :visible="isVisible(button)"
        :collapse="() => collapse(button.name)"
      />
      <span
        v-if="button.separatorAfter && additionalButtonsExpanded"
        class="button-separator"
      />
    </template>

    <ToolbarButton
      v-if="!additionalButtonsExpanded"
      text="..."
      title="show more formatting buttons"
      @click="showAdditionalButtons"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import ToolbarButton from './ToolbarButton.vue';

export type ButtonDefinition = {
  name: string;
  visible: boolean;
  separatorAfter?: boolean;
};

const props = defineProps<{ defaultButtons: ButtonDefinition[] }>();
const defaultButtons = props.defaultButtons;
const additionalButtonsExpanded = ref(false);
const visibleAdditionalButton = ref<string | null>(null);
let additionalButtonsTimer: ReturnType<typeof setTimeout> | undefined;

function isVisible(button: ButtonDefinition) {
  return (
    button.visible ||
    additionalButtonsExpanded.value ||
    visibleAdditionalButton.value === button.name
  );
}

function clearAdditionalButtonsTimer() {
  if (additionalButtonsTimer) {
    clearTimeout(additionalButtonsTimer);
    additionalButtonsTimer = undefined;
  }
}

function showAdditionalButtons() {
  clearAdditionalButtonsTimer();
  additionalButtonsExpanded.value = true;
  visibleAdditionalButton.value = null;
  additionalButtonsTimer = setTimeout(() => {
    additionalButtonsExpanded.value = false;
    additionalButtonsTimer = undefined;
  }, 5000);
}

function collapse(buttonName: string) {
  clearAdditionalButtonsTimer();
  additionalButtonsExpanded.value = false;
  visibleAdditionalButton.value = buttonName;
}

onBeforeUnmount(clearAdditionalButtonsTimer);
</script>

<style scoped lang="scss">
.expandable-button-set {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.2rem;
}
</style>
