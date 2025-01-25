<template>
  <q-layout view="hHH lpR fFf" :container="!mainEditor" :style="`height: ${height}`" class="shadow-2 rounded-borders">
    <q-header>
      <q-toolbar class="text-white q-pa-none">
        <q-toolbar-title>
          <Menubar :editor="editor" :current-nodes-with-pos="currentNodesWithPos" :gui-props="guiProps"
            :saved-changes="savedChanges" :exported-changes="exportedChanges"
            :operation-in-progress="operationInProgress" @new-document="newDocument" @save-content="saveContent()"
            @toggle-search-and-replace-dialog="toggleSearchAndReplaceDialog()"
            @edit-node-or-mark-attributes="editNodeOrMarkAttributes"
            @show-configurations-dialog="visibleConfigurationDialog = true"
            @reload-with-configuration="reloadWithConfiguration" />
        </q-toolbar-title>
      </q-toolbar>
    </q-header>
    <q-drawer show-if-above behavior="desktop" bordered :v-model="rightDrawerState === 'normal'" side="right"
      :mini="rightDrawerState === 'mini'" @mouseenter="rightDrawerState = 'normal'"
      @mouseleave="rightDrawerState = 'mini'" mini-to-overlay :mini-width="60" :width="240" :breakpoint="500"
      :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'">
      <CustomStylesPanel :editor="editor" :panel-state="rightDrawerState" :current-blocks="currentNodesWithPos" />
    </q-drawer>
    <q-page-container>
      <q-page> <!-- style="padding-top: 112px" -->
        <PendingOperationDialog :model-value="pending && !savedChanges" :pending-operation="pending"
          @pending-canceled="cancelPending" @pending-confirmed="confirmPending" @update-value="pendingValueUpdate" />
        <editor-content :editor="editor as Editor" />
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
          :project="docState()?.project" @close-project-structure-dialog="closeProjectStructureDialog" />
        <ContextMenu :editor="editor" />
        <!-- <q-page-sticky expand position="top">
          <q-toolbar class="text-white q-pa-none">
            <q-toolbar-title>
              <Menubar :editor="editor" :current-nodes-with-pos="currentNodesWithPos" :gui-props="guiProps"
                :saved-changes="savedChanges" :exported-changes="exportedChanges" @new-document="newDocument"
                @save-content="saveContent()" @toggle-search-and-replace-dialog="toggleSearchAndReplaceDialog()"
                @edit-node-or-mark-attributes="editNodeOrMarkAttributes"
                @show-configurations-dialog="visibleConfigurationDialog = true"
                @reload-with-configuration="reloadWithConfiguration" />
            </q-toolbar-title>
          </q-toolbar>
        </q-page-sticky> -->
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { mapState } from 'pinia'
import { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { applyDevTools } from 'prosemirror-dev-toolkit';
import { Editor, EditorContent, NodeWithPos } from '@tiptap/vue-3';
import {
  Pandoc,
  editorKeyFromState,
  type DocState,
  type DocStateUpdate,
  getDocState,
  getIndexingState,
  registerAutodelimiters
} from '../schema';
import type { SelectedNodeOrMark } from '../schema/helpers/selection';
import {
  IPC_VALUE_WINDOW_TITLE,
  type FeedbackMessage,
  type InputConverter,
  type OutputConverter,
  type PundokEditorConfig,
  type PundokEditorProject,
  type SaveResponse,
  StoredDoc,
  ReadDoc,
  EditorKeyType,
  getHardcodedEditorConfig,
  ProjectComponent,
  DocumentContext,
  IPC_MAIN_EDITOR_KEY,
  COLOR_JUST_EXPORTED,
  PandocFilterTransform,
  PANDOC_TYPES_VERSION,
  WhatToDoWithResult
} from '../common';
import {
  useActions,
  useBackend,
  useProjectCache
} from '../stores';
import {
  AttributesEditor,
  ConfigurationsDialog,
  ContextMenu,
  CustomStylesPanel,
  ExportDialog,
  ImportDialog,
  InputTextDialog,
  NodeOrMarkContextMenu,
  PendingOperation,
  PendingOperationDialog,
  ProjectStructureDialog,
  SearchAndReplace,
  ShowMessageDialog
} from '.';
import Menubar from './Menubar.vue'
import {
  ActionForNodeOrMark,
  EditorAction,
  actionSetMetaMapText,
  ACTION_EDIT_ATTRIBUTES,
  ACTION_EDIT_META_MAP_TEXT,
  ACTION_DOCUMENT_EXPORT,
  ACTION_DOCUMENT_IMPORT,
  ACTION_NEW_EMPTY_DOCUMENT,
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
  setActionShowExportDialog,
  setActionShowImportDialog,
  ACTION_DOCUMENT_OPEN,
  ACTION_SHOW_PROJECT_STRUCTURE_DIALOG,
  ACTION_CLOSE_EDITOR,
  ACTION_DOCUMENT_TRANSFORM,
  ActionEditAttributesProps,
  BaseActionForNodeOrMark,
} from '../actions';
import { isString } from 'lodash';
import { nodeToPandocJsonString } from '../schema/helpers/PandocJsonExporter';
import { EditorState } from '@tiptap/pm/state';
import { CreateDocumentOptions } from '../schema/helpers/createDocument';
import { useQuasar } from 'quasar'
import { Component } from 'vue';
import { EditorGUIPropsClass } from './EditorGUIProps'
import { PendingOperationExtraValue } from './helpers/pending';

const EMPTY_DOCUMENT = '{"pandoc-api-version":[1,22,2,1],"meta":{},"blocks":[{"t":"Para","c":[]}]}'

const DEFAULT_INPUT_TEXT_DIALOG_LABEL = 'text'
const DEFAULT_INPUT_TEXT_DIALOG_START_VALUE = ''
const DEFAULT_JSON_SPACE = 2 // third argument of JSON.stringify for saved documents.

const COMPLAIN_IF_JUST_EXPORTED_TOGGLE: PendingOperationExtraValue = {
  name: 'complainIfJustExported',
  label: 'ask when a document has been saved/exported in format different from JSON',
  color: COLOR_JUST_EXPORTED,
  values: [false, true],
  default: true
}

function cssfilename2id(cssfilename: string) {
  return cssfilename ? cssfilename.replace(/[^_0-9A-Za-z]+/g, '-') : ''
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
    ProjectStructureDialog,
    PendingOperationDialog,
  },

  props: {
    modelValue: {
      type: String,
      default: '{}',
    },
    mainEditor: {
      type: Boolean,
      default: false
    },
    height: {
      type: String,
      default: "100%"
    },
    guiProps: {
      type: EditorGUIPropsClass,
      default: {}
    }
  },

  emits: ['update:modelValue', 'new-editor', 'document-loaded', 'pending-canceled', 'pending-confirmed'],

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
      // an operation is in progress
      operationInProgress: false,
      rightDrawerState: 'mini',
      visibleConfigurationDialog: false,
      visibleImportDialog: false,
      visibleExportDialog: false,
      visibleSearchAndReplaceDialog: false,
      visibleInputTextDialog: false,
      visibleProjectStructureDialog: false,
      inputTextDialogLabel: DEFAULT_INPUT_TEXT_DIALOG_LABEL,
      inputTextDialogStartValue: DEFAULT_INPUT_TEXT_DIALOG_START_VALUE,
      inputTextDialogCallback: undefined as ((text: string, oldText?: string) => void) | undefined,
      nodeOrMarkToEdit: undefined as SelectedNodeOrMark | undefined,
      startAttributesTab: undefined as string | undefined,
      onAttributesEditorShow: undefined as BaseActionForNodeOrMark | undefined,
      // clickedNodeOrMark: undefined as SelectedNodeOrMark | undefined,
      debugDocTree: undefined as ProjectComponent | undefined,
      $q: useQuasar(),
      jsonSpace: DEFAULT_JSON_SPACE as string | number | undefined,
    }
  },

  computed: {
    ...mapState(useActions, ['lastAction']),
    ...mapState(useBackend, ['backend']),
    isMainEditor() {
      return !!this.mainEditor
    },
    askToSaveChanges() {
      if (this.savedChanges) return false
      if (this.exportedChanges && !this.complainIfJustExported) return false
      return true
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
      const editor = this.editor as Editor
      const editorKey = editorKeyFromState(editor.state)
      if (action.editorKey == editorKey) {
        const editor = this.editor as Editor
        const nodeMarkAction = action as ActionForNodeOrMark
        const { name: actionName, nodeOrMark: nom, props } = nodeMarkAction
        console.log(`action: ${actionName}`)
        switch (actionName) {
          case ACTION_CLOSE_EDITOR.name:
            this.setClosePending()
            break
          case ACTION_BACKEND_SET_PROJECT.name:
            this.setProject({ ...props?.project })
            break
          case ACTION_BACKEND_SET_CONFIG_NAME.name:
            const configurationName = props?.configurationName
            this.setConfiguration(configurationName)
            break
          case ACTION_BACKEND_SET_CONTENT.name:
            if (props?.content)
              this.loadDocument(props?.content)
            break
          case ACTION_BACKEND_SET_CONTENT_WITH_PROJECT.name:
            if (props) {
              const { content, project, configuration } = props
              if (project)
                this.setProject(project)
              else if (configuration)
                this.setConfiguration(configuration)
              if (content) this.loadDocument(content)
            }
            break
          case ACTION_SHOW_PROJECT_STRUCTURE_DIALOG.name:
            const docState = this.docState()
            if (docState?.project) {
              this.visibleProjectStructureDialog = true
            }
            break
          case ACTION_DOCUMENT_OPEN.name:
            this.openDocument(props?.context)
            break
          case ACTION_DOCUMENT_SAVE.name:
            this.saveToStoredPath();
            break
          case ACTION_DOCUMENT_SAVE_AS.name:
            this.save();
            break
          case ACTION_EDIT_ATTRIBUTES.name:
            if (nom) this.editNodeOrMarkAttributes(nom, props)
            break
          case ACTION_EDIT_META_MAP_TEXT.name:
            if (nom) {
              this.showInputTextDialog('text', nom.node?.attrs.text, (text: string, oldText?: string) => {
                if (text !== oldText)
                  useActions().setAction(actionSetMetaMapText(editorKey, nodeMarkAction.nodeOrMark!, text, oldText))
              })
            }
            break
          case ACTION_DOCUMENT_IMPORT.name:
            const inputConverter: InputConverter | undefined = props?.inputConverter
            if (inputConverter) {
              this.importDoc(inputConverter /**, action?.props?.storedDoc */)
            } else {
              setActionShowImportDialog(this.editorKey()!)
            }
            break
          case ACTION_DOCUMENT_EXPORT.name:
            const outputConverter = props?.outputConverter
            let storedDoc: Partial<StoredDoc> | undefined = undefined
            if (outputConverter) {
              this.exportDoc(outputConverter, storedDoc)
            } else {
              setActionShowExportDialog(this.editorKey()!)
            }
            break
          case ACTION_SHOW_EXPORT_DIALOG.name:
            const converter = props?.outputConverter
            if (converter) {
              this.setOutputConverter(converter)
            } else {
              this.visibleExportDialog = true
            }
            break
          case ACTION_SHOW_IMPORT_DIALOG.name:
            this.visibleImportDialog = true
            break
          case ACTION_SHOW_SEARCH_DIALOG.name:
            this.visibleSearchAndReplaceDialog = true
            break
          case ACTION_NEW_EMPTY_DOCUMENT.name:
            this.newDocument(action?.props?.configurationName)
            break
          case ACTION_NEW_DOCUMENT.name:
            this.newDocument(action?.props?.configurationName, action?.props?.content)
            break
          case ACTION_DOCUMENT_TRANSFORM.name:
            console.log(action?.props?.transform)
            this.transformDocument(action?.props?.transform)
            break
          case ACTION_BACKEND_FEEDBACK.name:
            const message: FeedbackMessage = action.props?.feedback
            if (message?.type === 'success') console.log(`success feedback: ${message.message}`)
            if (message?.type !== 'progress') {
              this.message = message
            } else {
              console.log(message?.message)
            }
            break
          default:
            executeEditorAction(action, editor)
            break
        }
      }
    }
  },

  async mounted() {
    const backend = useBackend().backend
    if (backend) {
      const configuration = await backend.configuration()
      await this.newDocument(configuration.name)
      if (this.editor) {
        const docState = getDocState((this.editor as Editor).state)
        backend.editorReady(docState?.editorKey)
      }
    }
    window.addEventListener('beforeunload', this.onClose)
  },

  beforeUnmount() {
    if (this.askToSaveChanges) this.setClosePending()
    if (this.editor) this.editor.destroy();
  },

  methods: {
    updateEditorDocState(update: Partial<DocStateUpdate>) {
      this.editor?.commands.updateDocState(update)
    },
    editorState(): EditorState | undefined {
      if (this.editor) return this.editor.view.state as EditorState
    },
    docState(): DocState | undefined {
      return getDocState(this.editorState())
    },
    setDocStateCallback() {
      if (this.editor) this.updateEditorDocState({
        callback: (docState: DocState) => {
          this.savedChanges = !docState.nativeUnsavedChanges
          this.exportedChanges = !docState.unsavedChanges
        }
      })
    },
    editorKey(): EditorKeyType | undefined {
      return this.docState()?.editorKey
    },
    async newEditor() {
      const editor = new Editor({
        extensions: [Pandoc.configure({
          // ...this.tiptapOptions,
        })],
        // content: '',
        onUpdate: () => {
          const editor = this.editor as Editor | undefined;
          if (editor) {
            // HTML
            this.$emit('update:modelValue', editor.getHTML());
            // JSON
            // this.$emit('update:modelValue', this.editor.getJSON())
          }
        },
      });
      if (editor) {
        // @ts-ignore
        this.editor = editor
        if (!this.configuration)
          await this.setConfiguration(getHardcodedEditorConfig())
        if (process.env.MODE !== 'production') applyDevTools(editor.view);
        // console.log(this.docState())
        this.setDocStateCallback()
        this.updateEditorDocState({
          nativeUnsavedChanges: false,
          unsavedChanges: false,
        })
      }
    },
    async newDocument(configurationName: string, content?: string, ignoreUnsaved?: boolean) {
      if (!ignoreUnsaved && this.askToSaveChanges) {
        const pending: PendingOperation = {
          type: 'new',
          cancel: {
            label: 'cancel'
          },
          confirm: {
            label: `create new "${configurationName}" document, ignore changes`
          },
          configurationName,
          content
        }
        if (this.exportedChanges) pending.extraValues = [{
          ...COMPLAIN_IF_JUST_EXPORTED_TOGGLE,
          default: !!this.complainIfJustExported
        }]
        this.pending = pending
      } else {
        const isNew = !content
        const doc: ReadDoc = {
          content: content || EMPTY_DOCUMENT,
          configurationName,
          // editorKey: this.editorKey(),
          id: 'unknown',
        }
        try {
          if (configurationName)
            await this.setConfiguration(configurationName)
          this.loadDocument(doc)
        } catch (err) {
          console.log(err)
          this.editor?.destroy()
          this.newEditor()
          this.setMainEditorKey()
          this.setContent(content || EMPTY_DOCUMENT, isNew)
          this.setDocumentAsNativelySaved()
        }
      }
    },
    setMainEditorKey() {
      console.log(this.mainEditor)
      console.log(this.isMainEditor)
      if (this.isMainEditor) {
        console.log(`set ${this.editorKey()} as main editor key`)
        this.backend?.setValue(IPC_MAIN_EDITOR_KEY, this.editorKey())
      }
    },
    setContent(content: string, isNew: boolean) {
      // console.log(`SET CONTENT: ${content}`)
      const editor = this.editor
      if (isNew) {
        this.updateEditorDocState({
          lastSaveResponse: null,
          lastExportResponse: null,
        })
      }
      const configuration = this.docState()?.configuration
      const createOptions: CreateDocumentOptions = {
        emitUpdate: true,
        indices: configuration?.indices,
        noteStyles: configuration?.noteStyles,
      }
      if (editor) {
        // setTimeout(() => {
        editor.chain()
          .setPandocContent(content, createOptions)
          .selectAll()
          .fixPandocTables(true)
          .fixAutoDelimiters()
          .fixCites()
          .scrollIntoViewAtTop()
          .run()
        // }, 2000)
      }
    },
    async reloadDocumentWithConfiguration(config: string | PundokEditorConfig) {
      const json = this.getDocAsJsonString()
      try {
        await this.setConfiguration(config)
        this.setContent(json, false)
      } catch (err) {
        console.log(err)
      }
    },
    async openDocument(context?: DocumentContext) {
      const docState = this.docState()
      const docContext: DocumentContext = context || {}
      const configurationName = docContext?.configurationName || docState?.configuration?.name
      const project = docContext?.project || docState?.project
      const doc = await this.backend?.open({
        ...docContext,
        configurationName,
        project,
        editorKey: docState?.editorKey
      })
      if (doc) this.loadDocument(doc)
    },
    async loadDocument(doc: ReadDoc, ignoreUnsaved?: boolean) {
      if (!ignoreUnsaved && this.askToSaveChanges) {
        const pending: PendingOperation = {
          type: 'loading',
          cancel: {
            label: 'cancel loading'
          },
          confirm: {
            label: 'load without saving changes'
          },
          doc
        }
        if (this.exportedChanges) pending.extraValues = [{
          ...COMPLAIN_IF_JUST_EXPORTED_TOGGLE,
          default: !!this.complainIfJustExported
        }]
        this.pending = pending
      } else {
        const saveResponse = doc.path?.endsWith('.json')
          ? { message: `loaded "${doc.path}"`, doc }
          : undefined

        // ex TODO: remove history
        this.editor?.destroy()
        this.newEditor()
        doc.editorKey = this.editorKey()
        this.setMainEditorKey()
        console.log(`created new editor for doc:`)
        console.log(doc)

        this.updateEditorDocState({
          documentName: doc.id,
          resourcePath: doc.resourcePath,
          lastSaveResponse: saveResponse,
          lastExportResponse: null,
        })

        // set project or configuration
        if (doc.project)
          await this.setProject(doc.project)
        else if (doc.configurationName) {
          try {
            await this.setConfiguration(doc.configurationName)
          } catch (err) {
            this.setConfiguration('default')
          }
        }

        this.setWindowTitleFromDoc(doc)
        this.setContent(doc.content, false)
        this.detectDocumentIndices()
        this.setDocumentAsNativelySaved()
        this.$emit('document-loaded', doc, this.editor)
      }
    },
    setOperationInProgress(operationInProgress: boolean) {
      this.operationInProgress = operationInProgress
    },
    async transformDocument(transform: PandocFilterTransform) {
      const { sources, withResult } = transform
      const whatToDo: WhatToDoWithResult = withResult
        || (sources ? 'append' : 'replace')
      const json = sources ? undefined : this.getDocAsJsonString()
      const docState = this.docState()
      try {
        this.setOperationInProgress(true)
        const transformed = await this.backend?.transformPandocJson(
          json,
          { ...transform },
          {
            project: docState?.project,
            configurationName: docState?.configuration?.name,
          }
        )
        this.setOperationInProgress(false)
        if (transformed) {
          if (whatToDo === 'replace' && transformed.replace(/[\r\n]+$/, '') !== json) {
            this.setContent(transformed, false)
          } else { // if (whatToDo === 'append' || whatToDo === 'prepend') {
            const doc = JSON.parse(json || this.getDocAsJsonString())
            const transformedBlocks = JSON.parse(transformed)
            doc.blocks = whatToDo === 'append'
              ? doc.blocks.concat(transformedBlocks.blocks || [])
              : (transformedBlocks.blocks || []).concat(doc.blocks);
            this.setContent(JSON.stringify(doc), false)
          }
        }
      } catch (err) {
        console.log(err)
      }
    },
    removeCssStylesheets(oldCsss: string[]) {
      oldCsss?.forEach(cssfn => {
        const id = cssfilename2id(cssfn)
        const style = document.querySelector(`style#${id}`)
        if (style) {
          style.parentNode?.removeChild(style)
        } else {
          console.log(`can't remove <style> element with id="${id}"`)
        }
      })
    },
    addCssStylesheets(newCsss: string[]) {
      newCsss?.forEach(async (cssfilename) => {
        const docState = this.docState()
        if (docState) {
          console.log(`loading CSS from "${cssfilename}"`)
          const { configuration, project } = docState
          try {
            const data = await this.backend?.getFileContents(
              cssfilename,
              {
                kind: 'css',
                configurationName: configuration?.name,
                project: JSON.stringify({ ...project })
              }
            )
            if (data) {
              const style = document.createElement('style');
              style.setAttribute('id', cssfilename2id(cssfilename))
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
      this.editor?.commands.detectDocumentIndices()
    },
    getDocAsJsonString(): string {
      const state = this.editorState()
      if (state) {
        const document = state.doc;
        const indices = this.docState()?.configuration?.indices
        return nodeToPandocJsonString(document, {
          indices,
          apiVersion: PANDOC_TYPES_VERSION,
          space: this.jsonSpace,
        });
      }
      return '{}'
    },
    saveContent() {
      this.saveToStoredPath();
    },
    async saveToStoredPath(): Promise<SaveResponse> {
      return this.save(this.docState()?.lastSaveResponse?.doc.path)
    },
    beforeSaving() {
      this.editor?.commands.fixPandocTables()
    },
    async save(path?: string): Promise<SaveResponse> {

      this.beforeSaving()

      const showResultMessage = (success: boolean, message: string, caption: string) => {
        this.$q.notify({
          message,
          caption,
          icon: success ? 'mdi-content-save-check' : 'mdi-content-save-alert',
          position: 'top',
          color: success ? 'positive' : 'negative',
          timeout: success ? 2000 : 5000
        })
        const resultMessage = `${message}: ${caption}`
        console.log(resultMessage);
        return resultMessage
      }

      const jsonDoc = this.getDocAsJsonString()
      try {
        const docState = this.docState()
        if (this.backend) {
          const response = await this.backend.save(
            {
              id: docState?.documentName,
              path: path,
              content: jsonDoc,
              configurationName: docState?.configuration?.name,
              resourcePath: docState?.resourcePath,
            },
            docState?.project,
            this.editorKey()
          );
          if (response.error) {
            const errmsg = showResultMessage(false, 'SAVE ERROR', JSON.stringify(response.error))
            // this.currentState.setLastSaveResponse(undefined)
            this.updateEditorDocState({ lastSaveResponse: null })
            return Promise.reject(errmsg)
          } else {
            this.setDocumentAsNativelySaved()
            showResultMessage(true, 'SAVE SUCCESS', `saved as ${response.doc.path || response.doc.id}`)
            const prevPath = this.docState()?.lastSaveResponse?.doc.path
            if (prevPath !== response.doc.path) {
              this.updateEditorDocState({ lastExportResponse: null })
            }
            this.updateEditorDocState({ lastSaveResponse: response })
            this.setWindowTitleFromDoc(response.doc, 'save')
          }
          if (response.doc && (response.doc.path || response.doc.id)) {
            return response
          }
        }
        return Promise.reject('no backend found')
      } catch (err) {
        const message = err instanceof Error ? err.message : JSON.stringify(err)
        const errmsg = showResultMessage(false, 'SAVE ERROR', message)
        console.log(message);
        return Promise.reject(errmsg)
      }
    },
    async setWindowTitle(title: string) {
      if (this.isMainEditor) {
        const backend = this.backend
        if (backend) {
          backend.setValue(IPC_VALUE_WINDOW_TITLE, title)
        }
      }
    },
    setWindowTitleFromDoc(doc: StoredDoc, kind?: 'new' | 'save' | 'import' | 'export') {
      let title = doc.path || doc.id || 'document'
      let isImported = kind === 'import'
      let isExported = kind === 'export'
      if (doc.path && !isImported)
        isImported = !doc.path.endsWith('.json')
      if (kind === 'new') {
        title = 'new document'
      } else if (isImported) {
        title += ' (imported)'
      } else if (isExported) {
        const suffix = doc.exportedAsPath
          ? ` (exported as ${doc.exportedAsPath})`
          : ` (exported)`
        title += suffix
      }
      this.setWindowTitle(title)
    },
    async setProject(project: PundokEditorProject) {
      if (project) {
        console.log("PROJECT:")
        console.log(project)
        this.updateEditorDocState({ project })
        await this.setConfiguration(project.computedConfig)
        useProjectCache().setIndices()
        // this.updateEditorDocState({ configuration: project.computedConfig })
      }
    },
    async setConfiguration(name_or_config?: string | PundokEditorConfig): Promise<PundokEditorConfig> {
      try {
        if (name_or_config) {
          const config_name = isString(name_or_config) ? name_or_config : name_or_config.name
          console.log(`setting configuration to ${config_name}`)
          let configuration: PundokEditorConfig
          if (isString(name_or_config) && this.backend) {
            configuration = await this.backend.configuration(name_or_config)
          } else {
            configuration = name_or_config as PundokEditorConfig
          }
          if (configuration) {
            const prevConfiguration = this.configuration;
            this.configuration = configuration
            if (configuration.autoDelimiters && this.editor) {
              registerAutodelimiters(this.editor as Editor, configuration.autoDelimiters)
              // console.log(this.editor.storage.autoDelimiters)
            }
            if (configuration.indices) {
              const indexingState = getIndexingState(this.editor?.state as EditorState | undefined)
              if (indexingState) indexingState.indices = configuration.indices
            }
            if (prevConfiguration && prevConfiguration.customCss)
              this.removeCssStylesheets(prevConfiguration.customCss)
            this.updateEditorDocState({ configuration })
            if (configuration.customCss) {
              this.addCssStylesheets(configuration.customCss)
            }
            return configuration
          }
        }
      } catch (err) {
        return Promise.reject(`can't set the configuration: ${err}`)
      }
      return Promise.reject(`can't set the configuration`)
    },
    // methods for conversions
    async exportDoc(converter: OutputConverter, storedDoc?: Partial<StoredDoc>): Promise<SaveResponse> {
      const jsonDoc = this.getDocAsJsonString()
      try {
        const backend = this.backend
        if (backend) {
          const sdoc: Partial<StoredDoc> = storedDoc || {}
          // de-proxify converter
          const outputConverter = JSON.parse(JSON.stringify(converter)) as OutputConverter
          const docState = this.docState()
          if (docState) {
            const { resourcePath, project, configuration } = docState
            const response = await backend.save(
              {
                id: sdoc.id || docState?.documentName,
                path: sdoc.path || docState?.lastSaveResponse?.doc.path,
                exportedAsPath: sdoc.exportedAsPath,
                content: jsonDoc,
                converter: outputConverter,
                configurationName: sdoc.configurationName || configuration?.name,
                resourcePath
              },
              project,
              this.editorKey()
            )
            // console.log(response.doc)
            this.setWindowTitleFromDoc(response.doc, 'export')
            if (response.error) {
              const errmsg = `ERROR, ${response.message}: ${response.error}`
              console.log(errmsg);
              return Promise.reject(errmsg)
            } else {
              // this.currentState.setLastExportResponse(response)
              this.updateEditorDocState({
                unsavedChanges: false,
                lastExportResponse: response
              })
              console.log(`lastExportResponse.doc = ${JSON.stringify({ ...this.docState()?.lastExportResponse?.doc })}`)
              console.log(`saved changes: ${this.savedChanges}, exported changes: ${this.exportedChanges}`)
            }
            if (response.doc && response.doc.exportedAsPath) {
              console.log(`EXPORTED IN: ${response.doc.exportedAsPath}`);
              return response
            }
            return response
          }
          return Promise.reject('no document state')
        }
        return Promise.reject('no backend found')
      } catch (error) {
        console.log(error);
        console.log(JSON.stringify(error));
        return Promise.reject(error)
      }
    },
    async importDoc(converter: InputConverter) {
      const docState = this.docState()
      const doc = await this.backend?.open({
        editorKey: docState?.editorKey,
        configurationName: docState?.configuration?.name,
        project: docState?.project,
        inputConverter: { ...converter },
      })
      if (doc) this.loadDocument(doc)
    },
    setOutputConverter(converter: OutputConverter) {
      // console.log(converter)
      this.visibleExportDialog = false
      if (converter) this.exportDoc(converter)
    },
    setInputConverter(converter: InputConverter) {
      // console.log(converter)
      this.visibleImportDialog = false
      if (converter) this.importDoc(converter)
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
    editNodeOrMarkAttributes(nodeOrMark: SelectedNodeOrMark, props?: ActionEditAttributesProps) {
      if (nodeOrMark) {
        this.startAttributesTab = props?.tab;
        this.onAttributesEditorShow = props?.action;
        this.nodeOrMarkToEdit = nodeOrMark;
      }
    },
    closeAttributesEditor() {
      this.nodeOrMarkToEdit = undefined;
    },
    // methods for direct input of text
    showInputTextDialog(label: string, startValue?: string, callback?: (text: string) => void) {
      this.inputTextDialogLabel = label
      this.inputTextDialogStartValue = startValue || ''
      this.inputTextDialogCallback = callback
      this.visibleInputTextDialog = true
    },
    closeInputTextDialog(text: string | null | undefined, oldText?: string) {
      const callback = this.inputTextDialogCallback
      if (callback && text) callback(text, oldText)
      this.visibleInputTextDialog = false
      this.inputTextDialogLabel = DEFAULT_INPUT_TEXT_DIALOG_LABEL
      this.inputTextDialogStartValue = DEFAULT_INPUT_TEXT_DIALOG_START_VALUE
      this.inputTextDialogCallback = undefined
    },
    // async loadProjectStructure() {
    //   const docState = this.docState()
    //   if (docState?.project) {
    //     const tree = await this.backend?.getInclusionTree(docState.project)
    //     if (tree) {
    //       console.log(tree ? tree : 'NO INCLUSION TREE')
    //       this.visibleProjectStructureDialog = false
    //     }
    //   }
    // },
    closeProjectStructureDialog() {
      this.visibleProjectStructureDialog = false
    },
    setDocumentAsNativelySaved() {
      this.updateEditorDocState({
        nativeUnsavedChanges: false,
        unsavedChanges: false
      })
    },
    onClose(event: Event) {
      if (this.askToSaveChanges) {
        this.setClosePending()
        event.preventDefault()
      }
    },
    setClosePending() {
      const pending: PendingOperation = {
        type: 'closing',
        cancel: {
          label: 'cancel',
        },
        confirm: {
          label: 'close anyway'
        }
      }
      if (this.exportedChanges) pending.extraValues = [{
        ...COMPLAIN_IF_JUST_EXPORTED_TOGGLE,
        default: !!this.complainIfJustExported
      }]
      this.pending = pending
    },
    cancelPending(pending: PendingOperation) {
      this.$emit('pending-canceled', pending)
      switch (pending.type) {
        case 'new':
        case 'loading':
        case 'closing':
        default:
          this.pending = undefined
      }
    },
    confirmPending(pending: PendingOperation) {
      this.$emit('pending-confirmed', pending)
      switch (pending.type) {
        case 'loading':
          if (pending.doc) {
            this.setDocumentAsNativelySaved()
            this.loadDocument(pending.doc as ReadDoc, true)
          }
          break
        case 'closing':
          this.setDocumentAsNativelySaved()
          if (this.isMainEditor) {
            window.close()
          }
          break
        case 'new':
          this.newDocument(pending.configurationName, pending.content, true)
          break
      }
      this.pending = undefined
    },
    pendingValueUpdate(name: string, value: any) {
      console.log(`pending-update-value, ${name}=${value}`)
      if (name === 'complainIfJustExported')
        this.complainIfJustExported = value
    },
    reloadWithConfiguration(configurationName: string) {
      this.reloadDocumentWithConfiguration(configurationName)
    }
  },
} as Component
</script>

<style lang="scss">
:root {
  --menubar-height: 128;
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
  content: "";
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
  content: "";
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
