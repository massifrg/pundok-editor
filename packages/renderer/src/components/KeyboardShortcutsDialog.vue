<template>
  <q-dialog :model-value="visible" @hide="$emit('close')">
    <q-card style="width: 900px; max-width: 90vw">
      <q-card-section>
        <div class="text-h5">{{ $t('keyboardShortcuts.title') }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-markup-table flat bordered wrap-cells>
          <thead>
            <tr>
              <th class="text-left">{{ $t('keyboardShortcuts.shortcut') }}</th>
              <th class="text-left">{{ $t('keyboardShortcuts.meaning') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[name, item] in shortcutEntries" :key="name">
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
import { useI18n } from 'vue-i18n';
import { SHORTCUT_KEYS, shortcut } from '../common';
import { tfb } from '../i18n';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const { t, te } = useI18n();
const shortcutEntries = Object.entries(SHORTCUT_KEYS) as [
  string,
  { shortcut: string; description: string },
][];

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
