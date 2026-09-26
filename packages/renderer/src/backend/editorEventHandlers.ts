import type {
  BackendFeedbackActionProps,
  BackendSetConfigNameActionProps,
  BackendSetContentActionProps,
  BackendSetContentWithProjectActionProps,
  BackendSetProjectActionProps,
  DocumentContext,
  DocumentOpenActionProps,
  IpcMainToRendererChannel,
  PundokEditorConfig,
  PundokEditorProject,
  ServerMessage,
  ServerMessageCommand,
  ServerMessageContent,
  ServerMessageFeedback,
  ServerMessageForViewer,
  ServerMessageSetConfiguration,
  ServerMessageSetProject,
} from '../common';
import {
  ACTION_BACKEND_FEEDBACK,
  ACTION_BACKEND_SET_CONFIG_NAME,
  ACTION_BACKEND_SET_CONTENT,
  ACTION_BACKEND_SET_CONTENT_WITH_PROJECT,
  ACTION_BACKEND_SET_PROJECT,
  ACTION_DOCUMENT_EXPORT,
  ACTION_DOCUMENT_IMPORT,
  ACTION_DOCUMENT_OPEN,
  ACTION_DOCUMENT_SAVE,
  ACTION_DOCUMENT_SAVE_AS,
  ACTION_PROJECT_NEW,
  type BaseEditorAction,
  type EditorAction,
  setActionSetupViewer,
} from '../actions';
import { useActions } from '../stores';
import { computeProjectConfiguration } from '../common';

export type ConfigurationLoader = (
  name?: string,
) => Promise<PundokEditorConfig>;

export async function handleEditorEvent(
  channel: IpcMainToRendererChannel,
  message: ServerMessage,
  loadConfiguration: ConfigurationLoader,
): Promise<void> {
  const actions = useActions();

  switch (channel) {
    case 'set-configuration': {
      const { editorKey, configurationName } =
        message as ServerMessageSetConfiguration;
      actions.setAction({
        ...ACTION_BACKEND_SET_CONFIG_NAME,
        editorKey: editorKey!,
        props: { configurationName } as BackendSetConfigNameActionProps,
      });
      return;
    }
    case 'set-project': {
      const { editorKey, project } = message as ServerMessageSetProject;
      const configuredProject = await computeProjectConfiguration(
        project,
        loadConfiguration,
      );
      actions.setAction({
        ...ACTION_BACKEND_SET_PROJECT,
        editorKey: editorKey!,
        props: { project: configuredProject } as BackendSetProjectActionProps,
      });
      return;
    }
    case 'feedback': {
      const { editorKey, feedback } = message as ServerMessageFeedback;
      actions.setAction({
        ...ACTION_BACKEND_FEEDBACK,
        editorKey: editorKey!,
        props: { feedback } as BackendFeedbackActionProps,
      });
      return;
    }
    case 'content': {
      const { editorKey, content, project } = message as ServerMessageContent;
      const configuredProject: PundokEditorProject | undefined = project
        ? await computeProjectConfiguration(project, loadConfiguration)
        : undefined;
      const action: EditorAction = configuredProject
        ? {
            ...ACTION_BACKEND_SET_CONTENT_WITH_PROJECT,
            editorKey: editorKey!,
            props: {
              project: configuredProject,
              configuration: configuredProject.computedConfig,
              content,
            } as BackendSetContentWithProjectActionProps,
          }
        : {
            ...ACTION_BACKEND_SET_CONTENT,
            editorKey: editorKey!,
            props: { content } as BackendSetContentActionProps,
          };
      actions.setAction(action);
      return;
    }
    case 'document': {
      const { editorKey, command, path, configurationName, atLine } =
        message as ServerMessageCommand;
      let props: Record<string, unknown> = {};
      let baseAction: BaseEditorAction;
      switch (command) {
        case 'open':
          baseAction = ACTION_DOCUMENT_OPEN;
          props = {
            context: { path, configurationName } as DocumentContext,
            atLine,
          } as DocumentOpenActionProps;
          break;
        case 'save':
          baseAction = ACTION_DOCUMENT_SAVE;
          break;
        case 'save-as':
          baseAction = ACTION_DOCUMENT_SAVE_AS;
          break;
        case 'import':
          baseAction = ACTION_DOCUMENT_IMPORT;
          break;
        case 'export':
          baseAction = ACTION_DOCUMENT_EXPORT;
          break;
        case 'new-project':
          baseAction = ACTION_PROJECT_NEW;
          break;
        default:
          return;
      }
      actions.setAction({ ...baseAction, editorKey: editorKey!, props });
      return;
    }
    case 'show-in-viewer': {
      const { editorKey, setup } = message as ServerMessageForViewer;
      setActionSetupViewer(editorKey!, setup);
      return;
    }
    default:
      return;
  }
}
