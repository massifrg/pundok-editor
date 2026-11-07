<template>
  <q-layout view="LHH LpR LFf" :container="!mainEditor" :style="`height: ${height}`" class="shadow-2 rounded-borders">
    <q-header>
      <q-toolbar class="text-white q-pa-none">
        <q-toolbar-title>
          <Menubar :editor="editor" :current-nodes-with-pos="currentNodesWithPos" :gui-props="guiProps"
            :saved-changes="savedChanges" :saved-changes-as-copy="savedChangesAsCopy"
            :document-loading="documentLoading" :document-menu-refresh-key="documentMenuRefreshKey"
            @new-document="newDocument" @open-document="openDocument()"
            @toggle-search-and-replace-dialog="toggleSearchAndReplaceDialog()"
            @edit-node-or-mark-attributes="editNodeOrMarkAttributes"
            @show-configurations-dialog="visibleConfigurationDialog = true"
            @show-configuration-editor="visibleConfigurationEditor = true"
            @manage-git-project="visibleGitChanges = true" @check-git-updates="visibleGitUpdates = true"
            @share-git-project="showGitRepository('publish')" @connect-git-project="showGitRepository('connect')"
            @clone-git-project="showGitRepository('clone')" @reload-with-configuration="reloadWithConfiguration"
            @render-output="renderOutput" @stop-rendering="stopRendering" :rendering-targets="renderingTargets"
            :transformation-log="transformationLog" :transformation-failed="transformationFailed" />
        </q-toolbar-title>
      </q-toolbar>
    </q-header>
    <q-drawer v-if="isMainEditor" show-if-above behavior="desktop" bordered :v-model="leftDrawerState === 'normal'"
      side="left" :mini="leftDrawerState === 'mini'" @click.capture="maximizePdfViewer" :mini-width="24"
      :width="leftDrawerWidth" :breakpoint="500">
      <PdfViewer :backend="backend" :saved-document-path="lastSavedDocumentPath"
        :saved-document-project-path="lastSavedDocumentProjectPath" :saved-document-version="lastSavedDocumentVersion"
        class="pdf-viewer" @rendering-started="renderingStarted" @rendering-finished="renderingFinished" />
      <div class="q-mini-drawer-only absolute" style="top: 150px; right: 3px">
        <q-btn dense round unelevated color="secondary" icon="chevron_right" @click="maximizePdfViewer" />
      </div>
      <div class="q-mini-drawer-hide absolute" style="top: 150px; right: -17px">
        <q-btn dense round unelevated color="secondary" icon="chevron_left" @click="minimizePdfViewer" />
      </div>
      <div class="q-mini-drawer-hide absolute" style="top: 210px; right: -17px">
        <q-btn dense round unelevated color="secondary" icon="arrow_left_right"
          @mousedown="startSettingLeftDrawerWidth" />
      </div>
    </q-drawer>
    <div v-if="leftDrawerPreviewWidth !== undefined" class="drawer-width-preview"
      :style="{ left: `${leftDrawerPreviewWidth}px` }" />
    <q-drawer show-if-above behavior="desktop" bordered :v-model="rightDrawerState === 'normal'" side="right"
      :mini="rightDrawerState === 'mini'" @mouseenter="rightDrawerState = 'normal'"
      @mouseleave="rightDrawerState = 'mini'" mini-to-overlay :mini-width="60" :width="240" :breakpoint="500"
      :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'">
      <CustomStylesPanel :editor="editor" :panel-state="rightDrawerState" :current-blocks="currentNodesWithPos" />
    </q-drawer>
    <q-page-container>
      <q-page>
        <!-- style="padding-top: 112px" -->
        <PendingOperationDialog :model-value="pending && !savedChanges" :pending-operation="pending"
          @pending-canceled="cancelPending" @pending-confirmed="confirmPending" @update-value="pendingValueUpdate" />
        <SearchAndReplace :editor="editor" :visible="visibleSearchAndReplaceDialog"
          @hideSearchAndReplaceDialog="hideSearchAndReplaceDialog()" />
        <AttributesEditor :editor="editor" :selected-node-or-mark="nodeOrMarkToEdit" :start-tab="startAttributesTab"
          :on-attributes-editor-show="onAttributesEditorShow" @closeAttributesEditor="closeAttributesEditor()">
        </AttributesEditor>
        <ConfigurationsDialog :editor="editor" :visible="visibleConfigurationDialog"
          @set-configuration="setConfiguration" @close-configurations-dialog="visibleConfigurationDialog = false">
        </ConfigurationsDialog>
        <ShowMessageDialog :editor="editor" :visible="!!message" :message="message"
          @close-show-message-dialog="message = null" :show-check-updates="message?.source === 'git-no-updates'" :icon="message?.source === 'git-no-updates' ? 'message_info' : undefined
            " :color="message?.source === 'git-no-updates' ? 'secondary' : undefined
              " @check-updates="openGitUpdates" />
        <InputTextDialog :editor="editor" :visible="visibleInputTextDialog" :label="inputTextDialogLabel"
          :start-value="inputTextDialogStartValue" @close-dialog="closeInputTextDialog" />
        <ProjectStructureDialog :main-editor="editor" :visible="visibleProjectStructureDialog"
          :project="docState()?.project" @close-project-structure-dialog="closeProjectStructureDialog"
          @new-editor="newSubEditor" />
        <ProjectConfigEditorDialog :visible="visibleConfigurationEditor" :editor="editor"
          :configuration="docState()?.project?.editorConfig || {}" :project="docState()?.project"
          :project-configurations="docState()?.project?.configurations || []" @save="saveProject"
          @close="visibleConfigurationEditor = false" />
        <NewProjectDialog :editor="editor" :visible="visibleNewProjectDialog"
          @close="visibleNewProjectDialog = false" />
        <GitChangesDialog :visible="visibleGitChanges" :project-path="docState()?.project?.path || ''"
          @close="visibleGitChanges = false" @open-updates="
            visibleGitChanges = false;
          visibleGitUpdates = true;
          " />
        <GitUpdatesDialog :visible="visibleGitUpdates" :project-path="docState()?.project?.path || ''"
          @close="visibleGitUpdates = false" @open-changes="
            visibleGitUpdates = false;
          visibleGitChanges = true;
          " @reload-project="reloadProjectAfterGitMerge" />
        <GitRepositoryDialog :visible="!!gitRepositoryMode" :mode="gitRepositoryMode || 'clone'"
          :editor="editor as Editor" :project-path="docState()?.project?.path || ''" :project="docState()?.project"
          @close="gitRepositoryMode = undefined" @done="gitRepositoryDone" />
        <ContextMenu :editor="editor" />
        <div class="editor-loading-container">
          <editor-content class="pundok-editor" :editor="editor as Editor" />
          <q-inner-loading :showing="documentLoading">
            <q-circular-progress indeterminate rounded size="3rem" color="primary" />
          </q-inner-loading>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons();
