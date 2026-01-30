<template>
  <q-layout view="LHH LpR LFf" :container="!mainEditor" :style="`height: ${height}`" class="shadow-2 rounded-borders">
    <q-header>
      <q-toolbar class="text-white q-pa-none">
        <q-toolbar-title>
          <Menubar :editor="editor" :current-nodes-with-pos="currentNodesWithPos" :gui-props="guiProps"
            :saved-changes="savedChanges" :exported-changes="exportedChanges" @new-document="newDocument"
            @open-document="openDocument()" @save-content="saveToStoredPath()"
            @toggle-search-and-replace-dialog="toggleSearchAndReplaceDialog()"
            @edit-node-or-mark-attributes="editNodeOrMarkAttributes"
            @show-configurations-dialog="visibleConfigurationDialog = true"
            @reload-with-configuration="reloadWithConfiguration" />
        </q-toolbar-title>
      </q-toolbar>
    </q-header>
    <q-drawer v-if="isMainEditor" show-if-above behavior="desktop" bordered :v-model="leftDrawerState === 'normal'"
      side="left" :mini="leftDrawerState === 'mini'" @click.capture="maximizePdfViewer" :mini-width="24"
      :width="leftDrawerWidth" :breakpoint="500">
      <PdfViewer :backend="backend" class="pdf-viewer" />
      <div class="q-mini-drawer-only absolute" style="top: 150px; right: 3px">
        <q-btn dense round unelevated color="secondary" icon="chevron_right" @click="maximizePdfViewer" />
      </div>
      <div class="q-mini-drawer-hide absolute" style="top: 150px; right: -17px">
        <q-btn dense round unelevated color="secondary" icon="chevron_left" @click="minimizePdfViewer" />
      </div>
      <div class="q-mini-drawer-hide absolute" style="top: 210px; right: -17px">
        <q-btn dense round unelevated color="secondary" icon="mdi-arrow-left-right"
          @mousedown="startSettingLeftDrawerWidth" @mousemove="changeLeftDrawerWidth"
          @mouseup="stopSettingLeftDrawerWidth" @mouseleave="stopSettingLeftDrawerWidth" />
      </div>
    </q-drawer>
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
        <ExportDialog :editor="editor" :visible="visibleExportDialog" @set-output-converter="setOutputConverter"
          @close-export-dialog="visibleExportDialog = false"></ExportDialog>
        <ImportDialog :editor="editor" :visible="visibleImportDialog" @set-input-converter="setInputConverter"
          @close-import-dialog="visibleImportDialog = false"></ImportDialog>
        <ShowMessageDialog :editor="editor" :visible="!!message" :message="message"
          @close-show-message-dialog="message = null" />
        <InputTextDialog :editor="editor" :visible="visibleInputTextDialog" :label="inputTextDialogLabel"
          :start-value="inputTextDialogStartValue" @close-dialog="closeInputTextDialog" />
        <ProjectStructureDialog :main-editor="editor" :visible="visibleProjectStructureDialog"
          :project="docState()?.project" @close-project-structure-dialog="closeProjectStructureDialog"
          @new-editor="newSubEditor" />
        <NewProjectDialog :visible="visibleNewProjectDialog" @close="visibleNewProjectDialog = false" />
        <ContextMenu :editor="editor" />
        <editor-content :editor="(editor as Editor)" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { Component, defineAsyncComponent, toRaw } from 'vue';
