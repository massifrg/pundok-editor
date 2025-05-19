import { FeedbackMessage, PundokEditorProject, ReadDoc, ViewerSetup } from '.';
import { EditorKeyType } from './editorKey';

/**
 * The direction of messages between Main and Renderer in an IPC channel.
 */
export type IpcDirection = 'm2r' | 'r2m' | 'both';

/**
 * The description of an IPC channel of communication between Main and Renderer.
 */
interface IpcChannelDescription {
  /** The direction of messages */
  dir: IpcDirection;
  /** The description of the channel */
  description: string;
}

/** Types of IPC channels in the communication from Main to Renderer. */
export type IpcMainToRendererChannel =
  | 'feedback'
  | 'document'
  | 'new-empty-document'
  | 'content'
  | 'set-configuration'
  | 'set-project'
  | 'ask-value'
  | 'show-in-viewer';

/** Types of IPC channels in the communication from Renderer to Main. */
export type IpcRendererToMainChannel =
  | 'debug-info'
  | 'open-document'
  | 'save-document'
  | 'available-configurations'
  | 'editor-ready'
  | 'load-configuration'
  | 'file-contents'
  | 'new-project'
  | 'get-project'
  | 'get-inclusion-tree'
  | 'ask-for-document'
  | 'transform-json'
  | 'pandoc-input-formats'
  | 'pandoc-output-formats'
  | 'set-value'
  | 'query';
// | 'open-viewer'

export type IpcChannel = IpcMainToRendererChannel | IpcRendererToMainChannel;

/** The available IPC channels. */
export const IPC_CHANNELS: Record<IpcChannel, IpcChannelDescription> = {
  feedback: {
    dir: 'm2r',
    description: 'feedback about pandoc conversions',
  },
  'debug-info': {
    dir: 'r2m',
    description: 'info about program and configuration directories',
  },
  document: {
    dir: 'm2r',
    description:
      'main tells the renderer to ask for an action on the document (open, save, save-as, import, export)',
  },
  'open-document': {
    dir: 'r2m',
    description: 'the renderer asks main to show the open file dialog',
  },
  'save-document': {
    dir: 'r2m',
    description: 'the renderer asks main to show the save file dialog',
  },
  'new-empty-document': {
    dir: 'm2r',
    description: 'main asks the renderer to show a new empty editor',
  },
  content: {
    dir: 'm2r',
    description: 'sets the content of the editor after a file open',
  },
  'available-configurations': {
    dir: 'r2m',
    description:
      'the renderer asks main for for available configurations on the filesystem',
  },
  'set-configuration': {
    dir: 'm2r',
    description: 'main sets the startup configuration for the renderer',
  },
  'editor-ready': {
    dir: 'r2m',
    description:
      'the renderer tells main that the editor is mounted and set up',
  },
  'load-configuration': {
    dir: 'r2m',
    description:
      'the renderer asks main to load a configuration from the filesystem',
  },
  'file-contents': {
    dir: 'r2m',
    description:
      'the renderer asks main to send the contents of a file (i.e. a CSS file)',
  },
  'new-project': {
    dir: 'r2m',
    description: 'same as menu File|New Project in main window',
  },
  'get-project': {
    dir: 'r2m',
    description: 'the renderer asks main to load a project from the storage',
  },
  'get-inclusion-tree': {
    dir: 'r2m',
    description: 'the renderer asks the inclusion tree of a document',
  },
  'ask-for-document': {
    dir: 'r2m',
    description: 'the renderer asks the filename or id of a document',
  },
  'set-project': {
    dir: 'm2r',
    description: 'main sends the project configuration to the renderer',
  },
  'pandoc-input-formats': {
    dir: 'r2m',
    description: 'the renderer asks main to run pandoc --list-input-formats',
  },
  'pandoc-output-formats': {
    dir: 'r2m',
    description: 'the renderer asks main to run pandoc --list-output-formats',
  },
  'transform-json': {
    dir: 'r2m',
    description:
      'the renderer asks main to apply some pandoc filters to a (Pandoc JSON) fragment or a document',
  },
  'set-value': {
    dir: 'r2m',
    description:
      'the renderer sets the value of a parameter in the main process (es. window-title)',
  },
  'ask-value': {
    dir: 'm2r',
    description:
      'main asks the value of a parameter to the renderer (which could show an interactive GUI to obtain it)',
  },
  query: {
    dir: 'r2m',
    description: 'the renderer queries main for e.g. an index term',
  },
  // 'open-viewer': {
  //   dir: 'r2m',
  //   description: 'the renderer tells main to open a result document viewer (tipically PDF)',
  // },
  'show-in-viewer': {
    dir: 'm2r',
    description: 'show some content in the viewer',
  },
};

export const IPC_VALUE_NEW_PROJECT_NAME = 'new-project-name';
export const IPC_VALUE_WINDOW_TITLE = 'window-title';
export const IPC_MAIN_EDITOR_KEY = 'main-editor-key';

/** Types of messages from Main to Renderer. */
export type ServerMessageType =
  | 'command'
  | 'configuration'
  | 'content'
  | 'feedback'
  | 'project'
  | 'viewer';

/** A message from Main to Renderer. */
export interface ServerMessage extends Record<string, any> {
  type: ServerMessageType;
  /** The identifier key of the recipient editor instance */
  editorKey?: EditorKeyType;
}

/** A message from Main to Renderer to configure the editor with a certain configuration. */
export interface ServerMessageSetConfiguration extends ServerMessage {
  type: 'configuration';
  configurationName: string;
}

/** A feedback message from Main to Renderer.*/
export interface ServerMessageFeedback extends ServerMessage {
  type: 'feedback';
  feedback: FeedbackMessage;
}

/** A message from Main to Renderer with the content of a document. */
export interface ServerMessageContent extends ServerMessage {
  type: 'content';
  content: ReadDoc;
  project?: PundokEditorProject;
}

/** A message from Main to Renderer to configure the editor according to a certain project. */
export interface ServerMessageSetProject extends ServerMessage {
  type: 'project';
  project: PundokEditorProject;
}

/** Kind of command to be executed in the Renderer. */
export type CommandToRenderer =
  | 'open'
  | 'save'
  | 'save-as'
  | 'import'
  | 'export';

/** A message from Main to Renderer to issue a command inside the editor. */
export interface ServerMessageCommand extends ServerMessage {
  type: 'command';
  command: CommandToRenderer;
}

/** A message from Main to the document (pre)viewer. */
export interface ServerMessageForViewer extends ServerMessage {
  type: 'viewer';
  setup: ViewerSetup;
}
