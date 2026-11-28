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
      v-if="additionalButtonsExpanded && additionalButtonsPersistent"
      class="expand-button"
      color="primary"
      icon="close"
      :title="$t('expandableButtonsSet.collapse')"
      @click="hideAdditionalButtons"
    />
    <ToolbarButton
      v-else-if="!additionalButtonsExpanded"
      class="expand-button"
      color="primary"
      text="..."
      :title="$t('expandableButtonsSet.expand')"
      @click="showAdditionalButtons"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import ToolbarButton from './ToolbarButton.vue';

export type ButtonDefinition = {
  name: string;
  visible: boolean;
  separatorAfter?: boolean;
};

const props = defineProps<{ defaultButtons: ButtonDefinition[] }>();
const emit = defineEmits<{ 'expanded-change': [] }>();
const defaultButtons = props.defaultButtons;
const additionalButtonsExpanded = ref(false);
const additionalButtonsPersistent = ref(false);
const visibleAdditionalButtons = ref(new Set<string>());
let additionalButtonsTimer: ReturnType<typeof setTimeout> | undefined;

function isVisible(button: ButtonDefinition) {
  return (
    button.visible ||
    additionalButtonsExpanded.value ||
    visibleAdditionalButtons.value.has(button.name)
  );
}

function clearAdditionalButtonsTimer() {
  if (additionalButtonsTimer) {
    clearTimeout(additionalButtonsTimer);
    additionalButtonsTimer = undefined;
  }
}

function showAdditionalButtons(event: MouseEvent) {
  clearAdditionalButtonsTimer();
  additionalButtonsPersistent.value = event.ctrlKey;
  additionalButtonsExpanded.value = true;
  if (!event.ctrlKey) {
    additionalButtonsTimer = setTimeout(() => {
      additionalButtonsExpanded.value = false;
      additionalButtonsPersistent.value = false;
      additionalButtonsTimer = undefined;
    }, 5000);
  }
}

function hideAdditionalButtons() {
  clearAdditionalButtonsTimer();
  additionalButtonsExpanded.value = false;
  additionalButtonsPersistent.value = false;
}

function collapse(buttonName: string) {
  clearAdditionalButtonsTimer();
  additionalButtonsExpanded.value = false;
  additionalButtonsPersistent.value = false;
  visibleAdditionalButtons.value.add(buttonName);
}

watch(additionalButtonsExpanded, () => emit('expanded-change'), {
  flush: 'post',
});

onBeforeUnmount(clearAdditionalButtonsTimer);
</script>

<style scoped lang="scss">
.expandable-button-set {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.2rem;
}

.expand-button {
  min-width: 1rem;
  width: 1rem;
  padding-right: 0;
  padding-left: 0;
}
</style>
