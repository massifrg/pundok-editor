<template>
  <q-btn dense outline :label="buttonLabel" :title="label" icon="arrow_drop_down">
    <q-menu @show="setMenuOpen(true)" @hide="setMenuOpen(false)">
      <q-list dense>
        <q-item v-for="(option, index) in options" :key="`${option.value ?? 'unset'}-${index}`" clickable v-close-popup
          :active="option.value === modelValue" active-class="text-primary" @click="select(option.value)">
          <q-item-section v-if="iconForOption(option)" avatar>
            <q-icon :name="iconForOption(option)" />
          </q-item-section>
          <q-item-section>{{ option.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { iconForFormat } from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';

setupQuasarIcons();

type Option = {
  label: string;
  value: string | null;
};

const props = defineProps<{
  modelValue: string | null;
  options: Option[];
  label: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const menuOpen = ref(false);
const typedPrefix = ref('');
let lastTypedAt = 0;

const buttonLabel = computed(() =>
  props.options.find((option) => option.value === props.modelValue)?.label
  || props.modelValue
  || props.label,
);

function iconForOption(option: Option): string | undefined {
  return option.value && iconForFormat(option.value) || 'format_other';
}

function select(value: string | null) {
  emit('update:modelValue', value);
}

function setMenuOpen(open: boolean) {
  menuOpen.value = open;
  typedPrefix.value = '';
  lastTypedAt = 0;
  if (open) document.addEventListener('keydown', onKeydown, true);
  else document.removeEventListener('keydown', onKeydown, true);
}

function onKeydown(event: KeyboardEvent) {
  if (
    !menuOpen.value
    || event.key.length !== 1
    || event.ctrlKey
    || event.metaKey
    || event.altKey
  ) return;

  event.preventDefault();
  event.stopPropagation();

  const now = Date.now();
  const key = event.key.toLocaleLowerCase();
  typedPrefix.value = now - lastTypedAt > 700
    ? key
    : `${typedPrefix.value}${key}`;
  lastTypedAt = now;

  const match = props.options.find((option) =>
    option.label.toLocaleLowerCase().startsWith(typedPrefix.value),
  );
  if (match) {
    select(match.value);
  } else {
    typedPrefix.value = key;
    const singleCharacterMatch = props.options.find((option) =>
      option.label.toLocaleLowerCase().startsWith(key),
    );
    if (singleCharacterMatch) select(singleCharacterMatch.value);
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true);
});
</script>
