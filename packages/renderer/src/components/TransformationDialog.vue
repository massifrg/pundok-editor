<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean;
    active: boolean;
    failed: boolean;
    log?: readonly string[];
  }>(),
  { log: () => [] },
);

const emit = defineEmits<{
  close: [];
  stop: [];
}>();
</script>

<template>
  <q-dialog :model-value="visible" @hide="emit('close')">
    <q-card style="width: 60rem; max-width: 90vw">
      <q-card-section class="text-h6">
        {{ $t('transformationDialog.title') }}
      </q-card-section>
      <q-card-section>
        <q-circular-progress v-if="active" indeterminate size="1em" class="q-mr-sm" />
        <span v-if="active">{{ $t('transformationDialog.inProgress') }}</span>
        <span v-else-if="failed">{{ $t('transformationDialog.failedState') }}</span>
        <span v-else>{{ $t('transformationDialog.finished') }}</span>
      </q-card-section>
      <q-card-section v-if="log.length">
        <pre class="transformation-log">{{ log.join('\n') }}</pre>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          v-if="active"
          :label="$t('transformationDialog.cancel')"
          color="negative"
          @click="emit('stop')"
        />
        <q-btn :label="$t('close')" color="primary" @click="emit('close')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
