<template>
  <q-dialog :model-value="visible" full-width :full-height="maximized" seamless>
    <!-- <div class="shadow shadow-24 structure-dialog"> -->
    <q-card class="shadow shadow-24">
      <q-card-actions horizontal align="stretch" class="bg-primary">
        <q-btn title="reload/refresh project structure" size="sm" icon="mdi-refresh" @click="reloadStructure()" />
        <q-space />
        <q-btn title="open in main editor" size="sm" icon="mdi-open-in-app" :disabled="!selected"
          @click="openInMainEditor" />
        <q-space />
        <q-btn :title="maximized ? 'minimize' : 'maximize'" size="sm"
          :icon="maximized ? 'mdi-window-minimize' : 'mdi-window-maximize'" @click="maximizeMinimize()" />
        <q-btn title="close" size="sm" icon="mdi-window-close" @click="closeDialog()" />
      </q-card-actions>
      <q-card-section>
        <q-splitter v-model="splitterModel" :after-class="afterClass" :before-class="beforeClass"
          separator-style="background-color: black">
          <template v-slot:before>
            <q-card>
              <!-- <q-card-actions> </q-card-actions> -->
              <q-card-section>
                <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
                  <q-tree v-show="!loadingStructure" :nodes="docTree" node-key="label" dense v-model:expanded="expanded"
                    v-model:selected="selected" :selected-color="selectedColor" default-expand-all
                    @update:selected="updateSelected" />
                </transition>
              </q-card-section>
            </q-card>
          </template>
          <template v-slot:after>
            <q-card class="q-pa-none">
              <q-card-section class="scroll q-pa-none">
                <PundokEditor :height="height" :mainEditor="false" :gui-props="guiProps"
                  @document-loaded="documentLoaded" @pending-confirmed="pendingCloseConfirmed" />
              </q-card-section>
            </q-card>
          </template>
        </q-splitter>
      </q-card-section>
    </q-card>
    <!-- </div> -->
    <q-inner-loading :showing="isLoadingStructure" label="Loading project structure..." label-class="text-teal"
      label-style="font-size: 1.1em" />
  </q-dialog>
</template>

<script lang="ts">
import { setupQuasarIcons } from './helpers/quasarIcons';
import { getDocState, getEditorProject } from '../schema';
import { DocumentContext, ProjectComponent, ReadDoc } from '../common';
import { QTreeNode } from 'quasar';
import { Component, defineAsyncComponent } from 'vue';
import { useBackend, useProjectCache } from '../stores';
import { mapState } from 'pinia';
import { EditorGUIPropsClass } from './EditorGUIProps';
import { setActionOpenDocument, setActionCloseEditor } from '../actions';
import { EditorState } from '@tiptap/pm/state';
import { Editor } from '@tiptap/vue-3';
import { PendingOperation } from '.';

interface LoadedDocument {
  id?: string,
  path?: string,
}

type NodeMatcher = (node: QTreeNode & LoadedDocument) => boolean

function labelNodeMatcher(label: string): NodeMatcher {
  return (node) => node.label === label
}

// function idNodeMatcher(id: string): NodeMatcher {
//   return (node) => node.id === id
// }

function isLoaded(node?: QTreeNode, loaded?: LoadedDocument): boolean {
  return node?.id && loaded?.id && loaded?.id === node?.id // TODO: check also path?
}

function docToTreeNode(doc: ProjectComponent, loaded: LoadedDocument): QTreeNode & LoadedDocument {
  const { format, id, sha1, src } = doc
  const id_or_src = id || src || 'unknown'
  const format_suffix = format ? ` [${format}]` : ''
  const label = `${id_or_src}${format_suffix}`
  const is_loaded = isLoaded(doc, loaded)
  let icon
  if (sha1) {
    icon = is_loaded ? 'mdi-folder-open' : undefined
  } else {
    icon = 'mdi-file-question'
  }
  const selectable = !!sha1
  const treeNode: QTreeNode = { label, id, src, format, icon, selectable }
  if (doc.children) treeNode.children = doc.children.map(c => docToTreeNode(c, loaded))
  return treeNode
}

