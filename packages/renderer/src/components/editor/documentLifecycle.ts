import { markRaw } from 'vue';
import { Editor } from '@tiptap/vue-3';
import { resolve } from 'path-browserify';
import {
  type CxDocument,
  type DocumentContext,
  type PundokEditorConfig,
  type GoToLineActionProps,
  type DocumentOpenActionProps,
  COLOR_SAVED_ONLY_AS_COPY,
  splitFolderAndDoc,
  asInputFormat,
  getDefaultWorkingFormat,
  getDefaultCopyFormat,
  getHardcodedEditorConfig,
} from '../../common';
import { type DocStateUpdate, CreateDocumentOptions } from '../../schema';
import { Pandoc } from '../../schema/nodes/Pandoc';
import {
  ACTION_DOCUMENT_GO_TO_LINE,
  ACTION_DOCUMENT_OPEN,
  setActionCommand,
} from '../../actions';
import {
  type PendingOperation,
  type PendingOperationExtraValue,
  type DocumentDialogProps,
  showOpenDocumentDialog,
} from '../helpers';
import { t } from '../../i18n';

export interface DocumentLifecycleHost {
  [key: string]: any;
}
const EMPTY_DOCUMENT =
  '{"pandoc-api-version":[1,22,2,1],"meta":{},"blocks":[{"t":"Para","c":[]}]}';
export const COMPLAIN_IF_SAVED_ONLY_AS_COPY_TOGGLE: PendingOperationExtraValue =
  {
    name: 'complainIfJustExported',
    label:
      'ask when a document has been saved/exported in format different from JSON',
    color: COLOR_SAVED_ONLY_AS_COPY,
    values: [false, true],
    default: true,
  };