</script>

<script lang="ts">
import { Component, defineAsyncComponent, toRaw } from 'vue';
import { Editor, EditorContent, NodeWithPos } from '@tiptap/vue-3';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { isString } from 'lodash-es';
import { mapState } from 'pinia';
import {
  type DocState,
  type DocStateUpdate,
  getDocState,
  type SelectedNodeOrMark,
  getEditorGuiProps,
  EditorGUIPropsClass,
  getDocAsJsonString,
} from '../schema';

const gitUpdateSnapshots = new Map<string, Map<string, number>>();
// the next one is not imported from '../schema' to avoid a circular ref
import { Pandoc } from '../schema/nodes/Pandoc';
import {
  type FeedbackMessage,
  type InputConverter,
  type OutputConverter,
  type PundokEditorConfig,
  type PundokEditorProject,
  type SaveResponse,
  EditorKeyType,
  ProjectComponent,
  DocumentContext,
  IPC_MAIN_EDITOR_KEY,
  COLOR_SAVED_ONLY_AS_COPY,
  PandocFilterTransform,
  WhatToDoWithResult,
  NODE_NAME_INDEX_TERM,
  ResultMessageActionProps,
  EditAttributesActionProps,
  ActionNameWithProps,
  GetProjectOptions,
  DocumentSaveActionProps,
  CxDocument,
  DocumentFormat,
  DEFAULT_DOCUMENT_FORMAT,
  DEFAULT_COPY_DOCUMENT_FORMAT,
  splitFolderAndDoc,
  documentNameToId,
  outputConverterToDocumentFormat,
  changeFileExtensionToFormat,
  asInputFormat,
  asOutputFormat,
  getDefaultWorkingFormat,
  getDefaultCopyFormat,
} from '../common';

import { setWindowTitle as setRendererWindowTitle } from '../backend/windowTitle';
import { useActions, useBackend, useProjectCache } from '../stores';
import ContextMenu from './ContextMenu.vue';
import InputTextDialog from './InputTextDialog.vue';
import Menubar from './Menubar.vue';
import NewProjectDialog from './NewProjectDialog.vue';
import NodeOrMarkContextMenu from './NodeOrMarkContextMenu.vue';
import PendingOperationDialog from './PendingOperationDialog.vue';
import ShowMessageDialog from './ShowMessageDialog.vue';
import {
  EditorAction,
  ACTION_DOCUMENT_SAVE,
  setActionCommand,
  ACTION_DOCUMENT_SAVE_COPY,
} from '../actions';
import { useQuasar } from 'quasar';
import { routeLastAction } from './actionRouter';
import { newEditor, setContent, setPendingBeforeNewDoc, setPendingBeforeLoadDoc, newDocument, reloadDocumentWithConfiguration, openDocument, setDocumentAsNativelySaved, loadDocument } from './documentLifecycle';
import { t } from '../i18n';
import {
  PendingOperation,
  PendingOperationExtraValue,
  DocumentDialogProps,
  showSaveCopyDialog,
  showSaveDocumentDialog,
} from './helpers';

const DEFAULT_INPUT_TEXT_DIALOG_LABEL = 'text';
const DEFAULT_INPUT_TEXT_DIALOG_START_VALUE = '';
const DEFAULT_JSON_SPACE = 2; // third argument of JSON.stringify for saved documents.

const COMPLAIN_IF_SAVED_ONLY_AS_COPY_TOGGLE: PendingOperationExtraValue = {
  name: 'complainIfJustExported',
  label:
    'ask when a document has been saved/exported in format different from JSON',
  color: COLOR_SAVED_ONLY_AS_COPY,
  values: [false, true],
  default: true,
};

function cssfilename2id(cssfilename: string) {
  return cssfilename ? cssfilename.replace(/[^_0-9A-Za-z]+/g, '-') : '';
}

const AttributesEditor = defineAsyncComponent(
  () => import('./AttributesEditor.vue'),
);
const ConfigurationsDialog = defineAsyncComponent(
  () => import('./ConfigurationsDialog.vue'),
);
const CustomStylesPanel = defineAsyncComponent(
  () => import('./CustomStylesPanel.vue'),
);
const SearchAndReplace = defineAsyncComponent(
  () => import('./SearchAndReplace.vue'),
);

