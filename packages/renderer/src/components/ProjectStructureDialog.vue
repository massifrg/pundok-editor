<template>
  <q-dialog
    :model-value="visible"
    :full-width="!minimized"
    :full-height="maximized"
    :position="minimized ? 'right' : 'standard'"
    seamless
  >
    <!-- <div class="shadow shadow-24 structure-dialog"> -->
    <q-card class="shadow shadow-24">
      <q-card-actions horizontal align="stretch" class="bg-primary">
        <q-btn
          v-if="!minimized"
          :title="$t('projectStructureDialog.reloadStructure')"
          size="sm"
          icon="refresh"
          @click="reloadStructure()"
        />
        <q-space v-if="!minimized" />
        <q-chip v-if="!minimized">{{
          loaded?.id || loaded?.path || ''
        }}</q-chip>
        <q-space v-if="!minimized" />
        <q-btn
          v-if="!minimized"
          :title="$t('projectStructureDialog.openInMainEditor')"
          size="sm"
          icon="document_open_in_main_editor"
          :disabled="!selected"
          @click="openInMainEditor"
        />
        <q-space v-if="!minimized" style="max-width: 2rem" />
        <q-btn
          v-if="!minimized"
          :title="$t('projectStructureDialog.minimize')"
          size="sm"
          icon="dialog_minimize"
          @click="setShowMode('minimized')"
        />
        <q-btn
          v-if="!normalSized"
          :title="$t('projectStructureDialog.normalSize')"
          size="sm"
          icon="dialog_normal"
          @click="setShowMode('normal')"
        />
        <q-btn
          v-if="!maximized"
          :title="$t('projectStructureDialog.maximize')"
          size="sm"
          icon="dialog_maximize"
          @click="setShowMode('maximized')"
        />
        <q-btn
          :title="$t('close')"
          size="sm"
          icon="window_close"
          @click="closeDialog()"
        />
      </q-card-actions>
      <q-card-section>
        <q-splitter
          v-model="splitterModel"
          :after-class="afterClass"
          :before-class="beforeClass"
          separator-style="background-color: black"
        >
          <template v-slot:before>
            <q-card>
              <!-- <q-card-actions> </q-card-actions> -->
              <q-card-section>
                <transition
                  appear
                  enter-active-class="animated fadeIn"
                  leave-active-class="animated fadeOut"
                >
                  <q-tree
                    ref="tree"
                    v-show="!isLoadingStructure"
                    :nodes="docTree"
                    node-key="label"
                    dense
                    v-model:expanded="expanded"
                    :selected="selected"
                    :selected-color="selectedColor"
                    default-expand-all
                    @update:selected="updateSelected"
                    @dblclick.stop="openInMainEditor"
                  />
                </transition>
              </q-card-section>
            </q-card>
          </template>
          <template v-slot:after>
            <q-card class="q-pa-none">
              <q-card-section class="scroll q-pa-none">
                <PundokEditor
                  :height="height"
                  :mainEditor="false"
                  @document-loaded="documentLoaded"
                  :gui-props="guiProps"
                  @pending-confirmed="pendingCloseConfirmed"
                  @new-editor="forwardEditorKey"
                />
              </q-card-section>
            </q-card>
          </template>
        </q-splitter>
      </q-card-section>
    </q-card>
    <!-- </div> -->
    <q-inner-loading
      :showing="isLoadingStructure"
      :label="$t('projectStructureDialog.loading')"
      label-class="text-teal"
      label-style="font-size: 1.1em"
    />
  </q-dialog>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons();
</script>

<script lang="ts">
import {
  EditorGUIPropsClass,
  getDocState,
  getEditorDocState,
  getEditorProject,
} from '../schema';
import {
  DocumentContext,
  EditorKeyType,
  ProjectComponent,
  CxDocument,
} from '../common';
import { QTreeNode } from 'quasar';
import { Component, defineAsyncComponent } from 'vue';
import { useBackend } from '../stores';
import { mapState } from 'pinia';
import {
  setActionOpenDocument,
  setActionCloseEditor,
  setActionShowResultMessage,
} from '../actions';
import { EditorState } from '@tiptap/pm/state';
import { Editor } from '@tiptap/vue-3';
import { isString } from 'lodash-es';
import { PendingOperation } from './helpers/pending';
import { isAbsolute, relative, resolve } from 'path-browserify';

interface LoadedDocument {
  id?: string;
  path?: string;
}

type NodeMatcher = (node: QTreeNode & LoadedDocument) => boolean;

function labelNodeMatcher(label: string): NodeMatcher {
  return (node) => node.label === label;
}

// function idNodeMatcher(id: string): NodeMatcher {
//   return (node) => node.id === id
// }

function isLoaded(node?: QTreeNode, loaded?: LoadedDocument): boolean {
  return node?.id && loaded?.id && loaded?.id === node?.id; // TODO: check also path?
}