export async function newEditor(host: DocumentLifecycleHost) {
  const editor = new Editor({
    extensions: [
      Pandoc.configure({
        //   // ...host.tiptapOptions,
      }),
    ],
    // content: '',
    onUpdate: () => {
      const editor = host.editor as Editor | undefined;
      if (editor) host.$emit('update:modelValue', editor.getHTML());
    },
  });
  if (editor) {
    const oldDocState = host.docState();
    // The next one is because we can't write: host.editor = editor
    host.$data.editor = markRaw(editor);
    if (process?.env?.NODE_ENV === 'development') {
      const { applyDevTools } = await import('prosemirror-dev-toolkit');
      if (applyDevTools) applyDevTools(editor.view);
    }
    if (!host.configuration)
      await host.setConfiguration(getHardcodedEditorConfig());
    host.updateEditorDocState({
      unsavedChanges: false,
      unsavedChangesAsCopy: false,
      guiProps: host.guiProps,
      workingFolder: oldDocState?.workingFolder,
      imagesFolder: oldDocState?.imagesFolder,
      includeFolder: oldDocState?.includeFolder,
      copyFolder: oldDocState?.copyFolder,
      workingFormat: oldDocState?.workingFormat,
      imagesFormat: oldDocState?.imagesFormat,
      includeFormat: oldDocState?.includeFormat,
      copyFormat: oldDocState?.copyFormat,
    });
    host.$emit('new-editor', host.editorKey(), host.editor);
  }
}
export function setContent(
  host: DocumentLifecycleHost,
  content: string,
  isNew?: boolean,
  addToHistory?: boolean,
) {
  // console.log(`SET CONTENT: ${content}`)
  const editor = host.editor;
  const configuration = host.docState()?.configuration;
  const createOptions: CreateDocumentOptions = {
    emitUpdate: true,
    addToHistory,
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
}
export function setPendingBeforeNewDoc(
  host: DocumentLifecycleHost,
  options: { configurationName?: string; content?: string },
) {
  const { configurationName, content } = options;
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
  if (host.savedChangesAsCopy)
    pending.extraValues = [
      {
        ...COMPLAIN_IF_SAVED_ONLY_AS_COPY_TOGGLE,
        default: !!host.complainIfJustExported,
      },
    ];
  host.pending = pending;
}
export function setPendingBeforeLoadDoc(
  host: DocumentLifecycleHost,
  options: { doc: CxDocument },
) {
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
  if (host.savedChangesAsCopy)
    pending.extraValues = [
      {
        ...COMPLAIN_IF_SAVED_ONLY_AS_COPY_TOGGLE,
        default: !!host.complainIfJustExported,
      },
    ];
  host.pending = pending;
}
export async function newDocument(
  host: DocumentLifecycleHost,
  configurationName?: string,
  content?: string,
  ignoreUnsaved?: boolean,
) {
  if (!ignoreUnsaved && host.askToSaveChanges) {
    host.setPendingBeforeNewDoc({ configurationName, content });
    return;
  }
  const isNew = !content;
  try {
    if (configurationName) await host.setConfiguration(configurationName);
    // @ts-ignore
    const prevDocState: Partial<DocStateUpdate> = host.docState() || {};
    host.editor?.destroy();
    await host.newEditor();
    host.editor?.commands.updateDocState({
      configuration: prevDocState?.configuration,
      documentName: null,
      workingFolder: prevDocState?.workingFolder,
      workingFormat:
        getDefaultWorkingFormat(host.configuration) ||
        prevDocState?.workingFormat,
      copyFormat: getDefaultCopyFormat(host.configuration),
      imagesFolder: prevDocState?.imagesFolder,
      imagesFormat: prevDocState?.imagesFormat,
      // TODO: check which property should be inherited
    });
    host.setMainEditorKey();
    host.setContent(content || EMPTY_DOCUMENT, isNew);
    host.setDocumentAsNativelySaved();
    const activeConfigurationName = host.configuration?.name;
    await host.setWindowTitle(
      activeConfigurationName
        ? host.$t('document.newTitleWithConfig', {
            name: activeConfigurationName,
          })
        : 'new document',
    );
  } catch (err) {
    console.log(err);
  }
}
export async function reloadDocumentWithConfiguration(
  host: DocumentLifecycleHost,
  config: string | PundokEditorConfig,
) {
  const json = host.getDocAsJsonString();
  try {
    await host.setConfiguration(config);
    host.setContent(json, false);
  } catch (err) {
    console.log(err);
  }
}
export async function openDocument(
  host: DocumentLifecycleHost,
  context?: DocumentContext,
  atLine?: number,
) {
  const docState = host.docState();
  const editorKey = host.editorKey();
  if (!context?.path) {
    if (editorKey) {
      const { configuration, workingFolder, workingFormat } = docState || {};
      showOpenDocumentDialog({
        editor: host.editor,
        mode: 'open',
        options: {
          prompt: t('fileDialog.prompt.openDocument'),
          startFolder: workingFolder,
          startFormat: asInputFormat(workingFormat, configuration),
        },
        callback: (context) => {
          if (context.path) {
            setActionCommand(editorKey, ACTION_DOCUMENT_OPEN, {
              context,
            } as DocumentOpenActionProps);
          }
        },
      } as DocumentDialogProps);
    }
  } else {
    const currentDocumentPath =
      docState?.workingFolder && docState.documentName
        ? resolve(docState.workingFolder, docState.documentName)
        : undefined;
    if (
      editorKey &&
      atLine !== undefined &&
      currentDocumentPath &&
      resolve(context.path) === currentDocumentPath
    ) {
      const action = ACTION_DOCUMENT_GO_TO_LINE;
      if (atLine) action.label += ` ${atLine}`;
      setActionCommand(editorKey, action, {
        atLine,
      } as GoToLineActionProps);
      return;
    }
    host.documentLoading = true;
    try {
      const configurationName =
        context?.configurationName ||
        (!docState?.project && docState?.configuration?.name) ||
        undefined;
      const project = context?.project || docState?.project;
      const doc = await host.backend?.open({
        ...context,
        configurationName,
        project,
        editorKey,
      });
      if (doc) {
        await host.loadDocument(doc, false, atLine);
        const { configurationName, documentFormat, path, project } = doc;
        const configuration =
          project?.computedConfig ||
          (configurationName &&
            (await host.setConfiguration(configurationName))) ||
          undefined;
        const update: Partial<DocStateUpdate> = {
          workingFormat: documentFormat,
          copyFormat: getDefaultCopyFormat(configuration),
        };
        if (path) {
          const { folder, document } = splitFolderAndDoc(path);
          update.workingFolder = folder;
          update.documentName = document;
        }
        host.editor?.commands.updateDocState(update);
      }
    } catch (err) {
      console.log(err);
    } finally {
      if (!host.pending || host.pending.type !== 'loading')
        host.documentLoading = false;
    }
  }
}
export function setDocumentAsNativelySaved(host: DocumentLifecycleHost) {
  host.savedChanges = true;
  // host.savedChangesAsCopy = true
  host.updateEditorDocState({
    unsavedChanges: !host.savedChanges,
    // unsavedChangesAsCopy: !host.savedChangesAsCopy,
    savedDoc: host.editor?.view.state.doc,
  });
}
export async function loadDocument(
  host: DocumentLifecycleHost,
  doc: CxDocument,
  ignoreUnsaved?: boolean,
  atLine?: number,
) {
  host.documentLoading = true;
  try {
    if (!ignoreUnsaved && host.askToSaveChanges) {
      host.setPendingBeforeLoadDoc({ doc });
      return Promise.reject('operation pending...');
    }
    // ex TODO: remove history
    host.editor?.destroy();
    await host.newEditor();
    const editorKey = host.editorKey();
    doc.editorKey = editorKey;
    host.setMainEditorKey();
    console.log(`created new editor for doc:`);
    console.log(doc);

    const { folder, document } = splitFolderAndDoc(doc.path!);
    host.updateEditorDocState({
      documentName: document,
      resourcePath: doc.resourcePath,
      workingFolder: folder,
      workingFormat: doc.documentFormat,
    });

    // set project or configuration
    if (doc.project) {
      await host.setProject(doc.project, doc.noCheck);
      void host.loadProjectStructure(doc.project);
    } else {
      host.updateEditorDocState({ projectStructure: null });
    }
    if (!doc.project && doc.configurationName) {
      try {
        await host.setConfiguration(doc.configurationName);
      } catch (err) {
        host.setConfiguration('default');
      }
    }

    await host.setWindowTitleFromDoc(doc);
    host.setContent(doc.content, false, false);
    host.detectDocumentIndices();
    host.setDocumentAsNativelySaved();
    host.documentMenuRefreshKey++;
    host.$emit('document-loaded', doc, host.editor);
    const action = ACTION_DOCUMENT_GO_TO_LINE;
    if (atLine) action.label += ` ${atLine}`;
    setActionCommand(editorKey!, action, { atLine } as GoToLineActionProps);
  } finally {
    if (!host.pending || host.pending.type !== 'loading')
      host.documentLoading = false;
  }
}
