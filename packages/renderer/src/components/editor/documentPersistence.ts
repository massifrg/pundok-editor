import { toRaw } from 'vue';
import type { OutputConverter, InputConverter, CxDocument, DocumentFormat, PandocFilterTransform, SaveResponse, DocumentSaveActionProps, PundokEditorProject } from '../../common';
import {
  DEFAULT_COPY_DOCUMENT_FORMAT,
  DEFAULT_DOCUMENT_FORMAT,
  asOutputFormat,
  changeFileExtensionToFormat,
  documentNameToId,
  getDefaultCopyFormat,
  getDefaultWorkingFormat,
  outputConverterToDocumentFormat,
  splitFolderAndDoc,
} from '../../common';
import { ACTION_DOCUMENT_SAVE, ACTION_DOCUMENT_SAVE_COPY, setActionCommand } from '../../actions';
import { useActions } from '../../stores';
import { type DocumentDialogProps, showSaveCopyDialog, showSaveDocumentDialog } from '../helpers';

export interface DocumentPersistenceHost {
  [key: string]: any;
}

export function beforeSaving(host: DocumentPersistenceHost): void {
  host.editor?.commands.fixPandocTables();
}

export async function save(
  host: DocumentPersistenceHost,
  props?: DocumentSaveActionProps,
): Promise<SaveResponse | undefined> {
  if (host.documentLoading) return;
  const { dontAskCopyPath, isCopy, isSaveAs, afterSave } = props || {};
  beforeSaving(host);
  const jsonDoc = host.getDocAsJsonString();
  const docState = host.docState();
  const { documentName, copyFolder, workingFolder, configuration, workingFormat } =
    docState || {};
  let path = props?.path;
  if (!path) {
    const folder = isCopy ? copyFolder : workingFolder;
    path = (folder && documentName && `${folder}/${documentName}`) || undefined;
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
      const { documentName, copyFolder, copyFormat, workingFolder } = docState || {};
      const startFilename =
        documentName && copyFormat
          ? changeFileExtensionToFormat(documentName, copyFormat)
          : undefined;
      showSaveCopyDialog({
        editor: host.editor,
        options: {
          prompt: host.$t('fileDialog.prompt.saveCopyTo'),
          startFolder: copyFolder || workingFolder,
          startFormat:
            copyFormat ||
            getDefaultCopyFormat(configuration) ||
            asOutputFormat(workingFormat, configuration) ||
            DEFAULT_COPY_DOCUMENT_FORMAT,
          startFilename,
          warnIfExists: true,
        },
        callback: (context: DocumentSaveActionProps) => {
          if (context.path) {
            setActionCommand(context.editorKey!, ACTION_DOCUMENT_SAVE_COPY, {
              path: context.path,
              documentFormat: context.documentFormat,
              isCopy: true,
              dontAskCopyPath: true,
            } as DocumentSaveActionProps);
          }
        },
      } as DocumentDialogProps);
    } else {
      const { configuration, documentName, workingFolder, workingFormat } = docState || {};
      const format = isSaveAs
        ? workingFormat || getDefaultWorkingFormat(configuration)
        : documentFormat || getDefaultWorkingFormat(configuration) || DEFAULT_DOCUMENT_FORMAT;
      const startFormat = asOutputFormat(format, configuration);
      const startFilename =
        documentName && startFormat
          ? changeFileExtensionToFormat(documentName, startFormat)
          : undefined;
      showSaveDocumentDialog({
        editor: host.editor,
        options: {
          prompt: host.$t(isSaveAs ? 'fileDialog.prompt.save' : 'fileDialog.prompt.saveCurrent'),
          startFolder: workingFolder,
          startFormat,
          startFilename,
          warnIfExists: !!isSaveAs,
        },
        callback: (context: DocumentSaveActionProps) => {
          if (context.path) {
            setActionCommand(context.editorKey!, ACTION_DOCUMENT_SAVE, {
              path: context.path,
              documentFormat: context.documentFormat,
              afterSave,
            } as DocumentSaveActionProps);
          }
        },
      } as DocumentDialogProps);
    }
    return;
  }
  try {
    documentFormat = toRaw(
      documentFormat ||
        (isCopy
          ? docState?.copyFormat || DEFAULT_COPY_DOCUMENT_FORMAT
          : docState?.workingFormat || DEFAULT_DOCUMENT_FORMAT),
    );
    if (!host.backend) return Promise.reject('no backend found');
    const { configuration, documentName, project, resourcePath } = docState || {};
    const response = await host.backend.save(
      {
        editorKey: host.editorKey(),
        id: documentNameToId(documentName),
        path,
        content: jsonDoc,
        documentFormat,
        project,
        configurationName: project ? undefined : configuration?.name,
        resourcePath,
      },
      { isCopy },
    );
    if (response.error) {
      return Promise.reject(
        host.showResultMessage(
          {
            success: false,
            caption: 'SAVE ERROR',
            message: JSON.stringify(response.error),
            icon: 'content_save_alert',
          },
          'bottom',
        ),
      );
    }
    if (response.doc.path) {
      const { folder, document } = splitFolderAndDoc(response.doc.path);
      const update = isCopy
        ? { copyFolder: folder, copyFormat: documentFormat, unsavedChangesAsCopy: false }
        : {
            documentName: document,
            workingFolder: folder,
            workingFormat: documentFormat,
            unsavedChanges: false,
          };
      host.editor?.commands.updateDocState(update);
    }
    if (!isCopy) host.setDocumentAsNativelySaved();
    if (!isCopy && response.doc.path) await host.setWindowTitleFromDoc(response.doc);
    let differentProject: PundokEditorProject | undefined;
    if (
      !isCopy &&
      response.doc.path &&
      ((!isSaveAs && !project) ||
        (isSaveAs && splitFolderAndDoc(response.doc.path).folder !== workingFolder))
    ) {
      differentProject = await host.backend.getProject({
        path: response.doc.path,
        computeConfig: true,
      });
      if (differentProject) {
        await host.openDocument({
          path: response.doc.path,
          documentFormat: response.doc.documentFormat,
          project: differentProject,
        });
      }
    }
    host.showResultMessage(
      {
        success: true,
        caption: 'SAVE SUCCESS',
        message:
          `saved as ${response.doc.path || response.doc.id}` +
          (differentProject ? `, reloaded in project "${differentProject.name}"` : ''),
        icon: 'content_save_check',
      },
      'bottom',
    );
    if (!isCopy && response.doc.path) {
      host.lastSavedDocumentPath = response.doc.path;
      host.lastSavedDocumentProjectPath = response.doc.project?.path;
      host.lastSavedDocumentVersion++;
    }
    host.documentMenuRefreshKey++;
    afterSave?.();
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    const errmsg = host.showResultMessage(
      { success: false, caption: 'SAVE ERROR', message, icon: 'content_save_alert' },
      'bottom',
    );
    console.log(message);
    return Promise.reject(errmsg);
  }
}

