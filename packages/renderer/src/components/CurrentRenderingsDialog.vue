<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Codemirror } from 'vue-codemirror';

const TAIL_SCROLL_INTERVAL_MS = 1000 / 3;

interface RenderingProcess {
  converterName: string;
  path?: string;
  label: string;
  feedback: readonly string[];
}

const props = defineProps<{
  visible: boolean;
  processes: readonly RenderingProcess[];
}>();
const emit = defineEmits<{
  close: [];
  stop: [converterName: string, path?: string];
}>();

const expanded = ref<string>();
const history = ref(
  new Map<
    string,
    RenderingProcess & {
      active: boolean;
      feedback: string[];
    }
  >(),
);

const processes = computed(() => [...history.value.values()]);
const views = new Map<string, EditorView>();
const tailScrollTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingTailScrolls = new Set<string>();
const feedbackExtensions = [
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
  EditorView.lineWrapping,
];

watch(
  [() => props.visible, () => props.processes],
  async () => {
    const activeKeys = new Set<string>();
    for (const process of props.processes) {
      const key = processKey(process);
      activeKeys.add(key);
      history.value.set(key, {
        ...process,
        active: true,
        feedback: [...process.feedback],
      });
    }
    for (const [key, process] of history.value) {
      if (!activeKeys.has(key)) process.active = false;
    }
    await nextTick();
    for (const process of history.value.values()) {
      if (process.active) scheduleTailScroll(process);
    }
  },
  { deep: true, immediate: true },
);

function processKey(process: Pick<RenderingProcess, 'converterName' | 'path'>): string {
  return `${process.converterName}:${process.path || ''}`;
}

function handleReady(
  process: RenderingProcess,
  payload: { view: EditorView },
): void {
  views.set(processKey(process), payload.view);
  scrollToTail(process);
}

function scrollToTail(process: Pick<RenderingProcess, 'converterName' | 'path'>): void {
  const scroller = views.get(processKey(process))?.dom.querySelector<HTMLElement>(
    '.cm-scroller',
  );
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
}

function scheduleTailScroll(
  process: Pick<RenderingProcess, 'converterName' | 'path'>,
): void {
  const key = processKey(process);
  pendingTailScrolls.add(key);
  if (tailScrollTimers.has(key)) return;

  pendingTailScrolls.delete(key);
  scrollToTail(process);
  tailScrollTimers.set(
    key,
    setTimeout(() => {
      tailScrollTimers.delete(key);
      if (
        pendingTailScrolls.delete(key) &&
        history.value.get(key)?.active
      )
        scrollToTail(process);
    }, TAIL_SCROLL_INTERVAL_MS),
  );
}

function close(): void {
  history.value.clear();
  expanded.value = undefined;
  views.clear();
  for (const timer of tailScrollTimers.values()) clearTimeout(timer);
  tailScrollTimers.clear();
  pendingTailScrolls.clear();
  emit('close');
}
</script>

<template>
  <q-dialog :model-value="visible" @hide="close">
    <q-card style="width: 60rem; max-width: 90vw">
      <q-card-section class="text-h6">
        Current and recent renderings
      </q-card-section>
      <q-list dense>
        <template v-for="process in processes" :key="processKey(process)">
          <q-item>
            <q-item-section avatar>
              <q-circular-progress
                v-if="process.active"
                indeterminate
                size="1em"
              />
              <q-icon v-else name="message_success" />
            </q-item-section>
            <q-item-section>{{ process.label }}</q-item-section>
            <q-item-section side>
              <div class="row items-center no-wrap">
                <q-btn
                  v-if="process.active"
                  flat
                  dense
                  round
                  icon="cancel"
                  title="Stop rendering"
                  @click.stop="emit('stop', process.converterName, process.path)"
                />
                <q-btn
                  flat
                  dense
                  round
                  class="q-ml-sm"
                  :icon="expanded === processKey(process) ? 'menu_up' : 'menu_down'"
                  @click="expanded = expanded === processKey(process) ? undefined : processKey(process)"
                />
              </div>
            </q-item-section>
          </q-item>
          <q-item v-if="expanded === processKey(process)">
            <q-item-section>
              <Codemirror
                class="feedback-editor"
                :model-value="process.feedback.join('\n')"
                :extensions="feedbackExtensions"
                :style="{ height: '30vh', width: '100%' }"
                @ready="handleReady(process, $event)"
              />
            </q-item-section>
          </q-item>
        </template>
      </q-list>
      <q-card-actions align="right">
        <q-btn label="Close" color="primary" @click="close" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
