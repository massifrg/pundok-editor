<template>
  <q-layout view="LHH LpR LFf" :container="!mainEditor" :style="`height: ${height}`" class="shadow-2 rounded-borders">
    <PundokEditorHeader
      :editor="editor"
      :current-nodes-with-pos="currentNodesWithPos"
      :gui-props="guiProps"
      :saved-changes="savedChanges"
      :saved-changes-as-copy="savedChangesAsCopy"
      :document-loading="documentLoading"
      :document-menu-refresh-key="documentMenuRefreshKey"
      :rendering-targets="renderingTargets"
      :transformation-log="transformationLog"
      :transformation-failed="transformationFailed"
      @new-document="newDocument"
      @open-document="openDocument()"
      @toggle-search-and-replace-dialog="toggleSearchAndReplaceDialog()"
      @edit-node-or-mark-attributes="editNodeOrMarkAttributes"
      @show-configurations-dialog="visibleConfigurationDialog = true"
      @show-configuration-editor="visibleConfigurationEditor = true"
      @manage-git-project="visibleGitChanges = true"
      @check-git-updates="visibleGitUpdates = true"
      @share-git-project="showGitRepository('publish')"
      @connect-git-project="showGitRepository('connect')"
      @clone-git-project="showGitRepository('clone')"
      @reload-with-configuration="reloadWithConfiguration"
      @render-output="renderOutput"
      @stop-rendering="stopRendering"
    />
    <PundokEditorPdfDrawer
      :is-main-editor="isMainEditor"
      :backend="backend"
      :left-drawer-state="leftDrawerState"
      :left-drawer-width="leftDrawerWidth"
      :left-drawer-preview-width="leftDrawerPreviewWidth"
      :last-saved-document-path="lastSavedDocumentPath"
      :last-saved-document-project-path="lastSavedDocumentProjectPath"
      :last-saved-document-version="lastSavedDocumentVersion"
      @maximize="maximizePdfViewer"
      @minimize="minimizePdfViewer"
      @resize-start="startSettingLeftDrawerWidth"
      @rendering-started="renderingStarted"
      @rendering-finished="renderingFinished"
    />
    <PundokEditorStylesDrawer
      :editor="editor"
      :panel-state="rightDrawerState"
      :current-blocks="currentNodesWithPos"
      :dark="$q.dark.isActive"
      @mouseenter="rightDrawerState = 'normal'"
      @mouseleave="rightDrawerState = 'mini'"
    />
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
import { Component, defineAsyncComponent } from 'vue';
import { Editor, EditorContent, NodeWithPos } from '@tiptap/vue-3';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
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

// the next one is not imported from '../schema' to avoid a circular ref
import {
  type FeedbackMessage,
  type InputConverter,
  type OutputConverter,
  type PundokEditorConfig,
  type PundokEditorProject,
  EditorKeyType,
  ProjectComponent,
  DocumentContext,
  IPC_MAIN_EDITOR_KEY,
  COLOR_SAVED_ONLY_AS_COPY,
  PandocFilterTransform,
  NODE_NAME_INDEX_TERM,
  ResultMessageActionProps,
  EditAttributesActionProps,
  ActionNameWithProps,
  GetProjectOptions,
  DocumentSaveActionProps,
  CxDocument,
  splitFolderAndDoc,
  getDefaultWorkingFormat,
  getDefaultCopyFormat,
} from '../common';