export default {
  components: {
    EditorContent,
    Menubar,
    ContextMenu,
    ShowMessageDialog,
    ConfigurationsDialog,
    InputTextDialog,
    SearchAndReplace,
    AttributesEditor,
    CustomStylesPanel,
    NodeOrMarkContextMenu,
    PendingOperationDialog,
    NewProjectDialog,
    ProjectStructureDialog: defineAsyncComponent(
      () => import('./ProjectStructureDialog.vue'),
    ),
    ProjectConfigEditorDialog: defineAsyncComponent(
      () => import('./ProjectConfigEditorDialog.vue'),
    ),
    GitChangesDialog: defineAsyncComponent(
      () => import('./GitChangesDialog.vue'),
    ),
    GitUpdatesDialog: defineAsyncComponent(
      () => import('./GitUpdatesDialog.vue'),
    ),
    GitRepositoryDialog: defineAsyncComponent(
      () => import('./GitRepositoryDialog.vue'),
    ),
    PdfViewer: defineAsyncComponent(() => import('./PdfViewer.vue')),
  },

  props: {
    modelValue: {
      type: String,
      default: '{}',
    },
    mainEditor: {
      type: Boolean,
      default: false,
    },
    height: {
      type: String,
      default: '100%',
    },
    guiProps: {
      type: EditorGUIPropsClass,
      default: {},
    },
  },

  emits: [
    'update:modelValue',
    'new-editor',
    'document-loaded',
    'pending-canceled',
    'pending-confirmed',
  ],

  data() {
    return {
      editor: undefined as Editor | undefined,
      // the document in the editor, in its current state, has been saved
      savedChanges: true,
      // the document in the editor, in its current state, has been exported
      savedChangesAsCopy: true,
      // complain if the document, in its current state, has just been exported but not saved in JSON
      complainIfJustExported: true,
      pending: undefined as PendingOperation | undefined,
      configuration: undefined as PundokEditorConfig | undefined,
      message: null as FeedbackMessage | null,
      leftDrawerState: 'mini' as 'normal' | 'mini',
      leftDrawerWidth: 640,
      leftDrawerHandleStart: undefined as number | undefined,
      prevLeftDrawerWidth: 640,
      leftDrawerPreviewWidth: undefined as number | undefined,
      rightDrawerState: 'mini' as 'normal' | 'mini',
      visibleConfigurationDialog: false,
      visibleSearchAndReplaceDialog: false,
      visibleInputTextDialog: false,
      visibleProjectStructureDialog: false,
      visibleConfigurationEditor: false,
      projectStructureEditorKey: undefined as EditorKeyType | undefined,
      visibleNewProjectDialog: false,
      visibleGitChanges: false,
      visibleGitUpdates: false,
      gitRepositoryMode: undefined as
        'clone' | 'publish' | 'connect' | undefined,
      swapBlocksWasActive: this.guiProps.swapBlocksActive,
      inputTextDialogLabel: DEFAULT_INPUT_TEXT_DIALOG_LABEL,
      inputTextDialogStartValue: DEFAULT_INPUT_TEXT_DIALOG_START_VALUE,
      inputTextDialogCallback: undefined as
        ((text: string, oldText?: string) => void) | undefined,
      nodeOrMarkToEdit: undefined as SelectedNodeOrMark | undefined,
      startAttributesTab: undefined as string | undefined,
      onAttributesEditorShow: undefined as ActionNameWithProps | undefined,
      // clickedNodeOrMark: undefined as SelectedNodeOrMark | undefined,
      debugDocTree: undefined as ProjectComponent | undefined,
      $q: useQuasar(),
      jsonSpace: DEFAULT_JSON_SPACE as string | number | undefined,
      splitterModel: 1,
      renderingTargets: [] as {
        converterName: string;
        path?: string;
        feedback: string[];
      }[],
      transformationLog: [] as string[],
      transformationFailed: false,
      transformationEditorKey: undefined as EditorKeyType | undefined,
      lastSavedDocumentPath: undefined as string | undefined,
      lastSavedDocumentProjectPath: undefined as string | undefined,
      lastSavedDocumentVersion: 0,
      documentLoading: false,
      documentMenuRefreshKey: 0,
    };
  },

  computed: {
    ...mapState(useActions, ['lastAction', 'remoteWorkInProgress']),
    ...mapState(useBackend, ['backend']),
    isMainEditor() {
      return !!this.mainEditor;
    },
    askToSaveChanges() {
      if (this.savedChanges) return false;
      if (this.savedChangesAsCopy && !this.complainIfJustExported) return false;
      return true;
    },
    currentNodesWithPos(): NodeWithPos[] {
      const nodes: NodeWithPos[] = [];
      const state = this.editor && this.editor.state;
      if (state) {
        const { from, to } = state.selection;
        (state.doc as ProsemirrorNode).nodesBetween(from, to, (node, pos) => {
          nodes.push({ node, pos });
        });
      }
      return nodes;
    },
  },

  watch: {
    visibleSearchAndReplaceDialog(visible: boolean) {
      const editor = this.editor as Editor;
      if (visible) {
        this.swapBlocksWasActive =
          getEditorGuiProps(editor)?.swapBlocksActive || false;
        editor?.commands.toggleSwapBlocks(false);
      } else {
        editor?.commands.toggleSwapBlocks(this.swapBlocksWasActive);
      }
    },
    lastAction(action: EditorAction) {
      routeLastAction(this, action);
    },
  },

  async mounted() {
    const backend = useBackend().backend;
    if (backend) {
      const configuration = await backend.configuration();
      await this.newDocument(configuration.name);
      if (this.editor) {
        const docState = getDocState((this.editor as Editor).state);
        backend.editorReady(docState?.editorKey);
      }
      const documentToOpen = new URLSearchParams(window.location.search).get('document');
      if (documentToOpen) {
        try {
          await this.openDocument(JSON.parse(documentToOpen) as DocumentContext);
        } catch (error) {
          console.error('Failed to open document from URL:', error);
        }
      }
    }
    window.addEventListener('beforeunload', this.onClose);
  },

  beforeUnmount() {
    if (this.askToSaveChanges) this.setClosePending();
    if (this.editor) this.editor.destroy();
    document.removeEventListener('mousemove', this.changeLeftDrawerWidth);
    document.removeEventListener('mouseup', this.stopSettingLeftDrawerWidth);
  },

  methods: {
    showGitRepository(mode: 'clone' | 'publish' | 'connect') {
      this.gitRepositoryMode = mode;
    },
    gitRepositoryDone(result: { path?: string }) {
      if (result.path)
        this.$q.notify({
          message: `Project ready at ${result.path}`,
          color: 'positive',
        });
    },
    editorState(): EditorState | undefined {
      if (this.editor) return this.editor.view.state as EditorState;
    },
    /**
     * The current document state.
     */
    docState(): DocState | undefined {
      return getDocState(this.editorState());
    },
    /**
     * Update the current document state.
     * @param update
     */
    updateEditorDocState(update: Partial<DocStateUpdate>) {
      this.editor?.commands.updateDocState(update);
    },
    /**
     * The current editor key.
     */
    editorKey(): EditorKeyType | undefined {
      return this.docState()?.editorKey;
    },
    /**
     * Sets the main editor key in the backend.
     */
    setMainEditorKey() {
      console.log(this.mainEditor);
      console.log(this.isMainEditor);
      if (this.isMainEditor) {
        console.log(`set ${this.editorKey()} as main editor key`);
        this.backend?.setValue(IPC_MAIN_EDITOR_KEY, this.editorKey());
      }
    },
    /**
     * Set the editor key of the sub editor (project structure).
     * @param editorKey
     */
    newSubEditor(editorKey: EditorKeyType, editor?: Editor) {
      this.projectStructureEditorKey = editorKey;
    },
    /**
     * Create a new editor component.
     */
    async newEditor() {
      return newEditor(this);
    },
    /**
     * Set the content of the editor.
     * @param content The pandoc JSON representing the document.
     * @param isNew `true` when the content is not coming from a saved document.
     */
    setContent(content: string, isNew?: boolean, addToHistory?: boolean) {
      return setContent(this, content, isNew, addToHistory);
    },
    /**
     * Set and show a dialog to save the current unsaved contents before creating a new document.
     * @param options
     */
    setPendingBeforeNewDoc(options: { configurationName?: string; content?: string }) {
      return setPendingBeforeNewDoc(this, options);
    },
    /**
     * Set and show a dialog to save the current unsaved contents before loading a document.
     * @param options
     */
    setPendingBeforeLoadDoc(options: { doc: CxDocument }) {
      return setPendingBeforeLoadDoc(this, options);
    },
    /**
     * Create a new document.
     * @param configurationName The name of the document's configuration.
     * @param content The document's contents.
     * @param ignoreUnsaved If `true` discard the eventual current unsaved contents.
     */
    async newDocument(configurationName?: string, content?: string, ignoreUnsaved?: boolean) {
      return newDocument(this, configurationName, content, ignoreUnsaved);
    },
    /**
     * Reload the current document with a different configuration.
     * @param config
     */
    async reloadDocumentWithConfiguration(config: string | PundokEditorConfig) {
      return reloadDocumentWithConfiguration(this, config);
    },
    /**
     * Open a document (optionally at a certain line).
     * @param context The context of the document to be opened.
     * @param atLine The line (usually the Para or Plain) where the cursor is moved after loading.
     */
    async openDocument(context?: DocumentContext, atLine?: number) {
      return openDocument(this, context, atLine);
    },
    setDocumentAsNativelySaved() {
      return setDocumentAsNativelySaved(this);
    },
    async loadDocument(doc: CxDocument, ignoreUnsaved?: boolean, atLine?: number) {
      return loadDocument(this, doc, ignoreUnsaved, atLine);
    },
    beforeSaving() {
      this.editor?.commands.fixPandocTables();
    },
    async save(props?: DocumentSaveActionProps) {
      if (this.documentLoading) return;
      const { dontAskCopyPath, isCopy, isSaveAs } = props || {};
      this.beforeSaving();
      const jsonDoc = this.getDocAsJsonString();
      const docState = this.docState();
      const {
        documentName,
        copyFolder,
        workingFolder,
        configuration,
        workingFormat,
      } = docState || {};
      let path = props?.path;
      if (!path) {
        const folder = isCopy ? copyFolder : workingFolder;
        path =
          (folder && documentName && `${folder}/${documentName}`) || undefined;
      }
      const isSave = !isSaveAs && !isCopy;
      let documentFormat = asOutputFormat(
        props?.documentFormat || workingFormat,
        configuration,
      );
      if (
        !path ||
        isSaveAs ||
        (isCopy && !dontAskCopyPath) ||
        (isSave && !documentFormat)
      ) {
        if (isCopy) {
          const { documentName, copyFolder, copyFormat, workingFolder } =
            docState || {};
          const startFilename =
            documentName && copyFormat
              ? changeFileExtensionToFormat(documentName, copyFormat)
              : undefined;
          const defaultCopyFormat = getDefaultCopyFormat(configuration);
          showSaveCopyDialog({
            editor: this.editor,
            options: {
              prompt: t('fileDialog.prompt.saveCopyTo'),
              startFolder: copyFolder || workingFolder,
              startFormat:
                copyFormat ||
                defaultCopyFormat ||
                asOutputFormat(workingFormat, configuration) ||
                DEFAULT_COPY_DOCUMENT_FORMAT,
              startFilename,
              warnIfExists: true,
            },
            callback: (context) => {
              const { editorKey, documentFormat, path } = context;
              if (path) {
                setActionCommand(editorKey!, ACTION_DOCUMENT_SAVE_COPY, {
                  path,
                  documentFormat,
                  isCopy: true,
                  dontAskCopyPath: true,
                } as DocumentSaveActionProps);
              } else {
                // TODO: signal missing path!
              }
            },
          } as DocumentDialogProps);
        } else {
          const { configuration, documentName, workingFolder, workingFormat } =
            docState || {};
          const defaultWorkingFormat = getDefaultWorkingFormat(configuration);
          const format = isSaveAs
            ? workingFormat || defaultWorkingFormat
            : documentFormat || defaultWorkingFormat || DEFAULT_DOCUMENT_FORMAT;
          const startFormat = asOutputFormat(format, configuration);
          const startFilename =
            documentName && startFormat
              ? changeFileExtensionToFormat(documentName, startFormat)
              : undefined;
          showSaveDocumentDialog({
            editor: this.editor,
            options: {
              prompt: t(
                isSaveAs
                  ? 'fileDialog.prompt.save'
                  : 'fileDialog.prompt.saveCurrent',
              ),
              startFolder: isSaveAs ? workingFolder : workingFolder,
              startFormat,
              startFilename,
              warnIfExists: !!isSaveAs,
            },
            callback: (context) => {
              const { editorKey, documentFormat, path } = context;
              if (path) {
                setActionCommand(editorKey!, ACTION_DOCUMENT_SAVE, {
                  path,
                  documentFormat,
                } as DocumentSaveActionProps);
              } else {
                // TODO: signal missing path!
              }
            },
          } as DocumentDialogProps);
        }
        return;
      }
      try {
        const docState = this.docState();
        console.log(toRaw(props));
        documentFormat = toRaw(
          documentFormat ||
          (isCopy
            ? docState?.copyFormat || DEFAULT_COPY_DOCUMENT_FORMAT
            : docState?.workingFormat || DEFAULT_DOCUMENT_FORMAT),
        );
        if (this.backend) {
          const { configuration, documentName, project, resourcePath } =
            docState || {};
          const response = await this.backend.save({
            editorKey: this.editorKey(),
            id: documentNameToId(documentName),
            path,
            content: jsonDoc,
            documentFormat,
            project,
            configurationName: project ? undefined : configuration?.name,
            resourcePath,
          }, { isCopy });
          if (response.error) {
            const errmsg = this.showResultMessage({
              success: false,
              caption: 'SAVE ERROR',
              message: JSON.stringify(response.error),
              icon: 'content_save_alert',
            }, 'bottom');
            return Promise.reject(errmsg);
          } else {
            const path = response.doc.path;
            if (path) {
              const { folder, document } = splitFolderAndDoc(path);
              const update: Partial<DocStateUpdate> = {};
              if (isCopy) {
                update.copyFolder = folder;
                update.copyFormat = documentFormat;
                update.unsavedChangesAsCopy = false;
              } else if (isSaveAs) {
                update.documentName = document;
                update.workingFolder = folder;
                update.workingFormat = documentFormat;
                update.unsavedChanges = false;
              } else {
                update.documentName = document;
                update.workingFolder = folder;
                update.workingFormat = documentFormat;
                update.unsavedChanges = false;
              }
              this.editor?.commands.updateDocState(update);
            }
            if (!isCopy) this.setDocumentAsNativelySaved();
            if (!isCopy && response.doc.path) {
              await this.setWindowTitleFromDoc(response.doc);
            }
            let differentProject: PundokEditorProject | undefined = undefined
            if (
              !isCopy &&
              response.doc.path &&
              ((!isSaveAs && !project) ||
                (isSaveAs &&
                  splitFolderAndDoc(response.doc.path).folder !==
                  workingFolder))
            ) {
              differentProject = await this.backend.getProject({
                path: response.doc.path,
                computeConfig: true,
              });
              if (differentProject) {
                await this.openDocument({
                  path: response.doc.path,
                  documentFormat: response.doc.documentFormat,
                  project: differentProject,
                });
              }
            }
            this.showResultMessage({
              success: true,
              caption: 'SAVE SUCCESS',
              message: `saved as ${response.doc.path || response.doc.id}` +
                (differentProject ? `, reloaded in project "${differentProject.name}"` : ''),
              icon: 'content_save_check',
            }, 'bottom');
            if (!isCopy && response.doc.path)
              this.lastSavedDocumentPath = response.doc.path;
            if (!isCopy && response.doc.path)
              this.lastSavedDocumentProjectPath = response.doc.project?.path;
            if (!isCopy && response.doc.path)
              this.lastSavedDocumentVersion++;
            this.documentMenuRefreshKey++;
          }
          if (response.doc && (response.doc.path || response.doc.id)) {
            return response;
          }
        }
        return Promise.reject('no backend found');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : JSON.stringify(err);
        const errmsg = this.showResultMessage({
          success: false,
          caption: 'SAVE ERROR',
          message,
          icon: 'content_save_alert',
        }, 'bottom');
        console.log(message);
        return Promise.reject(errmsg);
      }
    },
    async exportDoc(
      converter: OutputConverter,
      storedDoc?: Partial<CxDocument>,
      preserveEditor = false,
    ): Promise<SaveResponse> {
      const jsonDoc = storedDoc?.content || this.getDocAsJsonString();
      try {
        const backend = this.backend;
        if (backend) {
          const sdoc: Partial<CxDocument> = storedDoc || {};
          const documentFormat = outputConverterToDocumentFormat(
            toRaw(converter) as OutputConverter,
          );
          const docState = this.docState();
          if (docState) {
            const {
              configuration,
              documentName,
              workingFolder,
              project,
              resourcePath,
            } = docState;
            this.setOperationInProgress(true);
            const response = await backend.save({
              editorKey: this.editorKey(),
              id: sdoc.id || docState?.documentName,
              path:
                sdoc.path ||
                (workingFolder && documentName
                  ? `${workingFolder}/${documentName}`
                  : undefined),
              content: jsonDoc,
              project,
              documentFormat,
              configurationName: sdoc.configurationName || configuration?.name,
              resourcePath,
            });
            setTimeout(() => {
              this.setOperationInProgress(false);
            }, 3000);
            // console.log(response.doc)
            if (!preserveEditor) await this.setWindowTitleFromDoc(response.doc);
            if (response.error) {
              const errmsg = `ERROR, ${response.message}: ${response.error}`;
              console.log(errmsg);
              return Promise.reject(errmsg);
            } else if (!preserveEditor) {
              // this.currentState.setLastExportResponse(response)
              this.updateEditorDocState({
                unsavedChangesAsCopy: false,
              });
              console.log(
                `saved changes: ${this.savedChanges}, exported changes: ${this.savedChangesAsCopy}`,
              );
            }
            // if (response.doc?.exportedAsPath) {
            //   console.log(`EXPORTED IN: ${response.doc.exportedAsPath}`);
            //   return response;
            // }
            return response;
          }
          return Promise.reject('no document state');
        }
        return Promise.reject('no backend found');
      } catch (error) {
        console.log(error);
        console.log(JSON.stringify(error));
        return Promise.reject(error);
      }
    },
    async renderOutput(converter: OutputConverter, path?: string) {
      const docState = this.docState();
      const currentPath =
        docState?.workingFolder && docState.documentName
          ? `${docState.workingFolder}/${docState.documentName}`
          : undefined;
      const renderingPath = path || currentPath;
      const renderingTarget = {
        converterName: converter.name,
        path: renderingPath,
        feedback: [] as string[],
      };
      if (
        this.renderingTargets.some(
          (target) =>
            target.converterName === renderingTarget.converterName &&
            target.path === renderingTarget.path,
        )
      )
        return;
      this.renderingTargets.push(renderingTarget);
      let source: Partial<CxDocument> | undefined;
      try {
        if (renderingPath && renderingPath !== currentPath) {
          source = await this.backend?.open({
            path: renderingPath,
            project: docState?.project,
          });
        }
        await this.exportDoc(converter, source, true);
      } finally {
        this.renderingTargets = this.renderingTargets.filter(
          (target) =>
            target.converterName !== renderingTarget.converterName ||
            target.path !== renderingTarget.path,
        );
      }
    },
    renderingStarted(converterName: string, path: string) {
      if (this.renderingTargets.some(
        (target) => target.converterName === converterName && target.path === path,
      ))
        return
      this.renderingTargets.push({
        converterName,
        path,
        feedback: [],
      })
    },
    renderingFinished(converterName: string, path: string) {
      this.renderingTargets = this.renderingTargets.filter(
        (target) =>
          target.converterName !== converterName || target.path !== path,
      )
    },
    async stopRendering(converterName: string, path?: string) {
      if (!path) return;
      await this.backend?.stopRendering(converterName, path);
    },
    async importDoc(converter: InputConverter) {
      const docState = this.docState();
      const documentFormat: DocumentFormat = {
        ftype: 'input-converter',
        ...(toRaw(converter) as InputConverter),
      };
      const doc = await this.backend?.open({
        editorKey: docState?.editorKey,
        configurationName: docState?.configuration?.name,
        project: docState?.project,
        documentFormat,
      });
      if (doc) this.loadDocument(doc);
    },
    setOperationInProgress(remoteWorkInProgress: boolean) {
      useActions().setRemoteWorkInProgress(remoteWorkInProgress);
    },
    async transformDocument(transform: PandocFilterTransform) {
      const { sources, withResult } = transform;
      const whatToDo: WhatToDoWithResult =
        withResult || (sources ? 'append' : 'replace');
      console.log(sources);
      const json = sources ? undefined : this.getDocAsJsonString();
      console.log(json);
      const docState = this.docState();
      this.transformationEditorKey = docState?.editorKey;
      this.transformationLog = [this.$t('transformationDialog.started')];
      this.transformationFailed = false;
      try {
        this.setOperationInProgress(true);
        const transformed = await this.backend?.transformPandocJson(
          {
            content: json,
            editorKey: docState?.editorKey,
            project: docState?.project,
            configurationName: docState?.configuration?.name,
          },
          { ...transform } as PandocFilterTransform,
        );
        this.setOperationInProgress(false);
        if (transformed) {
          if (
            whatToDo === 'replace' &&
            transformed.replace(/[\r\n]+$/, '') !== json
          ) {
            this.setContent(transformed, false);
          } else {
            // if (whatToDo === 'append' || whatToDo === 'prepend') {
            const doc = JSON.parse(json || this.getDocAsJsonString());
            const transformedBlocks = JSON.parse(transformed);
            doc.blocks =
              whatToDo === 'append'
                ? doc.blocks.concat(transformedBlocks.blocks || [])
                : (transformedBlocks.blocks || []).concat(doc.blocks);
            this.setContent(JSON.stringify(doc), false);
          }
        }
      } catch (err) {
        console.log(err);
        this.transformationFailed = true;
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.transformationLog.push(
          this.$t('transformationDialog.failed', { error: errorMessage }),
        );
        this.$q.notify({
          type: 'negative',
          message: errorMessage,
          caption: this.$t('transformationDialog.failedState'),
        });
      } finally {
        this.setOperationInProgress(false);
        this.transformationLog.push(this.$t('transformationDialog.completed'));
        this.transformationEditorKey = undefined;
      }
    },
    removeCssStylesheets(oldCsss: string[]) {
      oldCsss?.forEach((cssfn) => {
        const id = cssfilename2id(cssfn);
        const style = document.querySelector(`style#${id}`);
        if (style) {
          style.parentNode?.removeChild(style);
        } else {
          console.log(`can't remove <style> element with id="${id}"`);
        }
      });
    },
    addCssStylesheets(newCsss: string[]) {
      newCsss?.forEach(async (cssfilename) => {
        const docState = this.docState();
        if (docState) {
          console.log(`loading CSS from "${cssfilename}"`);
          const { configuration, project } = docState;
          try {
            const data = await this.backend?.getFileContents(cssfilename, {
              kind: 'css',
              configurationName: configuration?.name,
              project: JSON.stringify({ ...project }),
            });
            if (data) {
              const style = document.createElement('style');
              style.setAttribute('id', cssfilename2id(cssfilename));
              style.innerHTML = data;
              document.head.appendChild(style);
            }
          } catch (err) {
            console.log(`can't load "${cssfilename}": ${err}`);
          }
        }
      });
    },
    detectDocumentIndices() {
      this.editor?.commands.detectDocumentIndices();
    },
    getDocAsJsonString(): string {
      const state = this.editorState();
      const docState = state ? getDocState(state) : undefined;
      return getDocAsJsonString(state!, {
        // TODO: check state!
        space: this.jsonSpace,
        noteStyles: docState?.configuration?.noteStyles,
      });
    },
    showResultMessage(
      props: ResultMessageActionProps,
      position: 'top' | 'bottom' = 'top',
    ) {
      const { success, message, caption, icon } = props;
      this.$q.notify({
        message,
        caption,
        icon,
        position,
        color: success ? 'positive' : 'negative',
        timeout: success ? 2000 : 5000,
      });
      const resultMessage = `${message}: ${caption}`;
      console.log(resultMessage);
      return resultMessage;
    },
    async setWindowTitle(title: string) {
      if (this.isMainEditor) {
        await setRendererWindowTitle(title, this.backend);
      }
    },
    async setWindowTitleFromDoc(doc: CxDocument): Promise<void> {
      const title = doc.path || doc.id || 'new document';
      await this.setWindowTitle(title);
    },
    async setProject(project: PundokEditorProject) {
      if (project) {
        console.log('PROJECT:');
        console.log(project);
        this.updateEditorDocState({ project });
        await this.setConfiguration(project.computedConfig);
        useProjectCache().setIndices();
        this.updateEditorDocState({ projectStructure: null });
        if (!this.guiProps.isDevelopmentMode) {
          void this.checkGitUpdates(project);
        }
        // this.updateEditorDocState({ configuration: project.computedConfig })
      }
    },
    async checkGitUpdates(project: PundokEditorProject) {
      const backend = this.backend;
      if (!backend) return;
      try {
        const status = await backend.gitProjectStatus(project.path);
        if (!status.managed || !status.remote) return;
        const branches = await backend.gitProjectUpdates(project.path);
        const ahead = branches.filter((branch) => branch.ahead > 0);
        const snapshot = new Map(
          ahead.map((branch) => [branch.name, branch.ahead]),
        );
        const previousSnapshot = gitUpdateSnapshots.get(project.path);
        gitUpdateSnapshots.set(project.path, snapshot);
        const snapshotChanged =
          !previousSnapshot ||
          snapshot.size !== previousSnapshot.size ||
          [...snapshot].some(
            ([name, count]) => previousSnapshot.get(name) !== count,
          );
        if (!snapshotChanged) return;
        if (this.docState()?.project?.path !== project.path) return;
        this.message = {
          type: 'warning',
          source: ahead.length ? 'git-updates' : 'git-no-updates',
          message: ahead.length
            ? this.$t('gitUpdatesNotification.message', {
              branches: ahead
                .map((branch) => `${branch.name} (${branch.ahead})`)
                .join(', '),
            })
            : this.$t('gitChangesDialog.noUpdates', {
              name: status.branch || '',
            }),
        };
      } catch (error) {
        console.error(
          'Unable to check Git updates after loading project',
          error,
        );
      }
    },
    openGitUpdates() {
      this.message = null;
      this.visibleGitUpdates = true;
    },
    async reloadProjectAfterGitMerge() {
      const projectPath = this.docState()?.project?.path;
      if (projectPath) await this.reloadProject({ path: projectPath });
    },
    async loadProjectStructure(project: PundokEditorProject): Promise<void> {
      const backend = this.backend;
      if (!backend) return;

      try {
        const structure = await backend.getInclusionTree(project);
        console.log(`STRUCTURE: ${JSON.stringify(structure)}`);
        if (
          JSON.stringify(this.docState()?.project) === JSON.stringify(project)
        ) {
          this.updateEditorDocState({ projectStructure: structure || null });
          this.documentMenuRefreshKey++;
        }
      } catch (error) {
        console.error('Unable to load project structure', error);
      }
    },
    async reloadProject(options: GetProjectOptions) {
      const project = await this.backend?.getProject({
        ...options,
        computeConfig: true,
      });
      if (project) {
        await this.setProject(project);
        await this.loadProjectStructure(project);
      }
    },
    async setConfiguration(
      name_or_config?: string | PundokEditorConfig,
    ): Promise<PundokEditorConfig> {
      try {
        if (name_or_config) {
          const config_name = isString(name_or_config)
            ? name_or_config
            : name_or_config.name;
          console.log(`setting configuration to ${config_name}`);
          let configuration: PundokEditorConfig;
          if (isString(name_or_config) && this.backend) {
            configuration = await this.backend.configuration(name_or_config);
          } else {
            configuration = name_or_config as PundokEditorConfig;
          }
          if (configuration) {
            const prevConfiguration = this.configuration;
            this.configuration = configuration;
            // The next lines should not be necessary anymore, because autodelimiters
            // and indices changes are detected through DocState updates.
            //
            // if (configuration.autoDelimiters) {
            //   this.editor?.commands.registerAutoDelimiters(configuration.autoDelimiters)
            // }
            // if (configuration.indices) {
            //   const indexingState = getIndexingState(
            //     this.editor?.state as EditorState | undefined,
            //   );
            //   if (indexingState) indexingState.indices = configuration.indices;
            // }
            if (prevConfiguration && prevConfiguration.customCss)
              this.removeCssStylesheets(prevConfiguration.customCss);
            this.updateEditorDocState({ configuration });
            if (configuration.customCss) {
              this.addCssStylesheets(configuration.customCss);
            }
            return configuration;
          }
        }
      } catch (err) {
        return Promise.reject(`can't set the configuration: ${err}`);
      }
      return Promise.reject(`can't set the configuration`);
    },
    // methods for search and replace
    showSearchAndReplaceDialog() {
      this.visibleSearchAndReplaceDialog = true;
    },
    hideSearchAndReplaceDialog() {
      this.visibleSearchAndReplaceDialog = false;
    },
    toggleSearchAndReplaceDialog() {
      this.visibleSearchAndReplaceDialog = !this.visibleSearchAndReplaceDialog;
    },
    // methods for attributes editing
    editNodeOrMarkAttributes(
      nodeOrMark: SelectedNodeOrMark,
      props?: EditAttributesActionProps,
    ) {
      if (nodeOrMark) {
        let { tab, action } = props || {};
        const node = nodeOrMark.node;
        if (!tab && node) {
          switch (node.type.name) {
            case NODE_NAME_INDEX_TERM:
              if ((node.attrs.id || '').length === 0) tab = 'id';
              break;
            default:
          }
        }
        this.startAttributesTab = tab;
        this.onAttributesEditorShow = action;
        this.nodeOrMarkToEdit = nodeOrMark;
      }
    },
    closeAttributesEditor() {
      this.nodeOrMarkToEdit = undefined;
    },
    // methods for direct input of text
    showInputTextDialog(
      label: string,
      startValue?: string,
      callback?: (text: string) => void,
    ) {
      this.inputTextDialogLabel = label;
      this.inputTextDialogStartValue = startValue || '';
      this.inputTextDialogCallback = callback;
      this.visibleInputTextDialog = true;
    },
    closeInputTextDialog(text: string | null | undefined, oldText?: string) {
      const callback = this.inputTextDialogCallback;
      if (callback && text) callback(text, oldText);
      this.visibleInputTextDialog = false;
      this.inputTextDialogLabel = DEFAULT_INPUT_TEXT_DIALOG_LABEL;
      this.inputTextDialogStartValue = DEFAULT_INPUT_TEXT_DIALOG_START_VALUE;
      this.inputTextDialogCallback = undefined;
    },
    closeProjectStructureDialog() {
      this.visibleProjectStructureDialog = false;
    },
    async saveProject(project: PundokEditorProject) {
      const { computedConfig: _computedConfig, ...projectToSave } = project;
      try {
        await this.backend?.storeInConfiguration({
          projectPath: project.path,
          value: JSON.stringify(projectToSave),
          operation: 'update',
        });
        await this.reloadProject({
          path: project.path,
        });
        this.visibleConfigurationEditor = false;
      } catch (error) {
        console.error('Unable to save project configuration', error);
        this.$q.notify({
          type: 'negative',
          message: 'Unable to save project configuration',
        });
      }
    },
    onClose(event: Event) {
      if (this.askToSaveChanges) {
        this.setClosePending();
        event.preventDefault();
      }
    },
    setClosePending() {
      const pending: PendingOperation = {
        type: 'closing',
        cancel: {
          label: 'cancel',
        },
        confirm: {
          label: 'close anyway',
        },
      };
      if (this.savedChangesAsCopy)
        pending.extraValues = [
          {
            ...COMPLAIN_IF_SAVED_ONLY_AS_COPY_TOGGLE,
            default: !!this.complainIfJustExported,
          },
        ];
      this.pending = pending;
    },
    cancelPending(pending: PendingOperation) {
      this.$emit('pending-canceled', pending);
      if (pending.type === 'loading') this.documentLoading = false;
      switch (pending.type) {
        case 'new':
        case 'loading':
        case 'closing':
        default:
          this.pending = undefined;
      }
    },
    confirmPending(pending: PendingOperation) {
      this.$emit('pending-confirmed', pending);
      switch (pending.type) {
        case 'loading':
          if (pending.doc) {
            this.setDocumentAsNativelySaved();
            this.loadDocument(pending.doc as CxDocument, true);
          }
          break;
        case 'closing':
          this.setDocumentAsNativelySaved();
          if (this.isMainEditor) {
            window.close();
          }
          break;
        case 'new':
          this.newDocument(pending.configurationName, pending.content, true);
          break;
      }
      this.pending = undefined;
    },
    pendingValueUpdate(name: string, value: any) {
      console.log(`pending-update-value, ${name}=${value}`);
      if (name === 'complainIfJustExported')
        this.complainIfJustExported = value;
    },
    reloadWithConfiguration(configurationName: string) {
      this.reloadDocumentWithConfiguration(configurationName);
    },
    maximizePdfViewer() {
      this.leftDrawerState = 'normal';
    },
    minimizePdfViewer() {
      this.leftDrawerState = 'mini';
    },
    startSettingLeftDrawerWidth(e: MouseEvent) {
      if (e.button !== 0) return;
      e.preventDefault();
      this.leftDrawerHandleStart = e.clientX;
      this.prevLeftDrawerWidth = this.leftDrawerWidth;
      this.leftDrawerPreviewWidth = this.leftDrawerWidth;
      document.addEventListener('mousemove', this.changeLeftDrawerWidth);
      document.addEventListener('mouseup', this.stopSettingLeftDrawerWidth);
    },
    changeLeftDrawerWidth(e: MouseEvent) {
      if (this.leftDrawerHandleStart !== undefined) {
        const w =
          this.prevLeftDrawerWidth + e.clientX - this.leftDrawerHandleStart;
        if (w >= 16 && w <= 1024) {
          this.leftDrawerPreviewWidth = w;
        }
      }
    },
    stopSettingLeftDrawerWidth() {
      if (this.leftDrawerPreviewWidth !== undefined)
        this.leftDrawerWidth = this.leftDrawerPreviewWidth;
      this.leftDrawerHandleStart = undefined;
      this.leftDrawerPreviewWidth = undefined;
      document.removeEventListener('mousemove', this.changeLeftDrawerWidth);
      document.removeEventListener('mouseup', this.stopSettingLeftDrawerWidth);
    },
  },
} as Component;
</script>

