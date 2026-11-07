import type { Editor } from '@tiptap/vue-3';
import { editorKeyFromState } from '../schema';
import {
  type BackendSetProjectActionProps,
  type BackendSetConfigNameActionProps,
  type BackendSetContentActionProps,
  type SetContentActionProps,
  type BackendSetContentWithProjectActionProps,
  type DocumentOpenActionProps,
  type TransformDocumentActionProps,
  type NewEmptyDocumentActionProps,
  type NewDocumentActionProps,
  type GoToLineActionProps,
  type ResultMessageActionProps,
  type BackendFeedbackActionProps,
  type SetAlternativeActionProps,
  type DocumentSaveActionProps,
  type SetDocumentFormatActionProps,
  type PandocFilterTransform,
  type GetProjectOptions,
} from '../common';
import {
  ACTION_EDIT_ATTRIBUTES,
  ACTION_EDIT_META_MAP_TEXT,
  ACTION_NEW_EMPTY_DOCUMENT,
  ACTION_SHOW_RESULT_MESSAGE,
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
  ACTION_DOCUMENT_INCLUDE,
  ACTION_SET_DOCUMENT_FORMAT,
  ACTION_DOCUMENT_SAVE_COPY,
  type ActionForNodeOrMark,
  type EditorAction,
  type UpdateDocStateActionProps,
  actionSetMetaMapText,
} from '../actions';
import { documentIncludeSpecs } from './helpers';
import { useActions } from '../stores';