import { setWindowTitle as setRendererWindowTitle } from '../backend/windowTitle';
import { useActions, useBackend, useProjectCache } from '../stores';
import ContextMenu from './ContextMenu.vue';
import InputTextDialog from './InputTextDialog.vue';
import NewProjectDialog from './NewProjectDialog.vue';
import NodeOrMarkContextMenu from './NodeOrMarkContextMenu.vue';
import PendingOperationDialog from './PendingOperationDialog.vue';
import ShowMessageDialog from './ShowMessageDialog.vue';
import PundokEditorHeader from './editor/PundokEditorHeader.vue';
import PundokEditorPdfDrawer from './editor/PundokEditorPdfDrawer.vue';
import PundokEditorStylesDrawer from './editor/PundokEditorStylesDrawer.vue';
import {
  EditorAction,
  ACTION_DOCUMENT_SAVE,
  setActionCommand,
  ACTION_DOCUMENT_SAVE_COPY,
} from '../actions';
import { useQuasar } from 'quasar';
import { routeLastAction } from './editor/actionRouter';
import { newEditor, setContent, setPendingBeforeNewDoc, setPendingBeforeLoadDoc, newDocument, reloadDocumentWithConfiguration, openDocument, setDocumentAsNativelySaved, loadDocument } from './editor/documentLifecycle';
import * as documentPersistence from './editor/documentPersistence';
import * as projectManagement from './editor/projectManagement';
import {
  addCssStylesheets as addCssStylesheetsState,
  changeLeftDrawerWidth as changeLeftDrawerWidthState,
  closeAttributesEditor as closeAttributesEditorState,
  closeInputTextDialog as closeInputTextDialogState,
  editNodeOrMarkAttributes as editNodeOrMarkAttributesState,
  hideSearchAndReplaceDialog as hideSearchAndReplaceDialogState,
  maximizePdfViewer as maximizePdfViewerState,
  minimizePdfViewer as minimizePdfViewerState,
  removeCssStylesheets as removeCssStylesheetsState,
  showInputTextDialog as showInputTextDialogState,
  showSearchAndReplaceDialog as showSearchAndReplaceDialogState,
  startSettingLeftDrawerWidth as startSettingLeftDrawerWidthState,
  stopSettingLeftDrawerWidth as stopSettingLeftDrawerWidthState,
  toggleSearchAndReplaceDialog as toggleSearchAndReplaceDialogState,
} from './editor/uiStateHelpers';
import {
  PendingOperation,
  PendingOperationExtraValue,
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
    PundokEditorHeader,
    PundokEditorPdfDrawer,
    PundokEditorStylesDrawer,
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
    beforeSaving() { return documentPersistence.beforeSaving(this); },
    save(props?: DocumentSaveActionProps) { return documentPersistence.save(this, props); },
    exportDoc(converter: OutputConverter, storedDoc?: Partial<CxDocument>, preserveEditor = false) {
      return documentPersistence.exportDoc(this, converter, storedDoc, preserveEditor);
    },
    renderOutput(converter: OutputConverter, path?: string) { return documentPersistence.renderOutput(this, converter, path); },
    renderingStarted(converterName: string, path: string) { return documentPersistence.renderingStarted(this, converterName, path); },
    renderingFinished(converterName: string, path: string) { return documentPersistence.renderingFinished(this, converterName, path); },
    stopRendering(converterName: string, path?: string) { return documentPersistence.stopRendering(this, converterName, path); },
    importDoc(converter: InputConverter) { return documentPersistence.importDoc(this, converter); },
    setOperationInProgress(value: boolean) { useActions().setRemoteWorkInProgress(value); },
    transformDocument(transform: PandocFilterTransform) { return documentPersistence.transformDocument(this, transform); },
    removeCssStylesheets(oldCsss: string[]) {
      return removeCssStylesheetsState(this, oldCsss);
    },
    addCssStylesheets(newCsss: string[]) {
      return addCssStylesheetsState(this, newCsss);
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
    setProject(project: PundokEditorProject) { return projectManagement.setProject(this, project); },
    checkGitUpdates(project: PundokEditorProject) { return projectManagement.checkGitUpdates(this, project); },
    openGitUpdates() { return projectManagement.openGitUpdates(this); },
    reloadProjectAfterGitMerge() { return projectManagement.reloadProjectAfterGitMerge(this); },
    loadProjectStructure(project: PundokEditorProject) { return projectManagement.loadProjectStructure(this, project); },
    reloadProject(options: GetProjectOptions) { return projectManagement.reloadProject(this, options); },
    setConfiguration(nameOrConfig?: string | PundokEditorConfig) {
      return projectManagement.setConfiguration(this, nameOrConfig);
    },
    // methods for search and replace
    showSearchAndReplaceDialog() {
      return showSearchAndReplaceDialogState(this);
    },
    hideSearchAndReplaceDialog() {
      return hideSearchAndReplaceDialogState(this);
    },
    toggleSearchAndReplaceDialog() {
      return toggleSearchAndReplaceDialogState(this);
    },
    // methods for attributes editing
    editNodeOrMarkAttributes(
      nodeOrMark: SelectedNodeOrMark,
      props?: EditAttributesActionProps,
    ) {
      return editNodeOrMarkAttributesState(this, nodeOrMark, props);
    },
    closeAttributesEditor() {
      return closeAttributesEditorState(this);
    },
    // methods for direct input of text
    showInputTextDialog(label: string, startValue?: string, callback?: (text: string) => void) {
      return showInputTextDialogState(this, label, startValue, callback);
    },
    closeInputTextDialog(text: string | null | undefined, oldText?: string) {
      return closeInputTextDialogState(this, text, oldText);
    },
    closeProjectStructureDialog() {
      this.visibleProjectStructureDialog = false;
    },
    saveProject(project: PundokEditorProject) { return projectManagement.saveProject(this, project); },
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
      return maximizePdfViewerState(this);
    },
    minimizePdfViewer() {
      return minimizePdfViewerState(this);
    },
    startSettingLeftDrawerWidth(e: MouseEvent) {
      return startSettingLeftDrawerWidthState(this, e);
    },
    changeLeftDrawerWidth(e: MouseEvent) {
      return changeLeftDrawerWidthState(this, e);
    },
    stopSettingLeftDrawerWidth() {
      return stopSettingLeftDrawerWidthState(this);
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