const ProjectStructureDialog: Component = {
  props: ['mainEditor', 'project', 'visible'],
  emits: ['close-project-structure-dialog'],
  components: {
    // see https://vuejs.org/guide/components/async.html#async-components
    "PundokEditor": defineAsyncComponent(() => import('./PundokEditor.vue'))
  },
  setup() {
    setupQuasarIcons()
  },
  data() {
    return {
      maximized: false,
      splitterModel: 25,
      isLoadingStructure: false,
      docTree: [] as QTreeNode[],
      expanded: [] as boolean[],
      selected: null as string | null,
      loaded: undefined as LoadedDocument | undefined,
      subEditor: Editor,
      structure: undefined as ProjectComponent | undefined,
      dontReloadStructure: false,
      guiProps: new EditorGUIPropsClass({
        newDocument: false,
        importButton: false,
        exportButton: false,
        projectStructure: false,
        showEditorVersion: false,
        showConfiguration: false,
      }),
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    ...mapState(useProjectCache, ['structureCache']),
    beforeClass(): string {
      return this.maximized ? 'embedded-editor-max' : 'embedded-editor-min'
    },
    afterClass(): string {
      return this.maximized ? 'embedded-editor-max' : 'embedded-editor-min'
    },
    height(): string {
      return this.maximized ? '87vh' : '50vh'
    },
    selectedColor(): string | undefined {
      const is_loaded = isLoaded(this.findTreeNode(labelNodeMatcher(this.selected)), this.loaded)
      if (is_loaded)
        return getDocState(this.subEditor)?.unsavedChanges ? 'negative' : 'primary'
    }
  },
  watch: {
    project() {
      this.reloadStructure()
    },
    expanded(e) {
      console.log(e.join())
    }
  },
  methods: {
    async reloadStructure(): Promise<void> {
      this.dontReloadStructure = false
      this.getDocTree(true)
    },
    async getDocTree(refresh?: boolean): Promise<void> {
      let structure: ProjectComponent = this.structureCache
      try {
        if (refresh || (!structure && !this.dontReloadStructure)) {
          this.isLoadingStructure = true
          structure = await (this.backend?.getInclusionTree(this.project))
          this.isLoadingStructure = false
          if (structure)
            useProjectCache().setStructure(structure)
          else
            this.dontReloadStructure = true
        }
        if (structure) {
          const root = docToTreeNode(structure, this.loaded)
          this.docTree = [root]
          return
        }
      } catch (err) {
        console.log(err)
      }
      this.docTree = []
    },
    findTreeNode(matcher: NodeMatcher, _nodes?: QTreeNode[]): QTreeNode | undefined {
      const nodes: QTreeNode[] = _nodes === undefined ? this.docTree : _nodes
      const found: QTreeNode | undefined = nodes.find(matcher)
      if (found) return found
      let nextNodes: (QTreeNode & LoadedDocument)[] = []
      nodes.forEach(n => {
        n.children?.forEach(childNode => {
          nextNodes.push(childNode)
        })
      })
      return nextNodes.length > 0
        ? this.findTreeNode(matcher, nextNodes)
        : undefined
    },
    // getInclusionLine(matcher: NodeMatcher, _nodes?: QTreeNode[], acc: string[] = []): string[] {
    //   const nodes: QTreeNode[] = _nodes === undefined ? this.docTree : _nodes
    //   const found: QTreeNode | undefined = nodes.find(matcher)
    //   if (found) return acc
    // },
    getOpenDocContextFromSelected(): DocumentContext | undefined {
      if (this.selected) {
        const found = this.findTreeNode(labelNodeMatcher(this.selected))
        if (found) {
          const project = getEditorProject(this.mainEditor)
          return {
            id: found.id,
            path: found.src,
            project,
          }
        }
      }
    },
    updateSelected(selected?: string) {
      this.selected = selected
      const context = this.getOpenDocContextFromSelected()
      // console.log(this.getInclusionLine(context))
      const state = this.subEditor?.state
      console.log(state)
      if (state && context)
        setActionOpenDocument(state, context)
    },
    documentLoaded(doc: ReadDoc, editor: Editor) {
      this.loaded = {
        id: doc.id,
        path: doc.path
      }
      this.subEditor = editor
    },
    maximizeMinimize() {
      this.maximized = !this.maximized
    },
    closeDialog(force?: boolean) {
      const subEditor = this.subEditor
      const unsavedChanges = subEditor && getDocState(subEditor.state)?.unsavedChanges
      if (!force && unsavedChanges) {
        setActionCloseEditor(this.subEditor.state)
      } else {
        this.selected = null
        this.loaded = undefined
        this.$emit('close-project-structure-dialog')
      }
    },
    openInMainEditor() {
      const context = this.getOpenDocContextFromSelected()
      const state: EditorState = this.mainEditor.state
      if (context && state) {
        setActionOpenDocument(state, context)
        this.closeDialog()
      }
    },
    pendingCloseConfirmed(pending: PendingOperation) {
      if (pending.type === 'closing')
        this.closeDialog(true)
    }
  }
} as Component

export default ProjectStructureDialog
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