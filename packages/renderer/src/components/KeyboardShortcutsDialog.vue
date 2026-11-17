<template>
  <q-dialog :model-value="visible" @hide="$emit('close')">
    <q-card style="width: 900px; max-width: 90vw">
      <q-card-section>
        <div class="text-h5">{{ $t('keyboardShortcuts.title') }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          v-model="searchText"
          class="q-mb-md"
          dense
          outlined
          clearable
          :label="$t('keyboardShortcuts.search')"
        />
        <q-markup-table flat bordered wrap-cells>
          <thead>
            <tr>
              <th class="text-left">{{ $t('keyboardShortcuts.shortcut') }}</th>
              <th class="text-left">{{ $t('keyboardShortcuts.meaning') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[name, item] in filteredShortcutEntries" :key="name">
              <td>
                <code>{{ localizedShortcut(name) }}</code>
              </td>
              <td>{{ description(name, item.description) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          color="primary"
          :label="$t('keyboardShortcuts.close')"
          @click="$emit('close')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { SHORTCUT_KEYS, shortcut } from '../common';
import { tfb } from '../i18n';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const { t, te } = useI18n();
const searchText = ref('');
const shortcutEntries = Object.entries(SHORTCUT_KEYS) as [
  string,
  { shortcut: string; description: string },
][];

const filteredShortcutEntries = computed(() => {
  const search = searchText.value.trim().toLocaleLowerCase();
  if (!search) return shortcutEntries;

  return shortcutEntries.filter(([name, item]) =>
    [name, localizedShortcut(name), description(name, item.description)]
      .some((value) => value.toLocaleLowerCase().includes(search)),
  );
});

function description(name: string, fallback: string) {
  return tfb(`keyboardShortcuts.descriptions.${name}`, fallback);
}

function localizedShortcut(name: string) {
  return shortcut(name)
    .split(' ')
    .map((key) => {
      const translationKey = `keyboardShortcuts.keys.${key}`;
      return te(translationKey) ? t(translationKey) : key;
    })
    .join(' ');
}
</script>