import { Editor, EditorContent, NodeWithPos } from '@tiptap/vue-3';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { applyDevTools } from 'prosemirror-dev-toolkit';
import { isString } from 'lodash-es';
import { mapState } from 'pinia';
import {
  editorKeyFromState,
  type DocState,
  type DocStateUpdate,
  getDocState,
  getIndexingState,
  type SelectedNodeOrMark,
} from '../schema';
// the next one is not imported from '../schema' to avoid a circular ref
import { Pandoc } from '../schema/nodes/Pandoc'
import {
  IPC_VALUE_WINDOW_TITLE,
  type FeedbackMessage,
  type InputConverter,
  type OutputConverter,
  type PundokEditorConfig,
  type PundokEditorProject,
  type SaveResponse,
  EditorKeyType,
  getHardcodedEditorConfig,
  ProjectComponent,
  DocumentContext,
  IPC_MAIN_EDITOR_KEY,
  COLOR_JUST_EXPORTED,
  PandocFilterTransform,
  WhatToDoWithResult,
  NODE_NAME_INDEX_TERM,
  BackendSetProjectActionProps,
  BackendSetConfigNameActionProps,
  BackendSetContentActionProps,
  SetContentActionProps,
  BackendSetContentWithProjectActionProps,
  DocumentOpenActionProps,
  ImportDocumentActionProps,
  ExportDocumentActionProps,
  TransformDocumentActionProps,
  NewEmptyDocumentActionProps,
  NewDocumentActionProps,
  GoToLineActionProps,
  ResultMessageActionProps,
  ShowExportDialogActionProps,
  BackendFeedbackActionProps,
  SetAlternativeActionProps,
  EditAttributesActionProps,
  ActionNameWithProps,
  GetProjectOptions,
  DocumentSaveActionProps,
  CxDocument,
  DocumentFormat,
  DEFAULT_DOCUMENT_FORMAT,
  FindResourceOptions,
  SetDocumentFormatActionProps,
  DEFAULT_COPY_DOCUMENT_FORMAT,
} from '../common';
import { useActions, useBackend, useProjectCache } from '../stores';
import AttributesEditor from './AttributesEditor.vue'
import ConfigurationsDialog from './ConfigurationsDialog.vue'
import ContextMenu from './ContextMenu.vue'
import CustomStylesPanel from './CustomStylesPanel.vue'
import ExportDialog from './ExportDialog.vue'
import ImportDialog from './ImportDialog.vue'
import InputTextDialog from './InputTextDialog.vue'
import Menubar from './Menubar.vue';
import NewProjectDialog from './NewProjectDialog.vue'
import NodeOrMarkContextMenu from './NodeOrMarkContextMenu.vue'
import PendingOperationDialog from './PendingOperationDialog.vue'
import SearchAndReplace from './SearchAndReplace.vue'
import ShowMessageDialog from './ShowMessageDialog.vue'
import {
  ActionForNodeOrMark,
  EditorAction,
  actionSetMetaMapText,
  ACTION_EDIT_ATTRIBUTES,
  ACTION_EDIT_META_MAP_TEXT,
  ACTION_NEW_EMPTY_DOCUMENT,
  ACTION_SHOW_RESULT_MESSAGE,
  ACTION_SHOW_EXPORT_DIALOG,
  ACTION_SHOW_IMPORT_DIALOG,
  ACTION_SHOW_SEARCH_DIALOG,
  executeEditorAction,
  ACTION_NEW_DOCUMENT,
  ACTION_DOCUMENT_SAVE_AS,
  ACTION_DOCUMENT_SAVE,
  ACTION_BACKEND_SET_CONTENT,
  ACTION_BACKEND_SET_PROJECT,
  ACTION_BACKEND_FEEDBACK,
  ACTION_BACKEND_SET_CONFIG_NAME,
  ACTION_BACKEND_SET_CONTENT_WITH_PROJECT,
  ACTION_DOCUMENT_OPEN,
  ACTION_SHOW_PROJECT_STRUCTURE_DIALOG,
  ACTION_CLOSE_EDITOR,
  ACTION_DOCUMENT_TRANSFORM,
  ACTION_SELECT_NEXT,
  ACTION_SELECT_PREV,
  ACTION_SET_ALTERNATIVE,
  ACTION_SET_CONTENT,
  setActionCommand,
  ACTION_DOCUMENT_GO_TO_LINE,
  ACTION_SETUP_VIEWER,
  ACTION_PROJECT_NEW,
  ACTION_GET_PROJECT,
  ACTION_UPDATE_DOC_STATE,
  UpdateDocStateActionProps,
  ACTION_DOCUMENT_INCLUDE,
  ACTION_SET_DOCUMENT_FORMAT,
  ACTION_DOCUMENT_SAVE_COPY,
} from '../actions';
import { useQuasar } from 'quasar';
import { EditorGUIPropsClass } from './EditorGUIProps';
import { PendingOperation, PendingOperationExtraValue } from './helpers/pending';
import { CreateDocumentOptions, getDocAsJsonString } from '../schema';
import { DocumentDialogProps, showOpenDocumentDialog, showSaveCopyDialog, showSaveDocumentDialog } from './helpers/chooseDocumentDialogs';

const EMPTY_DOCUMENT =
  '{"pandoc-api-version":[1,22,2,1],"meta":{},"blocks":[{"t":"Para","c":[]}]}';

const DEFAULT_INPUT_TEXT_DIALOG_LABEL = 'text';
const DEFAULT_INPUT_TEXT_DIALOG_START_VALUE = '';
const DEFAULT_JSON_SPACE = 2; // third argument of JSON.stringify for saved documents.

const COMPLAIN_IF_JUST_EXPORTED_TOGGLE: PendingOperationExtraValue = {
  name: 'complainIfJustExported',
  label:
    'ask when a document has been saved/exported in format different from JSON',
  color: COLOR_JUST_EXPORTED,
  values: [false, true],
  default: true,
};

function cssfilename2id(cssfilename: string) {
  return cssfilename ? cssfilename.replace(/[^_0-9A-Za-z]+/g, '-') : '';
}