function docToTreeNode(
  doc: ProjectComponent,
  loaded: LoadedDocument,
): QTreeNode & LoadedDocument {
  const { format, id, sha1, src } = doc;
  const id_or_src = id || src || 'unknown';
  const format_suffix = format ? ` [${format}]` : '';
  const label = `${id_or_src}${format_suffix}`;
  const is_loaded = isLoaded(doc, loaded);
  let icon;
  if (sha1) {
    icon = is_loaded ? 'document_open' : undefined;
  } else {
    icon = 'document_question';
  }
  const selectable = !!sha1;
  const treeNode: QTreeNode = { label, id, src, format, icon, selectable };
  if (doc.children)
    treeNode.children = doc.children.map((c) => docToTreeNode(c, loaded));
  return treeNode;
}

function normalizedSource(src: string): string {
  return src
    .replace(/^file:\/\//, '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '');
}

type ShowMode = 'normal' | 'maximized' | 'minimized';

const ProjectStructureDialog: Component = {
  props: ['mainEditor', 'project', 'visible'],
  emits: ['close-project-structure-dialog', 'new-editor'],
  components: {
    // see https://vuejs.org/guide/components/async.html#async-components
    PundokEditor: defineAsyncComponent(() => import('./PundokEditor.vue')),
  },
  data() {
    return {
      showMode: 'normal' as ShowMode,
      splitterModel: 25,
      isLoadingStructure: false,
      docTree: [] as QTreeNode[],
      expanded: [] as string[],
      selected: null as string | null,
      selectionTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      loaded: undefined as LoadedDocument | undefined,
      subEditor: undefined as Editor | undefined,
      dontReloadStructure: false,
      guiProps: new EditorGUIPropsClass({
        newDocument: false,
        openButton: false,
        importButton: false,
        exportButton: false,
        projectStructure: false,
        showEditorVersion: false,
        showConfiguration: false,
        swapBlocksActive: false,
      }),
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    beforeClass(): string {
      return this.maximized ? 'embedded-editor-max' : 'embedded-editor-min';
    },
    afterClass(): string {
      return this.maximized ? 'embedded-editor-max' : 'embedded-editor-min';
    },
    minimized(): boolean {
      return this.showMode === 'minimized';
    },
    normalSized(): boolean {
      return this.showMode === 'normal';
    },
    maximized(): boolean {
      return this.showMode === 'maximized';
    },
    height(): string {
      return this.maximized ? '87vh' : '50vh';
    },
    selectedColor(): string | undefined {
      const is_loaded = isLoaded(
        this.findTreeNode(labelNodeMatcher(this.selected)),
        this.loaded,
      );
      if (is_loaded)
        return getDocState(this.subEditor)?.unsavedChangesAsCopy
          ? 'negative'
          : 'primary';
    },
  },
  watch: {
    project() {
      this.reloadStructure();
    },
    visible(visible: boolean) {
      if (visible) this.$nextTick(this.syncTreeToCurrentDocument);
    },
    expanded(e) {
      console.log(e.join());
    },
  },
  beforeUnmount() {
    if (this.selectionTimer) clearTimeout(this.selectionTimer);
  },
  methods: {
    forwardEditorKey(editorKey: EditorKeyType, editor?: Editor) {
      this.subEditor = editor || this.editor;
      this.$emit('new-editor', editorKey, this.subEditor);
    },
    async reloadStructure(): Promise<void> {
      this.dontReloadStructure = false;
      this.getDocTree(true);
    },
    async getDocTree(refresh?: boolean): Promise<void> {
      let structure: ProjectComponent | undefined;
      try {
        if (refresh || !this.dontReloadStructure) {
          this.isLoadingStructure = true;
          structure =
            this.project &&
            (await this.backend?.getInclusionTree(this.project, refresh));
          this.isLoadingStructure = false;
          if (!structure) this.dontReloadStructure = true;
        }
        if (structure) {
          const root = docToTreeNode(structure, this.loaded);
          this.docTree = [root];
          this.$nextTick(this.syncTreeToCurrentDocument);
          return;
        }
      } catch (err: Error | string | unknown) {
        console.log(err);
        const message: string =
          err instanceof Error || isString(err) ? err.toString() : '';
        setActionShowResultMessage(this.mainEditor.state, {
          success: false,
          message,
          caption: 'Project structure unavailable',
          icon: 'project_structure',
        });
        this.isLoadingStructure = false;
      }
      this.docTree = [];
    },
    findTreeNode(
      matcher: NodeMatcher,
      _nodes?: QTreeNode[],
    ): QTreeNode | undefined {
      const nodes: QTreeNode[] = _nodes === undefined ? this.docTree : _nodes;
      const found: QTreeNode | undefined = nodes.find(matcher);
      if (found) return found;
      let nextNodes: (QTreeNode & LoadedDocument)[] = [];
      nodes.forEach((n) => {
        n.children?.forEach((childNode) => {
          nextNodes.push(childNode);
        });
      });
      return nextNodes.length > 0
        ? this.findTreeNode(matcher, nextNodes)
        : undefined;
    },
    findTreePath(
      matcher: NodeMatcher,
      nodes?: QTreeNode[],
      path: QTreeNode[] = [],
    ): QTreeNode[] | undefined {
      for (const node of nodes || this.docTree) {
        const currentPath = [...path, node];
        if (matcher(node)) return currentPath;
        const result = node.children
          ? this.findTreePath(matcher, node.children, currentPath)
          : undefined;
        if (result) return result;
      }
      return undefined;
    },
    syncTreeToCurrentDocument() {
      const docState = getDocState(this.mainEditor?.state);
      const project = docState?.project;
      if (!docState?.workingFolder || !docState.documentName || !project?.path)
        return;

      const absoluteSource = resolve(
        docState.workingFolder,
        docState.documentName,
      );
      const candidates = [
        absoluteSource,
        relative(project.path, absoluteSource),
        docState.documentName,
        resolve(project.path, docState.documentName),
      ].map(normalizedSource);
      const path = this.findTreePath((node: QTreeNode) => {
        if (!node.src) return false;
        const source = normalizedSource(node.src);
        return (
          candidates.includes(source) ||
          (!isAbsolute(node.src) &&
            candidates.includes(
              normalizedSource(resolve(project.path, node.src)),
            ))
        );
      });
      if (!path) return;

      this.selected = path[path.length - 1].label;
      this.expanded = path.slice(0, -1).map((node: QTreeNode) => node.label);
      this.$nextTick(this.scrollSelectedTreeNode);
    },
    scrollSelectedTreeNode() {
      const tree = this.$refs.tree as { $el?: HTMLElement } | undefined;
      const selectedNode = tree?.$el?.querySelector(
        '[aria-selected="true"]',
      ) as HTMLElement | null;
      selectedNode?.scrollIntoView({ block: 'nearest' });
    },
    // getInclusionLine(matcher: NodeMatcher, _nodes?: QTreeNode[], acc: string[] = []): string[] {
    //   const nodes: QTreeNode[] = _nodes === undefined ? this.docTree : _nodes
    //   const found: QTreeNode | undefined = nodes.find(matcher)
    //   if (found) return acc
    // },
    getOpenDocContextFromSelected(): DocumentContext | undefined {
      if (this.selected) {
        const found = this.findTreeNode(labelNodeMatcher(this.selected));
        if (found) {
          const project = getEditorProject(this.mainEditor);
          return {
            id: found.id,
            path: found.src,
            project,
          };
        }
      }
    },
    updateSelected(selected?: string) {
      if (!selected || selected === this.selected) return;
      this.selected = selected;
      if (this.selectionTimer) clearTimeout(this.selectionTimer);
      this.selectionTimer = setTimeout(() => {
        this.selectionTimer = undefined;
        const context = this.getOpenDocContextFromSelected();
        const state = this.subEditor?.state;
        if (state && context) setActionOpenDocument(state, context);
      }, 250);
    },
    documentLoaded(doc: CxDocument, editor: Editor) {
      this.loaded = {
        id: doc.id,
        path: doc.path,
      };
      this.subEditor = editor;
    },
    setShowMode(showMode: ShowMode) {
      this.showMode = showMode;
    },
    closeDialog(force?: boolean) {
      const subEditor = this.subEditor;
      const { unsavedChanges, unsavedChangesAsCopy } =
        getDocState(subEditor.state) || {};
      const unsaved = subEditor && unsavedChanges;
      if (!force && unsaved) {
        console.log(getEditorDocState(this.subEditor.state));
        setActionCloseEditor(this.subEditor.state);
      } else {
        this.selected = null;
        this.loaded = undefined;
        this.$emit('close-project-structure-dialog');
      }
    },
    openInMainEditor() {
      if (this.selectionTimer) {
        clearTimeout(this.selectionTimer);
        this.selectionTimer = undefined;
      }
      const context = this.getOpenDocContextFromSelected();
      const state: EditorState = this.mainEditor.state;
      if (context && state) {
        setActionOpenDocument(state, context);
        this.closeDialog();
      }
    },
    pendingCloseConfirmed(pending: PendingOperation) {
      if (pending.type === 'closing') this.closeDialog(true);
    },
  },
} as Component;

export default ProjectStructureDialog;
</script>

<style>
.structure-dialog {
  border-radius: 10px;
  border: 3px solid white;
}

.embedded-editor-max {
  max-height: 87vh;
  background-color: white;
  margin: 0px;
}

.embedded-editor-min {
  max-height: 50vh;
  background-color: white;
  margin: 0px;
}
</style>