<style lang="scss">
:root {
  --menubar-height: 128;
}

.pdf-viewer {
  position: fixed;
  top: var(--menubar-height);
  left: 0;
}

.editor-loading-container {
  position: relative;
  height: 100%;
}

// .editor-panel {
//   margin-top: var(--menubar-height);
//   overflow-x: hidden;
//   overflow-y: scroll;
// }

.tooltip {
  position: absolute;
  pointer-events: none;
  z-index: 20;
  background: white;
  border: 1px solid silver;
  border-radius: 2px;
  padding: 2px 10px;
  margin-bottom: 7px;
  -webkit-transform: translateX(-50%);
  transform: translateX(-50%);
}

.tooltip:before {
  content: '';
  height: 0;
  width: 0;
  position: absolute;
  left: 50%;
  margin-left: -5px;
  bottom: -6px;
  border: 5px solid transparent;
  border-bottom-width: 0;
  border-top-color: silver;
}

.tooltip:after {
  content: '';
  height: 0;
  width: 0;
  position: absolute;
  left: 50%;
  margin-left: -5px;
  bottom: -4.5px;
  border: 5px solid transparent;
  border-bottom-width: 0;
  border-top-color: white;
}

.drawer-width-preview {
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: 9999;
  width: 2px;
  background: var(--q-primary);
  pointer-events: none;
}
</style>