export interface ActionRouterHost {
  [key: string]: any;
}
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
}
function softwareLink(software: { name: string; url: string }): string {
  return `<a href="${escapeHtml(software.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(software.name)}</a>`;
}
export function routeLastAction(
  host: ActionRouterHost,
  action: EditorAction,
): void {
  const editor = host.editor as Editor;
  const editorKey = editorKeyFromState(editor.state);
  if (action.editorKey == editorKey) {
    const nodeMarkAction = action as ActionForNodeOrMark;
    const { name: actionName, nodeOrMark: nom, props } = nodeMarkAction;
    console.log(`action: ${actionName}`);
    switch (actionName) {
      case ACTION_UPDATE_DOC_STATE.name:
        {
          const docState = (props as UpdateDocStateActionProps).docState;
          console.log('UPDATING DOC STATE...');
          if (docState) {
            host.savedChanges = !docState.unsavedChanges;
            host.savedChangesAsCopy = !docState.unsavedChangesAsCopy;
          }
        }
        break;
      case ACTION_CLOSE_EDITOR.name:
        host.setClosePending();
        break;
      case ACTION_BACKEND_SET_PROJECT.name:
        {
          const project = {
            ...(props as BackendSetProjectActionProps)?.project,
          };
          const docState = host.docState();
          const currentProject = docState?.project;
          const projectChanged =
            currentProject?.name !== project.name ||
            currentProject?.path !== project.path;
          const inclusionChanged =
            documentIncludeSpecs(host.editor?.state.doc) !==
            documentIncludeSpecs(docState?.savedDoc);
          if (projectChanged) {
            void host
              .setProject(project)
              .then(() => host.loadProjectStructure(project));
          } else if (inclusionChanged) {
            void host.loadProjectStructure(project);
          }
        }
        break;
      case ACTION_GET_PROJECT.name:
        host.reloadProject(props as GetProjectOptions);
        break;
      case ACTION_BACKEND_SET_CONFIG_NAME.name:
        const configurationName = (props as BackendSetConfigNameActionProps)
          ?.configurationName;
        host.setConfiguration(configurationName);
        break;
      case ACTION_SET_CONTENT.name:
        {
          const { content } = props as SetContentActionProps;
          if (content) host.setContent(content);
        }
        break;
      case ACTION_BACKEND_SET_CONTENT.name:
        {
          const { content } = props as BackendSetContentActionProps;
          if (content) host.loadDocument(content);
        }
        break;
      case ACTION_BACKEND_SET_CONTENT_WITH_PROJECT.name:
        if (props) {
          const { content, project, configuration } =
            props as BackendSetContentWithProjectActionProps;
          if (project) host.setProject(project);
          else if (configuration) host.setConfiguration(configuration);
          if (content) host.loadDocument(content);
        }
        break;
      case ACTION_SHOW_PROJECT_STRUCTURE_DIALOG.name:
        const docState = host.docState();
        if (docState?.project) {
          host.visibleProjectStructureDialog = true;
        }
        break;
      case ACTION_PROJECT_NEW.name:
        host.visibleProjectStructureDialog = false;
        host.visibleNewProjectDialog = true;
        break;
      case ACTION_DOCUMENT_OPEN.name:
        {
          const { context, atLine } = props as DocumentOpenActionProps;
          host.openDocument(context, atLine);
        }
        break;
      case ACTION_DOCUMENT_SAVE.name:
        if (host.documentLoading) break;
        if (
          host.visibleProjectStructureDialog &&
          host.projectStructureEditorKey
        )
          setActionCommand(host.projectStructureEditorKey, action, props);
        else host.save(props as DocumentSaveActionProps);
        break;
      case ACTION_DOCUMENT_SAVE_AS.name:
        if (host.documentLoading) break;
        if (
          host.visibleProjectStructureDialog &&
          host.projectStructureEditorKey
        )
          setActionCommand(host.projectStructureEditorKey, action, props);
        else
          host.save({
            ...(props as DocumentSaveActionProps),
            isSaveAs: true,
          });
        break;
      case ACTION_DOCUMENT_SAVE_COPY.name:
        if (host.documentLoading) break;
        if (
          host.visibleProjectStructureDialog &&
          host.projectStructureEditorKey
        )
          setActionCommand(host.projectStructureEditorKey, action, props);
        else
          host.save({
            ...(props as DocumentSaveActionProps),
            isCopy: true,
          });
        break;
      case ACTION_SET_DOCUMENT_FORMAT.name:
        const { whichFormat, documentFormat } =
          props as SetDocumentFormatActionProps;
        const property =
          (whichFormat === 'input' && 'workingFormat') ||
          (whichFormat === 'copy' && 'copyFormat');
        if (property)
          host.updateEditorDocState({
            [whichFormat]: documentFormat || null,
          });
        break;
      case ACTION_DOCUMENT_GO_TO_LINE.name:
        {
          const { atLine } = props as GoToLineActionProps;
          if (atLine) console.log('moving to line ' + atLine);
          host.editor
            ?.chain()
            .gotoDocLine(atLine)
            .focus()
            .scrollIntoView()
            .run();
        }
        break;
      case ACTION_EDIT_ATTRIBUTES.name:
        if (nom) host.editNodeOrMarkAttributes(nom, props);
        break;
      case ACTION_EDIT_META_MAP_TEXT.name:
        if (nom) {
          host.showInputTextDialog(
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
      //     host.importDoc(inputConverter /**, action?.props?.storedDoc */);
      //   } else {
      //     setActionShowImportDialog(host.editorKey()!);
      //   }
      //   break;
      // case ACTION_DOCUMENT_EXPORT.name:
      //   const { outputConverter } = props as ExportDocumentActionProps;
      //   let storedDoc: Partial<CxDocument> | undefined = undefined;
      //   if (outputConverter) {
      //     host.exportDoc(outputConverter, storedDoc);
      //   } else {
      //     setActionShowExportDialog(host.editorKey()!);
      //   }
      //   break;
      case ACTION_SHOW_RESULT_MESSAGE.name:
        if (props) host.showResultMessage(props as ResultMessageActionProps);
        break;
      case ACTION_SHOW_SEARCH_DIALOG.name:
        host.visibleSearchAndReplaceDialog = true;
        break;
      case ACTION_NEW_EMPTY_DOCUMENT.name:
        {
          const { configurationName } = props as NewEmptyDocumentActionProps;
          host.newDocument(configurationName);
        }
        break;
      case ACTION_NEW_DOCUMENT.name:
        const { configurationName: configName, content } =
          props as NewDocumentActionProps;
        host.newDocument(configName, content);
        break;
      case ACTION_DOCUMENT_INCLUDE.name:
        {
          const ctx = (props as DocumentOpenActionProps).context;
          if (ctx) {
            const { path, documentFormat } = ctx;
            if (path) {
              const appendTransform: PandocFilterTransform = {
                type: 'pandoc-filter',
                filters: [],
                name: 'include-document',
                withResult: 'append',
                fromFormat: documentFormat?.name || 'json',
                toFormat: 'json',
                sources: [path],
              };
              setActionCommand(editorKey, ACTION_DOCUMENT_TRANSFORM, {
                transform: appendTransform,
              } as TransformDocumentActionProps);
            }
          }
        }
        break;
      case ACTION_DOCUMENT_TRANSFORM.name:
        const { transform } = props as TransformDocumentActionProps;
        host.transformDocument(transform);
        break;
      case ACTION_BACKEND_FEEDBACK.name:
        const { feedback } = props as BackendFeedbackActionProps;
        const { message, type } = feedback;
        if (host.transformationEditorKey === editorKey && type === 'progress')
          host.transformationLog.push(message);
        for (const renderingTarget of host.renderingTargets)
          renderingTarget.feedback.push(message);
        const isSuccess = type === 'success';
        if (isSuccess) {
          // console.log(`success feedback: ${message.message}`);
          host.$q.notify({
            message,
            caption: 'Success',
            icon: 'check',
            position: 'top',
            color: 'positive',
            timeout: isSuccess ? 2000 : 5000,
          });
        } else {
          if (type !== 'progress') {
            host.message =
              feedback.source === 'missing-software'
                ? {
                    ...feedback,
                    message: [
                      host.$t('startup.missingSoftware.message', {
                        programs:
                          feedback.software?.missing
                            .map(softwareLink)
                            .join(', ') || escapeHtml(feedback.message),
                      }),
                      feedback.software?.available.length
                        ? `<br><br><strong>${host.$t(
                            'startup.missingSoftware.available',
                          )}</strong><ul>${feedback.software.available
                            .map(
                              (software) =>
                                `<li>${softwareLink(software)}: ${escapeHtml(
                                  software.version || '',
                                )}</li>`,
                            )
                            .join('')}</ul>`
                        : '',
                    ].join(''),
                  }
                : feedback;
          }
        }
        // console.log(message);
        break;
      case ACTION_SELECT_PREV.name:
        if (!host.visibleSearchAndReplaceDialog) {
          editor.commands.selectPrev();
        }
        break;
      case ACTION_SELECT_NEXT.name:
        if (!host.visibleSearchAndReplaceDialog) {
          editor.commands.selectNext();
        }
        break;
      case ACTION_SET_ALTERNATIVE.name:
        const { context } = props as SetAlternativeActionProps;
        if (!context) {
          // re-dispatch action with the proper context
          if (host.visibleSearchAndReplaceDialog) {
            setActionCommand(editorKey, action, {
              ...action.props,
              ...{ context: 'indices' },
            } as SetAlternativeActionProps);
          }
        }
        break;
      case ACTION_SETUP_VIEWER.name:
        host.maximizePdfViewer();
        break;
      default:
        executeEditorAction(action, editor);
        break;
    }
  }
}