export default {
  components: {
    EditorContent,
    Menubar,
    ContextMenu,
    ShowMessageDialog,
    ConfigurationsDialog,
    ExportDialog,
    ImportDialog,
    InputTextDialog,
    SearchAndReplace,
    AttributesEditor,
    CustomStylesPanel,
    NodeOrMarkContextMenu,
    PendingOperationDialog,
    NewProjectDialog,
    "ProjectStructureDialog": defineAsyncComponent(() => import('./ProjectStructureDialog.vue')),
    "PdfViewer": defineAsyncComponent(() => import('./PdfViewer.vue'))
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
      exportedChanges: true,
      // complain if the document, in its current state, has just been exported but not saved in JSON
      complainIfJustExported: true,
      pending: undefined as PendingOperation | undefined,
      configuration: undefined as PundokEditorConfig | undefined,
      message: null as FeedbackMessage | null,
      leftDrawerState: 'mini' as 'normal' | 'mini',
      leftDrawerWidth: 640,
      leftDrawerHandleStart: undefined as number | undefined,
      prevLeftDrawerWidth: 640,
      rightDrawerState: 'mini' as 'normal' | 'mini',
      visibleConfigurationDialog: false,
      visibleImportDialog: false,
      visibleExportDialog: false,
      visibleSearchAndReplaceDialog: false,
      visibleInputTextDialog: false,
      visibleProjectStructureDialog: false,
      projectStructureEditorKey: undefined as EditorKeyType | undefined,
      visibleNewProjectDialog: false,
      inputTextDialogLabel: DEFAULT_INPUT_TEXT_DIALOG_LABEL,
      inputTextDialogStartValue: DEFAULT_INPUT_TEXT_DIALOG_START_VALUE,
      inputTextDialogCallback: undefined as
        | ((text: string, oldText?: string) => void)
        | undefined,
      nodeOrMarkToEdit: undefined as SelectedNodeOrMark | undefined,
      startAttributesTab: undefined as string | undefined,
      onAttributesEditorShow: undefined as ActionNameWithProps | undefined,
      // clickedNodeOrMark: undefined as SelectedNodeOrMark | undefined,
      debugDocTree: undefined as ProjectComponent | undefined,
      $q: useQuasar(),
      jsonSpace: DEFAULT_JSON_SPACE as string | number | undefined,
      splitterModel: 1,
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
      if (this.exportedChanges && !this.complainIfJustExported) return false;
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
    lastAction(action: EditorAction) {
      const editor = this.editor as Editor;
      const editorKey = editorKeyFromState(editor.state);
      if (action.editorKey == editorKey) {
        const nodeMarkAction = action as ActionForNodeOrMark;
        const { name: actionName, nodeOrMark: nom, props } = nodeMarkAction;
        console.log(`action: ${actionName}`);
        switch (actionName) {
          case ACTION_UPDATE_DOC_STATE.name:
            {
              const docState = (props as UpdateDocStateActionProps).docState
              console.log('UPDATING DOC STATE...')
              if (docState) {
                this.savedChanges = !docState.nativeUnsavedChanges;
                this.exportedChanges = !docState.unsavedChanges;
              }
            }
            break;
          case ACTION_CLOSE_EDITOR.name:
            this.setClosePending();
            break;
          case ACTION_BACKEND_SET_PROJECT.name:
            this.setProject({ ...(props as BackendSetProjectActionProps)?.project });
            break;
          case ACTION_GET_PROJECT.name:
            this.reloadProject(props as GetProjectOptions);
            break;
          case ACTION_BACKEND_SET_CONFIG_NAME.name:
            const configurationName = (props as BackendSetConfigNameActionProps)?.configurationName;
            this.setConfiguration(configurationName);
            break;
          case ACTION_SET_CONTENT.name:
            {
              const { content } = props as SetContentActionProps
              if (content) this.setContent(content);
            }
            break;
          case ACTION_BACKEND_SET_CONTENT.name:
            {
              const { content } = props as BackendSetContentActionProps
              if (content) this.loadDocument(content);
            }
            break;
          case ACTION_BACKEND_SET_CONTENT_WITH_PROJECT.name:
            if (props) {
              const { content, project, configuration } = props as BackendSetContentWithProjectActionProps;
              if (project) this.setProject(project);
              else if (configuration) this.setConfiguration(configuration);
              if (content) this.loadDocument(content);
            }
            break;
          case ACTION_SHOW_PROJECT_STRUCTURE_DIALOG.name:
            const docState = this.docState();
            if (docState?.project) {
              this.visibleProjectStructureDialog = true;
            }
            break;
          case ACTION_PROJECT_NEW.name:
            this.visibleProjectStructureDialog = false;
            this.visibleNewProjectDialog = true;
            break
          case ACTION_DOCUMENT_OPEN.name:
            {
              const { context, atLine } = props as DocumentOpenActionProps
              this.openDocument(context, atLine);
            }
            break;
          case ACTION_DOCUMENT_SAVE.name:
            if (this.visibleProjectStructureDialog && this.projectStructureEditorKey)
              setActionCommand(this.projectStructureEditorKey, action, props)
            else
              this.save((props as DocumentSaveActionProps).doc.path);
            break;
          case ACTION_DOCUMENT_SAVE_AS.name:
            if (this.visibleProjectStructureDialog && this.projectStructureEditorKey)
              setActionCommand(this.projectStructureEditorKey, action, props)
            else
              this.save();
            break;
          case ACTION_DOCUMENT_SAVE_COPY.name:
            if (this.visibleProjectStructureDialog && this.projectStructureEditorKey)
              setActionCommand(this.projectStructureEditorKey, action, props)
            else
              this.save((props as DocumentSaveActionProps).doc.path, { isCopy: true });
            break;
          case ACTION_SET_DOCUMENT_FORMAT.name:
            const { whichFormat, documentFormat } = props as SetDocumentFormatActionProps
            const property = (whichFormat === 'input' && 'inputFormat')
              || (whichFormat === 'output' && 'outputFormat')
              || (whichFormat === 'copy' && 'copyFormat')
            if (property)
              this.updateEditorDocState({ [whichFormat]: documentFormat || null })
            break
          case ACTION_DOCUMENT_GO_TO_LINE.name:
            {
              const { atLine } = props as GoToLineActionProps
              if (atLine) console.log("moving to line " + atLine)
              this.editor?.chain()
                .gotoDocLine(atLine)
                .focus()
                .scrollIntoView()
                .run()
            }
            break
          case ACTION_EDIT_ATTRIBUTES.name:
            if (nom) this.editNodeOrMarkAttributes(nom, props);
            break;
          case ACTION_EDIT_META_MAP_TEXT.name:
            if (nom) {
              this.showInputTextDialog(
                'text',
                nom.node?.attrs.text,
                (text: string, oldText?: string) => {
                  if (text !== oldText)
                    useActions().setAction(
                      actionSetMetaMapText(
                        editorKey,
                        nodeMarkAction.nodeOrMark!,
                        text,
                        oldText,
                      ),
                    );
                },
              );
            }
            break;
          // case ACTION_DOCUMENT_IMPORT.name:
          //   const { inputConverter } = props as ImportDocumentActionProps
          //   if (inputConverter) {
          //     this.importDoc(inputConverter /**, action?.props?.storedDoc */);
          //   } else {
          //     setActionShowImportDialog(this.editorKey()!);
          //   }
          //   break;
          // case ACTION_DOCUMENT_EXPORT.name:
          //   const { outputConverter } = props as ExportDocumentActionProps;
          //   let storedDoc: Partial<CxDocument> | undefined = undefined;
          //   if (outputConverter) {
          //     this.exportDoc(outputConverter, storedDoc);
          //   } else {
          //     setActionShowExportDialog(this.editorKey()!);
          //   }
          //   break;
          case ACTION_SHOW_RESULT_MESSAGE.name:
            if (props)
              this.showResultMessage(props as ResultMessageActionProps)
            break
          case ACTION_SHOW_EXPORT_DIALOG.name:
            {
              const { outputConverter } = props as ShowExportDialogActionProps
              // FIXME: not clear: only showing or also exporting?
              if (outputConverter)
                this.setOutputConverter(outputConverter);
              else
                this.visibleExportDialog = true;
            }
            break;
          case ACTION_SHOW_IMPORT_DIALOG.name:
            this.visibleImportDialog = true;
            break;
          case ACTION_SHOW_SEARCH_DIALOG.name:
            this.visibleSearchAndReplaceDialog = true;
            break;
          case ACTION_NEW_EMPTY_DOCUMENT.name:
            {
              const { configurationName } = props as NewEmptyDocumentActionProps
              this.newDocument(configurationName);
            }
            break;
          case ACTION_NEW_DOCUMENT.name:
            const { configurationName: configName, content } = props as NewDocumentActionProps
            this.newDocument(
              configName,
              content,
            );
            break;
          case ACTION_DOCUMENT_INCLUDE.name:
            {
              const ctx = (props as DocumentOpenActionProps).context
              if (ctx) {
                const { path, documentFormat } = ctx
                if (path) {
                  const appendTransform: PandocFilterTransform = {
                    type: 'pandoc-filter',
                    filters: [],
                    name: 'include-document',
                    withResult: 'append',
                    fromFormat: documentFormat?.name || 'json',
                    toFormat: 'json',
                    sources: [path],
                  }
                  setActionCommand(editorKey, ACTION_DOCUMENT_TRANSFORM,
                    { transform: appendTransform } as TransformDocumentActionProps)
                }
              }
            }
            break
          case ACTION_DOCUMENT_TRANSFORM.name:
            const { transform } = props as TransformDocumentActionProps
            console.log(transform);
            this.transformDocument(transform);
            break;
          case ACTION_BACKEND_FEEDBACK.name:
            const { feedback } = props as BackendFeedbackActionProps
            const { message, type } = feedback
            const isSuccess = type === 'success'
            if (isSuccess) {
              // console.log(`success feedback: ${message.message}`);
              this.$q.notify({
                message,
                caption: 'Success',
                icon: 'mdi-check',
                position: 'top',
                color: 'positive',
                timeout: isSuccess ? 2000 : 5000,
              })
            } else {
              if (type !== 'progress') {
                this.message = feedback;
              }
            }
            // console.log(message);
            break;
          case ACTION_SELECT_PREV.name:
            if (!this.visibleSearchAndReplaceDialog) {
              editor.commands.selectPrev();
            }
            break;
          case ACTION_SELECT_NEXT.name:
            if (!this.visibleSearchAndReplaceDialog) {
              editor.commands.selectNext();
            }
            break;
          case ACTION_SET_ALTERNATIVE.name:
            const { context } = props as SetAlternativeActionProps
            if (!context) {
              // re-dispatch action with the proper context
              if (this.visibleSearchAndReplaceDialog) {
                setActionCommand(editorKey, action, {
                  ...action.props,
                  ...{ context: 'indices' },
                } as SetAlternativeActionProps);
              }
            }
            break;
          case ACTION_SETUP_VIEWER.name:
            this.maximizePdfViewer()
            break;
          default:
            executeEditorAction(action, editor);
            break;
        }
      }
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
    }
    window.addEventListener('beforeunload', this.onClose);
  },

  beforeUnmount() {
    if (this.askToSaveChanges) this.setClosePending();
    if (this.editor) this.editor.destroy();
  },

  methods: {
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
    newSubEditor(editorKey: EditorKeyType) {
      this.projectStructureEditorKey = editorKey
    },
    /**
     * Create a new editor component.
     */
    async newEditor() {
      const editor = new Editor({
        extensions: [
          Pandoc.configure({
            // ...this.tiptapOptions,
          }),
        ],
        // content: '',
        onUpdate: () => {
          const editor = this.editor as Editor | undefined;
          if (editor)
            this.$emit('update:modelValue', editor.getHTML());
        },
      });
      if (editor) {
        // @ts-ignore
        this.editor = editor;
        if (!this.configuration)
          await this.setConfiguration(getHardcodedEditorConfig());
        if (process.env.MODE !== 'production') applyDevTools(editor.view);
        this.updateEditorDocState({
          nativeUnsavedChanges: false,
          unsavedChanges: false,
        });
        this.$emit('new-editor', this.editorKey())
      }
    },
    /**
     * Set the content of the editor.
     * @param content The pandoc JSON representing the document.
     * @param isNew `true` when the content is not coming from a saved document.
     */
    setContent(content: string, isNew?: boolean) {
      // console.log(`SET CONTENT: ${content}`)
      const editor = this.editor;
      if (isNew) {
        this.updateEditorDocState({
          lastSaveResponse: null,
          lastExportResponse: null,
        });
      }
      const configuration = this.docState()?.configuration;
      const createOptions: CreateDocumentOptions = {
        emitUpdate: true,
        indices: configuration?.indices,
        noteStyles: configuration?.noteStyles,
      };
      if (editor) {
        // setTimeout(() => {
        editor
          .chain()
          .setPandocContent(content, createOptions)
          .selectAll()
          .fixPandocTables(true)
          .fixAllAutoDelimiters()
          .fixCites()
          .fixIndexRefs()
          .scrollIntoViewAtTop()
          .run();
        // }, 2000)
      }
    },
    /**
     * Set and show a dialog to save the current unsaved contents before creating a new document.
     * @param options 
     */
    setPendingBeforeNewDoc(options: { configurationName?: string, content?: string }) {
      const { configurationName, content } = options
      const pending: PendingOperation = {
        type: 'new',
        cancel: {
          label: 'cancel',
        },
        confirm: {
          label: `create new "${configurationName || '[unknown config]'}" document, ignore changes`,
        },
        configurationName,
        content,
      };
      if (this.exportedChanges)
        pending.extraValues = [
          {
            ...COMPLAIN_IF_JUST_EXPORTED_TOGGLE,
            default: !!this.complainIfJustExported,
          },
        ];
      this.pending = pending;
    },
    /**
     * Set and show a dialog to save the current unsaved contents before loading a document.
     * @param options 
     */
    setPendingBeforeLoadDoc(options: { doc: CxDocument }) {
      const pending: PendingOperation = {
        type: 'loading',
        cancel: {
          label: 'cancel loading',
        },
        confirm: {
          label: 'load without saving changes',
        },
        doc: options.doc,
      };
      if (this.exportedChanges)
        pending.extraValues = [
          {
            ...COMPLAIN_IF_JUST_EXPORTED_TOGGLE,
            default: !!this.complainIfJustExported,
          },
        ];
      this.pending = pending;
    },
    /**
     * Create a new document.
     * @param configurationName The name of the document's configuration.
     * @param content The document's contents.
     * @param ignoreUnsaved If `true` discard the eventual current unsaved contents.
     */
    async newDocument(
      configurationName?: string,
      content?: string,
      ignoreUnsaved?: boolean,
    ) {
      if (!ignoreUnsaved && this.askToSaveChanges) {
        this.setPendingBeforeNewDoc({ configurationName, content })
        return
      }
      const isNew = !content;
      const doc: CxDocument = {
        content: content || EMPTY_DOCUMENT,
        configurationName,
        documentFormat: DEFAULT_DOCUMENT_FORMAT,
        // editorKey: this.editorKey(),
        id: 'unknown',
      };
      try {
        if (configurationName) await this.setConfiguration(configurationName);
        this.loadDocument(doc);
      } catch (err) {
        console.log(err);
        this.editor?.destroy();
        await this.newEditor();
        this.setMainEditorKey();
        this.setContent(content || EMPTY_DOCUMENT, isNew);
        this.setDocumentAsNativelySaved();
      }
    },
    /**
     * Reload the current document with a different configuration.
     * @param config
     */
    async reloadDocumentWithConfiguration(config: string | PundokEditorConfig) {
      const json = this.getDocAsJsonString();
      try {
        await this.setConfiguration(config);
        this.setContent(json, false);
      } catch (err) {
        console.log(err);
      }
    },
    /**
     * Open a document (optionally at a certain line).
     * @param context The context of the document to be opened.
     * @param atLine The line (usually the Para or Plain) where the cursor is moved after loading.
     */
    async openDocument(context?: DocumentContext, atLine?: number) {
      const docState = this.docState();
      const docContext: DocumentContext = context || {};
      const configurationName =
        docContext?.configurationName || docState?.configuration?.name;
      const project = docContext?.project || docState?.project;
      if (!docContext.path) {
        showOpenDocumentDialog({
          editor: this.editor,
          mode: 'open',
          prompt: 'Open document',
          startFolder: docState?.inputFolder,
          startFormat: docState?.inputFormat,
          callback: (context) => {
            const { editorKey, documentFormat } = context
            if (documentFormat) {
              const props: SetDocumentFormatActionProps = {
                whichFormat: 'input',
                documentFormat
              }
              setActionCommand(editorKey!, ACTION_SET_DOCUMENT_FORMAT, props)
            }
            setActionCommand(editorKey!, ACTION_DOCUMENT_OPEN, { context } as DocumentOpenActionProps)
          }
        } as DocumentDialogProps)
      } else {
        const doc = await this.backend?.open({
          ...docContext,
          configurationName,
          project,
          editorKey: docState?.editorKey,
        });
        if (doc) this.loadDocument(doc, false, atLine);
      }
    },
    setDocumentAsNativelySaved() {
      this.updateEditorDocState({
        nativeUnsavedChanges: false,
        unsavedChanges: false,
        savedDoc: this.editor?.view.state.doc
      });
      this.savedChanges = true
      this.exportedChanges = true
    },
    async loadDocument(doc: CxDocument, ignoreUnsaved?: boolean, atLine?: number) {
      if (!ignoreUnsaved && this.askToSaveChanges) {
        this.setPendingBeforeLoadDoc({ doc })
        return
      }
      const saveResponse = doc.path?.endsWith('.json')
        ? { message: `loaded "${doc.path}"`, doc }
        : undefined;

      // ex TODO: remove history
      this.editor?.destroy();
      await this.newEditor();
      const editorKey = this.editorKey();
      doc.editorKey = editorKey
      this.setMainEditorKey();
      console.log(`created new editor for doc:`);
      console.log(doc);

      this.updateEditorDocState({
        documentName: doc.id,
        resourcePath: doc.resourcePath,
        lastSaveResponse: saveResponse,
        lastExportResponse: null,
      });

      // set project or configuration
      if (doc.project) await this.setProject(doc.project);
      else if (doc.configurationName) {
        try {
          await this.setConfiguration(doc.configurationName);
        } catch (err) {
          this.setConfiguration('default');
        }
      }

      this.setWindowTitleFromDoc(doc);
      this.setContent(doc.content, false);
      this.detectDocumentIndices();
      this.setDocumentAsNativelySaved();
      this.$emit('document-loaded', doc, this.editor);
      const action = ACTION_DOCUMENT_GO_TO_LINE
      if (atLine) action.label += ` ${atLine}`
      setActionCommand(editorKey!, action, { atLine } as GoToLineActionProps)
    },
    async saveToStoredPath() {
      this.save(this.docState()?.lastSaveResponse?.doc.path);
    },
    beforeSaving() {
      this.editor?.commands.fixPandocTables();
    },
    async save(path?: string, options?: { isCopy: boolean }) {
      const isCopy = options?.isCopy
      const docState = this.docState()
      if (!path) {
        if (isCopy)
          showSaveCopyDialog({
            editor: this.editor,
            prompt: 'Save a copy',
            startFolder: docState?.copyFolder,
            startFormat: docState?.copyFormat || DEFAULT_COPY_DOCUMENT_FORMAT,
            callback: (context) => {
              const { editorKey, documentFormat } = context
              if (documentFormat) {
                const props: SetDocumentFormatActionProps = {
                  whichFormat: 'copy',
                  documentFormat
                }
                setActionCommand(editorKey!, ACTION_SET_DOCUMENT_FORMAT, props)
              }
              setActionCommand(editorKey!, ACTION_DOCUMENT_SAVE_COPY, { doc: context } as DocumentSaveActionProps)
            }
          } as DocumentDialogProps)
        else
          showSaveDocumentDialog({
            editor: this.editor,
            prompt: 'Save document',
            startFolder: docState?.outputFolder,
            startFormat: docState?.outputFormat || DEFAULT_DOCUMENT_FORMAT,
            callback: (context) => {
              const { editorKey, documentFormat } = context
              if (documentFormat) {
                const props: SetDocumentFormatActionProps = {
                  whichFormat: 'output',
                  documentFormat
                }
                setActionCommand(editorKey!, ACTION_SET_DOCUMENT_FORMAT, props)
              }
              setActionCommand(editorKey!, ACTION_DOCUMENT_SAVE, { doc: context } as DocumentSaveActionProps)
            }
          } as DocumentDialogProps)
        return
      }
      this.beforeSaving();
      const jsonDoc = this.getDocAsJsonString();
      try {
        const docState = this.docState();
        const documentFormat = (isCopy ? docState?.copyFormat : docState?.outputFormat) || DEFAULT_DOCUMENT_FORMAT
        if (this.backend) {
          const response = await this.backend.save({
            editorKey: this.editorKey(),
            id: docState?.documentName,
            path: path,
            content: jsonDoc,
            documentFormat,
            project: docState?.project,
            configurationName: docState?.configuration?.name,
            resourcePath: docState?.resourcePath,
          });
          if (response.error) {
            const errmsg = this.showResultMessage({
              success: false,
              caption: 'SAVE ERROR',
              message: JSON.stringify(response.error),
              icon: 'mdi-content-save-alert'
            });
            // this.currentState.setLastSaveResponse(undefined)
            this.updateEditorDocState({ lastSaveResponse: null });
            return Promise.reject(errmsg);
          } else {
            this.setDocumentAsNativelySaved();
            this.showResultMessage({
              success: true,
              caption: 'SAVE SUCCESS',
              message: `saved as ${response.doc.path || response.doc.id}`,
              icon: 'mdi-content-save-check'
            });
            const prevPath = this.docState()?.lastSaveResponse?.doc.path;
            if (prevPath !== response.doc.path) {
              this.updateEditorDocState({ lastExportResponse: null });
            }
            this.updateEditorDocState({ lastSaveResponse: response });
            this.setWindowTitleFromDoc(response.doc, 'save');
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
          icon: 'mdi-content-save-alert'
        });
        console.log(message);
        return Promise.reject(errmsg);
      }
    },
    async exportDoc(
      converter: OutputConverter,
      storedDoc?: Partial<CxDocument>,
    ): Promise<SaveResponse> {
      const jsonDoc = this.getDocAsJsonString();
      try {
        const backend = this.backend;
        if (backend) {
          const sdoc: Partial<CxDocument> = storedDoc || {};
          // de-proxify converter
          const documentFormat: DocumentFormat = {
            ftype: 'output-converter',
            ...toRaw(converter) as OutputConverter,
          }
          const docState = this.docState();
          if (docState) {
            const { resourcePath, project, configuration } = docState;
            this.setOperationInProgress(true)
            const response = await backend.save(
              {
                editorKey: this.editorKey(),
                id: sdoc.id || docState?.documentName,
                path: sdoc.path || docState?.lastSaveResponse?.doc.path,
                content: jsonDoc,
                project,
                documentFormat,
                configurationName: sdoc.configurationName || configuration?.name,
                resourcePath,
              },
            );
            setTimeout(() => {
              this.setOperationInProgress(false)
            }, 3000)
            // console.log(response.doc)
            this.setWindowTitleFromDoc(response.doc, 'export');
            if (response.error) {
              const errmsg = `ERROR, ${response.message}: ${response.error}`;
              console.log(errmsg);
              return Promise.reject(errmsg);
            } else {
              // this.currentState.setLastExportResponse(response)
              this.updateEditorDocState({
                unsavedChanges: false,
                lastExportResponse: response,
              });
              console.log(
                `lastExportResponse.doc = ${JSON.stringify({ ...this.docState()?.lastExportResponse?.doc })}`,
              );
              console.log(
                `saved changes: ${this.savedChanges}, exported changes: ${this.exportedChanges}`,
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
    async importDoc(converter: InputConverter) {
      const docState = this.docState();
      const documentFormat: DocumentFormat = {
        ftype: 'input-converter',
        ...toRaw(converter) as InputConverter
      }
      const doc = await this.backend?.open({
        editorKey: docState?.editorKey,
        configurationName: docState?.configuration?.name,
        project: docState?.project,
        documentFormat,
      });
      if (doc) this.loadDocument(doc);
    },
    setOutputConverter(converter: OutputConverter) {
      // console.log(converter)
      this.visibleExportDialog = false;
      if (converter) this.exportDoc(converter);
    },
    setInputConverter(converter: InputConverter) {
      // console.log(converter)
      this.visibleImportDialog = false;
      if (converter) this.importDoc(converter);
    },
    setOperationInProgress(remoteWorkInProgress: boolean) {
      useActions().setRemoteWorkInProgress(remoteWorkInProgress)
    },
    async transformDocument(transform: PandocFilterTransform) {
      const { sources, withResult } = transform;
      const whatToDo: WhatToDoWithResult =
        withResult || (sources ? 'append' : 'replace');
      console.log(sources)
      const json = sources ? undefined : this.getDocAsJsonString();
      console.log(json)
      const docState = this.docState();
      try {
        this.setOperationInProgress(true);
        const transformed = await this.backend?.transformPandocJson(
          {
            content: json,
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
      return getDocAsJsonString(state!, { // TODO: check state!
        space: this.jsonSpace,
      });
    },
    showResultMessage(props: ResultMessageActionProps) {
      const { success, message, caption, icon } = props
      this.$q.notify({
        message,
        caption,
        icon,
        position: 'top',
        color: success ? 'positive' : 'negative',
        timeout: success ? 2000 : 5000,
      });
      const resultMessage = `${message}: ${caption}`;
      console.log(resultMessage);
      return resultMessage;
    },
    async setWindowTitle(title: string) {
      if (this.isMainEditor) {
        const backend = this.backend;
        if (backend) {
          backend.setValue(IPC_VALUE_WINDOW_TITLE, title);
        }
      }
    },
    setWindowTitleFromDoc(
      doc: CxDocument,
      kind?: 'new' | 'save' | 'import' | 'export',
    ) {
      let title = doc.path || doc.id || 'document';
      let isImported = kind === 'import';
      let isExported = kind === 'export';
      if (doc.path && !isImported) isImported = !doc.path.endsWith('.json');
      if (kind === 'new') {
        title = 'new document';
      } else if (isImported) {
        title += ' (imported)';
      } else if (isExported) {
        // const suffix = doc.exportedAsPath
        //   ? ` (exported as ${doc.exportedAsPath})`
        //   : ` (exported)`;
        // title += suffix;
      }
      this.setWindowTitle(title);
    },
    async setProject(project: PundokEditorProject) {
      if (project) {
        console.log('PROJECT:');
        console.log(project);
        this.updateEditorDocState({ project });
        await this.setConfiguration(project.computedConfig);
        useProjectCache().setIndices();
        // this.updateEditorDocState({ configuration: project.computedConfig })
      }
    },
    async reloadProject(options: GetProjectOptions) {
      const project = await this.backend?.getProject({ ...options, computeConfig: true })
      if (project)
        this.setProject(project)
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
            if (configuration.autoDelimiters) {
              this.editor?.commands.registerAutoDelimiters(configuration.autoDelimiters)
            }
            if (configuration.indices) {
              const indexingState = getIndexingState(
                this.editor?.state as EditorState | undefined,
              );
              if (indexingState) indexingState.indices = configuration.indices;
            }
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
        let { tab, action } = props || {}
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
      if (this.exportedChanges)
        pending.extraValues = [
          {
            ...COMPLAIN_IF_JUST_EXPORTED_TOGGLE,
            default: !!this.complainIfJustExported,
          },
        ];
      this.pending = pending;
    },
    cancelPending(pending: PendingOperation) {
      this.$emit('pending-canceled', pending);
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
      this.leftDrawerState = 'normal'
    },
    minimizePdfViewer() {
      this.leftDrawerState = 'mini'
    },
    startSettingLeftDrawerWidth(e: MouseEvent) {
      this.leftDrawerHandleStart = e.clientX
      this.prevLeftDrawerWidth = this.leftDrawerWidth
    },
    changeLeftDrawerWidth(e: MouseEvent) {
      if (this.leftDrawerHandleStart) {
        const w = this.prevLeftDrawerWidth + e.clientX - this.leftDrawerHandleStart
        if (w >= 16 && w <= 1024) {
          this.leftDrawerWidth = w
        }
      }
    },
    stopSettingLeftDrawerWidth(e: MouseEvent) {
      this.leftDrawerHandleStart = undefined
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
</style>