export async function exportDoc(
  host: DocumentPersistenceHost,
  converter: OutputConverter,
  storedDoc?: Partial<CxDocument>,
  preserveEditor = false,
): Promise<SaveResponse> {
  const jsonDoc = storedDoc?.content || host.getDocAsJsonString();
  if (!host.backend) return Promise.reject('no backend found');
  const docState = host.docState();
  if (!docState) return Promise.reject('no document state');
  const documentFormat = outputConverterToDocumentFormat(toRaw(converter) as OutputConverter);
  host.setOperationInProgress(true);
  try {
    const response = await host.backend.save({
      editorKey: host.editorKey(),
      id: storedDoc?.id || docState.documentName,
      path:
        storedDoc?.path ||
        (docState.workingFolder && docState.documentName
          ? `${docState.workingFolder}/${docState.documentName}`
          : undefined),
      content: jsonDoc,
      project: docState.project,
      documentFormat,
      configurationName: storedDoc?.configurationName || docState.configuration?.name,
      resourcePath: docState.resourcePath,
    });
    if (!preserveEditor) await host.setWindowTitleFromDoc(response.doc);
    if (response.error) return Promise.reject(`ERROR, ${response.message}: ${response.error}`);
    if (!preserveEditor) host.updateEditorDocState({ unsavedChangesAsCopy: false });
    return response;
  } finally {
    setTimeout(() => host.setOperationInProgress(false), 3000);
  }
}

