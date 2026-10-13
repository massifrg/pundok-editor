<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import type { OutputConverter, ProjectComponent, PundokEditorProject } from '../common';
import { getParentProjectComponent } from '../common';
import { getDocState, getEditorConfiguration } from '../schema';
import { expandCommandArgs } from './helpers/expandCommandArgs';

const props = defineProps<{
  editor?: Editor;
  renderingTargets?: readonly RenderingTarget[];
}>();
const emit = defineEmits<{
  render: [converter: OutputConverter, path?: string];
}>();

const menu = ref<{ show: () => void }>();
const defaultTarget = ref<RenderTarget>();

interface RenderTarget {
  converter: OutputConverter;
  path?: string;
}

interface RenderingTarget {
  converterName: string;
  path?: string;
}

const docState = computed(() => getDocState(props.editor?.state));
const project = computed(() => docState.value?.project);
const configuration = computed(() =>
  props.editor ? getEditorConfiguration(props.editor) : undefined,
);
const structure = computed(() => docState.value?.projectStructure);
const currentPath = computed(() => {
  const state = docState.value;
  return state?.workingFolder && state.documentName
    ? joinPath(state.workingFolder, state.documentName)
    : undefined;
});

const renderers = computed(() =>
  (configuration.value?.outputConverters || [])
    .filter((converter) => converter.dontAskForResultFile === true)
    .map((converter) => ({
      converter,
      path: undefined,
      resultFile: resultFileFor(converter, currentPath.value, project.value),
    })),
);

const ancestorTargets = computed(() => {
  const result: { path: string; label: string }[] = [];
  let source = currentProjectSource(structure.value, currentPath.value, project.value);
  while (source) {
    const parent = structure.value && getParentProjectComponent(structure.value, source);
    if (!parent?.src) break;
    const path = project.value?.path
      ? joinPath(project.value.path, parent.src)
      : parent.src;
    result.push({ path, label: path });
    source = parent.src;
  }
  return result;
});

const menuItems = computed(() =>
  renderers.value.map((item) => ({
    ...item,
    hasAncestors: ancestorTargets.value.length > 0,
    ancestors: [
      ...(currentPath.value
        ? [{
            path: currentPath.value,
            label: currentPath.value,
            resultFile: resultFileFor(item.converter, currentPath.value, project.value),
          }]
        : []),
      ...ancestorTargets.value.map((ancestor) => ({
      ...ancestor,
      resultFile: resultFileFor(item.converter, ancestor.path, project.value),
      })),
    ],
  })),
);

const dropdownTitle = computed(() => {
  const target = defaultTarget.value;
  if (!target) return 'render...';
  return labelFor(
    target.converter,
    resultFileFor(target.converter, target.path || currentPath.value, project.value),
  );
});

const mainRendering = computed(() =>
  defaultTarget.value ? isRendering(defaultTarget.value) : false,
);

watch(
  [configuration, project, structure, currentPath],
  () => {
    defaultTarget.value = undefined;
  },
  { immediate: true },
);

function joinPath(base: string, name: string): string {
  return `${base.replace(/[\\/]+$/, '')}/${name.replace(/^[\\/]+/, '')}`;
}

function normalizedSource(source: string): string {
  return source.replace(/^file:\/\//, '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function currentProjectSource(
  tree?: ProjectComponent,
  path?: string,
  currentProject?: PundokEditorProject,
): string | undefined {
  if (!tree || !path || !currentProject?.path) return undefined;
  const candidates = [
    path,
    normalizedSource(path),
    normalizedSource(path.replace(`${currentProject.path}/`, '')),
  ];
  const matches = (source?: string) => {
    if (!source) return false;
    const normalized = normalizedSource(source);
    return candidates.includes(normalized) ||
      candidates.includes(normalizedSource(joinPath(currentProject.path, source)));
  };
  if (matches(tree.src)) return tree.src;
  for (const child of tree.children || []) {
    const found = currentProjectSource(child, path, currentProject);
    if (found) return found;
  }
  return undefined;
}

function resultFileFor(
  converter: OutputConverter,
  path?: string,
  currentProject?: PundokEditorProject,
): string {
  if (!converter.resultFile) return '';
  return expandCommandArgs([converter.resultFile], {
    path,
    project: currentProject,
  })[0];
}

function labelFor(converter: OutputConverter, resultFile: string): string {
  return `render ${resultFile} with ${converter.name}`;
}

function isRendering(target: RenderTarget): boolean {
  const path = target.path || currentPath.value;
  return !!props.renderingTargets?.some(
    (rendering) =>
      rendering.converterName === target.converter.name &&
      (rendering.path || currentPath.value) === path,
  );
}

function select(target: RenderTarget): void {
  if (isRendering(target)) return;
  defaultTarget.value = target;
  emit('render', target.converter, target.path || currentPath.value);
}

function clickMain(): void {
  if (defaultTarget.value) {
    if (mainRendering.value) return;
    emit('render', defaultTarget.value.converter, defaultTarget.value.path);
  } else {
    menu.value?.show();
  }
}

</script>

<template>
  <q-btn-group v-if="menuItems.length" class="toolbar-button">
    <q-btn
      dense
      size="sm"
      color="grey-5"
      icon="document_render"
      :disable="mainRendering"
      :loading="mainRendering"
      :title="dropdownTitle"
      @click="clickMain"
    />
    <q-btn-dropdown
      ref="menu"
      dense
      size="sm"
      color="grey-5"
      dropdown-icon="menu_down"
      title="render..."
    >
    <q-list dense>
      <q-item
        v-for="item in menuItems"
        :key="item.converter.name"
        :disable="isRendering(item)"
        :clickable="!item.hasAncestors && !isRendering(item)"
        @click="!item.hasAncestors && select(item)"
      >
        <q-item-section avatar>
          <q-circular-progress v-if="isRendering(item)" indeterminate size="1em" />
          <svg v-else-if="item.converter.icon" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="item.converter.icon" />
          </svg>
          <q-icon v-else name="document_render" />
        </q-item-section>
        <q-item-section>
          {{ item.hasAncestors
            ? `render with ${item.converter.name}`
            : labelFor(item.converter, item.resultFile) }}
        </q-item-section>
        <q-item-section v-if="item.hasAncestors" side>
          <q-icon name="menu_right" />
        </q-item-section>
        <q-menu v-if="item.hasAncestors" anchor="top right" self="top left">
          <q-list dense>
            <q-item
              v-for="ancestor in item.ancestors"
              :key="ancestor.path"
              :disable="isRendering({ converter: item.converter, path: ancestor.path })"
              clickable
              v-close-popup
              @click="select({ converter: item.converter, path: ancestor.path })"
            >
              <q-item-section avatar>
                <q-circular-progress
                  v-if="isRendering({ converter: item.converter, path: ancestor.path })"
                  indeterminate
                  size="1em"
                />
                <svg v-else-if="item.converter.icon" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="item.converter.icon" />
                </svg>
                <q-icon v-else name="document_render" />
              </q-item-section>
              <q-item-section>
                {{ ancestor.resultFile }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-item>
    </q-list>
    </q-btn-dropdown>
  </q-btn-group>
</template>
