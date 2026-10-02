<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons();
</script>

<script lang="ts">
import { mapState } from 'pinia';
import { ACTION_DOCUMENT_OPEN, setActionCommand } from '../actions';
import {
  bookmarkLabel,
  DocumentBookmark,
  DocumentOpenActionProps,
  getNextProjectComponentAcrossContainers,
  getParentProjectComponent,
  getPreviousProjectComponentAcrossContainers,
  ProjectBookmark,
  PundokBookmark,
  type ProjectComponent,
} from '../common';
import { editorKeyFromState, getDocState, type DocState } from '../schema';
import { useBackend } from '../stores';
import { basename, isAbsolute, relative, resolve } from 'path-browserify';

function normalizedProjectSource(src: string): string {
  return src
    .replace(/^file:\/\//, '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '');
}

function findProjectSource(
  structure: ProjectComponent,
  candidates: string[],
  projectPath: string,
): string | undefined {
  const normalizedCandidates = candidates.map(normalizedProjectSource);
  const matchesCandidate = (src: string) => {
    const normalizedSource = normalizedProjectSource(src);
    if (normalizedCandidates.includes(normalizedSource)) return true;
    if (!isAbsolute(src) && normalizedSource) {
      return normalizedCandidates.includes(
        normalizedProjectSource(resolve(projectPath, src)),
      );
    }
    return false;
  };
  if (structure.src && matchesCandidate(structure.src)) return structure.src;

  for (const child of structure.children || []) {
    const source = findProjectSource(child, candidates, projectPath);
    if (source) return source;
  }

  return undefined;
}

export default {
  props: ['editor'],
  data() {
    return {
      docBookmarks: [] as DocumentBookmark[],
      projectBookmarks: [] as ProjectBookmark[],
      activeDocState: undefined as DocState | undefined,
    };
  },
  watch: {
    editor: {
      immediate: true,
      handler(editor: any, previousEditor: any) {
        previousEditor?.off('transaction', this.refreshDocState);
        editor?.on('transaction', this.refreshDocState);
        this.refreshDocState();
      },
    },
  },
  beforeUnmount() {
    this.editor?.off('transaction', this.refreshDocState);
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    editorKey() {
      return editorKeyFromState(this.editor?.state);
    },
    project() {
      return this.activeDocState?.project;
    },
    currentProjectSource() {
      const docState = this.activeDocState;
      const structure = docState?.projectStructure;
      const project = this.project;
      if (!project?.path || !docState?.workingFolder || !docState.documentName)
        return undefined;
      const absoluteSource = resolve(
        docState.workingFolder,
        docState.documentName,
      );
      const projectRelativeSource = relative(project.path, absoluteSource);
      return structure
        ? findProjectSource(
            structure,
            [
              absoluteSource,
              projectRelativeSource,
              docState.documentName,
              resolve(project.path, docState.documentName),
            ],
            project.path,
          )
        : undefined;
    },
    previousProjectComponent() {
      const src = this.currentProjectSource;
      const structure = this.activeDocState?.projectStructure;
      return structure && src
        ? getPreviousProjectComponentAcrossContainers(structure, src)
        : undefined;
    },
    nextProjectComponent() {
      const src = this.currentProjectSource;
      const structure = this.activeDocState?.projectStructure;
      return structure && src
        ? getNextProjectComponentAcrossContainers(structure, src)
        : undefined;
    },
    parentProjectComponent() {
      const src = this.currentProjectSource;
      const structure = this.activeDocState?.projectStructure;
      return structure && src
        ? getParentProjectComponent(structure, src)
        : undefined;
    },
  },
  methods: {
    refreshDocState() {
      this.activeDocState = getDocState(this.editor?.view?.state);
    },
    docState() {
      return getDocState(this.editor);
    },
    async loadBookmarks() {
      this.docBookmarks = ((await this.backend?.getBookmarks('document')) ||
        []) as DocumentBookmark[];
      this.projectBookmarks = ((await this.backend?.getBookmarks('project')) ||
        []) as ProjectBookmark[];
    },
    titleForBookmark(b: PundokBookmark) {
      const { label, tooltip } = bookmarkLabel(b);
      return `${label}, ${tooltip}`;
    },
    labelForBookmark(b: PundokBookmark) {
      const { label } = bookmarkLabel(b);
      return label;
    },
    openDocument() {
      if (this.editorKey)
        setActionCommand(this.editorKey, ACTION_DOCUMENT_OPEN, {});
    },
    openProjectBookmark(p: ProjectBookmark) {
      if (this.editorKey)
        setActionCommand(this.editorKey, ACTION_DOCUMENT_OPEN, {
          context: {
            path: p.url,
          },
        } as DocumentOpenActionProps);
    },
    openDocBookmark(d: DocumentBookmark) {
      if (this.editorKey)
        setActionCommand(this.editorKey, ACTION_DOCUMENT_OPEN, {
          context: {
            path: d.url,
            configurationName: d.configurationName,
          },
        } as DocumentOpenActionProps);
    },
    openProjectComponent(component: ProjectComponent) {
      if (this.editorKey && this.project?.path && component.src)
        setActionCommand(this.editorKey, ACTION_DOCUMENT_OPEN, {
          context: {
            path: resolve(this.project.path, component.src),
            project: this.project,
          },
        } as DocumentOpenActionProps);
    },
    projectComponentFilename(component?: ProjectComponent) {
      return component?.src ? basename(component.src) : '';
    },
  },
};
</script>

<template>
  <q-btn-dropdown
    class="toolbar-button"
    :title="$t('document.open')"
    split
    dense
    icon="document_open"
    dropdown-icon="menu_down"
    @click="openDocument()"
    @before-show="loadBookmarks()"
    elevation="3"
    size="sm"
    color="grey-5"
  >
    <q-list dense>
      <q-item
        :disable="projectBookmarks.length === 0"
        key="recent-projects"
        clickable
      >
        <q-item-section>
          <q-item-label>{{ $t('recent.projects') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="menu_right" />
        </q-item-section>
        <q-menu anchor="top right" self="top left">
          <q-list>
            <q-item
              v-for="p in projectBookmarks"
              :key="p.url"
              :title="titleForBookmark(p)"
              clickable
              v-close-popup
              @click="openProjectBookmark(p)"
            >
              <q-item-section>
                {{ p.name }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-item>
      <q-item
        :disable="docBookmarks.length === 0"
        key="recent-documents"
        clickable
      >
        <q-item-section>
          <q-item-label>{{ $t('recent.documents') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="menu_right" />
        </q-item-section>
        <q-menu anchor="top right" self="top left">
          <q-list>
            <q-item
              v-for="d in docBookmarks"
              :key="d.url"
              :title="titleForBookmark(d)"
              clickable
              v-close-popup
              @click="openDocBookmark(d)"
            >
              <q-item-section>
                {{ labelForBookmark(d) }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-item>
      <q-separator
        v-if="
          project &&
          (previousProjectComponent?.src ||
            nextProjectComponent?.src ||
            parentProjectComponent?.src)
        "
      />
      <q-item
        v-if="project && nextProjectComponent?.src"
        key="next-project-component"
        :title="$t('document.openNextProjectDocument')"
        clickable
        v-close-popup
        @click="openProjectComponent(nextProjectComponent)"
      >
        <q-item-section>
          <q-item-label>
            {{ projectComponentFilename(nextProjectComponent) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="skip_next" />
        </q-item-section>
      </q-item>
      <q-item
        v-if="project && previousProjectComponent?.src"
        key="previous-project-component"
        :title="$t('document.openPreviousProjectDocument')"
        clickable
        v-close-popup
        @click="openProjectComponent(previousProjectComponent)"
      >
        <q-item-section>
          <q-item-label>
            {{ projectComponentFilename(previousProjectComponent) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="skip_previous" />
        </q-item-section>
      </q-item>
      <q-item
        v-if="project && parentProjectComponent?.src"
        key="parent-project-component"
        :title="$t('document.openParentProjectDocument')"
        clickable
        v-close-popup
        @click="openProjectComponent(parentProjectComponent)"
      >
        <q-item-section>
          <q-item-label>
            {{ projectComponentFilename(parentProjectComponent) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="package_up" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>