export async function renderOutput(
  host: DocumentPersistenceHost,
  converter: OutputConverter,
  path?: string,
): Promise<void> {
  const docState = host.docState();
  const currentPath =
    docState?.workingFolder && docState.documentName
      ? `${docState.workingFolder}/${docState.documentName}`
      : undefined;
  const renderingPath = path || currentPath;
  const renderingTarget = { converterName: converter.name, path: renderingPath, feedback: [] as string[] };
  if (host.renderingTargets.some((target: typeof renderingTarget) =>
    target.converterName === renderingTarget.converterName && target.path === renderingTarget.path)) return;
  host.renderingTargets.push(renderingTarget);
  try {
    let source: Partial<CxDocument> | undefined;
    if (renderingPath && renderingPath !== currentPath) {
      source = await host.backend?.open({ path: renderingPath, project: docState?.project });
    }
    await exportDoc(host, converter, source, true);
  } finally {
    host.renderingTargets = host.renderingTargets.filter(
      (target: typeof renderingTarget) =>
        target.converterName !== renderingTarget.converterName || target.path !== renderingTarget.path,
    );
  }
}

export function renderingStarted(host: DocumentPersistenceHost, converterName: string, path: string): void {
  if (host.renderingTargets.some((target: any) => target.converterName === converterName && target.path === path)) return;
  host.renderingTargets.push({ converterName, path, feedback: [] });
}

export function renderingFinished(host: DocumentPersistenceHost, converterName: string, path: string): void {
  host.renderingTargets = host.renderingTargets.filter(
    (target: any) => target.converterName !== converterName || target.path !== path,
  );
}

export async function stopRendering(host: DocumentPersistenceHost, converterName: string, path?: string): Promise<void> {
  if (path) await host.backend?.stopRendering(converterName, path);
}

export async function importDoc(host: DocumentPersistenceHost, converter: InputConverter): Promise<void> {
  const docState = host.docState();
  const documentFormat: DocumentFormat = { ftype: 'input-converter', ...toRaw(converter) };
  const doc = await host.backend?.open({
    editorKey: docState?.editorKey,
    configurationName: docState?.configuration?.name,
    project: docState?.project,
    documentFormat,
  });
  if (doc) host.loadDocument(doc);
}

export function setOperationInProgress(host: DocumentPersistenceHost, value: boolean): void {
  useActions().setRemoteWorkInProgress(value);
}

export async function transformDocument(
  host: DocumentPersistenceHost,
  transform: PandocFilterTransform,
): Promise<void> {
  const { sources, withResult } = transform;
  const whatToDo = withResult || (sources ? 'append' : 'replace');
  const json = sources ? undefined : host.getDocAsJsonString();
  const docState = host.docState();
  host.transformationEditorKey = docState?.editorKey;
  host.transformationLog = [host.$t('transformationDialog.started')];
  host.transformationFailed = false;
  try {
    setOperationInProgress(host, true);
    const transformed = await host.backend?.transformPandocJson(
      {
        content: json,
        editorKey: docState?.editorKey,
        project: docState?.project,
        configurationName: docState?.configuration?.name,
      },
      { ...transform },
    );
    if (transformed) {
      if (whatToDo === 'replace' && transformed.replace(/[\r\n]+$/, '') !== json) {
        host.setContent(transformed, false);
      } else {
        const doc = JSON.parse(json || host.getDocAsJsonString());
        const transformedBlocks = JSON.parse(transformed);
        doc.blocks =
          whatToDo === 'append'
            ? doc.blocks.concat(transformedBlocks.blocks || [])
            : (transformedBlocks.blocks || []).concat(doc.blocks);
        host.setContent(JSON.stringify(doc), false);
      }
    }
  } catch (err) {
    host.transformationFailed = true;
    const errorMessage = err instanceof Error ? err.message : String(err);
    host.transformationLog.push(host.$t('transformationDialog.failed', { error: errorMessage }));
    host.$q.notify({
      type: 'negative',
      message: errorMessage,
      caption: host.$t('transformationDialog.failedState'),
    });
  } finally {
    setOperationInProgress(host, false);
    host.transformationLog.push(host.$t('transformationDialog.completed'));
    host.transformationEditorKey = undefined;
  }
}
